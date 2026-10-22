#!/usr/bin/env bash
# deploy-safe.sh: rollback tag, verify, auto-rollback and deploy record for compose deploys on the VPS.
#
# Vendored byte-identical into each deploy repo (moosematrix, moose-brain, moose_money, mooseman-site).
# The workflow streams it over the existing SSH session ahead of the deploy commands
# (`{ cat scripts/deploy-safe.sh; cat <<'EOF' ... EOF; } | ssh ... bash -s`), so nothing is installed
# on the host and the code that runs is the code reviewed in the PR.
#
# v2 (R39, after Vulnerability Bot review): stdin-safe main() wrapper, host-wide flock, pin-line-only
# rollback, EXIT trap that never blocks cleanup, label validation, manual recovery hint.
#
# Usage. The remote body MUST be wrapped in a function and run with stdin from /dev/null, so bash parses
# the whole stream before anything runs and no child (docker compose run/exec) can eat the rest of it:
#   main() {
#     ds_lock                       # host-wide deploy lock (flock, waits up to DS_LOCK_WAIT s)
#     export DS_APP=moosematrix DS_CONTAINER=moosematrix-app-prod DS_SERVICE=moosematrix-app-prod \
#            DS_SHA=<40-hex GITHUB_SHA> DS_RUN_ID=<github.run_id>
#     trap 'ds_on_exit || true; <cleanup>' EXIT   # records result=failed if the script dies first
#     ds_pre                        # tag the running image <app>:rollback-YYYYMMDD-<shortsha>, keep newest 3
#     ...pull / pin (ds_pin_set FROM TO for compose-pinned repos) / compose up (repo specific)...
#     ds_finish [health cmd...]     # wait healthy + revision label == DS_SHA; else roll back; write the record
#     ds_prune                      # docker image prune -f (dangling only)
#   }
#   main </dev/null; exit $?
#
# Optional env: DS_COMPOSE_FILE (docker-compose.yml), DS_HEALTH_TIMEOUT (seconds, 90), DS_KEEP (3),
#   DS_RECORD_DIR (/var/lib/moose-deploys), DS_REVISION_LABEL (org.opencontainers.image.revision),
#   DS_LOCK_FILE (/run/lock/moose-deploy.lock), DS_LOCK_WAIT (seconds, 600).
#
# Safety rules: only tags matching ^<app>:rollback-[0-9]{8}-[0-9a-f]{7}$ are ever removed, with a plain
# `docker rmi <tag>` (untag; never -f). Hand-made tags like <app>:rollback-2026-10-21-r36 never match.
# Every value written to the JSON record is checked against an allowlist regex first.

set -euo pipefail

DS_RECORD_DIR="${DS_RECORD_DIR:-/var/lib/moose-deploys}"
DS_KEEP="${DS_KEEP:-3}"
DS_HEALTH_TIMEOUT="${DS_HEALTH_TIMEOUT:-90}"
DS_COMPOSE_FILE="${DS_COMPOSE_FILE:-docker-compose.yml}"
DS_REVISION_LABEL="${DS_REVISION_LABEL:-org.opencontainers.image.revision}"
DS_LOCK_FILE="${DS_LOCK_FILE:-/run/lock/moose-deploy.lock}"
DS_LOCK_WAIT="${DS_LOCK_WAIT:-600}"
DS_PIN_FROM=""
DS_PIN_TO=""
DS_ROLLBACK_TAG=""
DS_OLD_IMAGE_ID=""
DS_OLD_REF=""
DS_RECORDED=0

ds_log() { printf 'deploy-safe: %s\n' "$*" >&2; }

# ds_match VALUE REGEX -> 0 if VALUE fully matches the ERE.
ds_match() { [[ "$1" =~ $2 ]]; }

ds_require_env() {
  ds_match "${DS_APP:-}" '^[a-z0-9][a-z0-9._-]{0,63}$' || { ds_log "bad DS_APP"; return 1; }
  ds_match "${DS_CONTAINER:-}" '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$' || { ds_log "bad DS_CONTAINER"; return 1; }
  ds_match "${DS_SERVICE:-}" '^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$' || { ds_log "bad DS_SERVICE"; return 1; }
  ds_match "${DS_SHA:-}" '^[0-9a-f]{40}$' || { ds_log "bad DS_SHA"; return 1; }
  ds_match "${DS_RUN_ID:-}" '^[0-9]{1,20}$' || { ds_log "bad DS_RUN_ID"; return 1; }
  ds_match "$DS_KEEP" '^[1-9][0-9]?$' || { ds_log "bad DS_KEEP"; return 1; }
  ds_match "$DS_HEALTH_TIMEOUT" '^[0-9]{1,4}$' || { ds_log "bad DS_HEALTH_TIMEOUT"; return 1; }
  ds_match "$DS_REVISION_LABEL" '^[a-z0-9][a-z0-9._-]{0,127}$' || { ds_log "bad DS_REVISION_LABEL"; return 1; }
}

# ds_lock: take the host-wide deploy lock on fd 9 (held until the remote shell exits). All deploys on the
# VPS share one lock, so two deploys (same or different app) never run docker tag/pin/up at the same time.
ds_lock() {
  ds_match "$DS_LOCK_WAIT" '^[0-9]{1,4}$' || { ds_log "bad DS_LOCK_WAIT"; return 1; }
  if [ -e "$DS_LOCK_FILE" ]; then
    exec 9<"$DS_LOCK_FILE" || { ds_log "cannot open $DS_LOCK_FILE"; return 1; }
  else
    exec 9>>"$DS_LOCK_FILE" || { ds_log "cannot create $DS_LOCK_FILE"; return 1; }
  fi
  ds_log "waiting for deploy lock $DS_LOCK_FILE (max ${DS_LOCK_WAIT}s)"
  flock -w "$DS_LOCK_WAIT" 9 || { ds_log "deploy lock busy after ${DS_LOCK_WAIT}s; another deploy is running"; return 1; }
  ds_log "deploy lock acquired"
}

# ds_pin_set FROM TO: remember the single compose image line this deploy changed (FROM -> TO), so a
# rollback reverts only that line instead of restoring a whole-file backup (which could undo another
# app's pin). Call it right after the repo's own pin step.
ds_pin_set() {
  local re='^[a-z0-9][a-z0-9._/:@-]{0,255}$'
  ds_match "${1:-}" "$re" || { ds_log "bad pin ref (from)"; return 1; }
  ds_match "${2:-}" "$re" || { ds_log "bad pin ref (to)"; return 1; }
  DS_PIN_FROM="$1"; DS_PIN_TO="$2"
}

# ds_pin_revert: in DS_COMPOSE_FILE, change the one "image: DS_PIN_TO" line back to DS_PIN_FROM.
# Exact string match (no regex), indentation kept, every other line untouched. Fails unless exactly one
# line matches.
ds_pin_revert() {
  local tmp
  tmp="$(mktemp "${DS_COMPOSE_FILE}.ds-revert.XXXXXX")" || return 1
  if awk -v from="$DS_PIN_FROM" -v to="$DS_PIN_TO" '
      { line=$0; ind=line; sub(/[^ ].*$/, "", ind); body=substr(line, length(ind)+1)
        if (body == "image: " to) { print ind "image: " from; n++ } else print line }
      END { exit (n == 1 ? 0 : 1) }' "$DS_COMPOSE_FILE" > "$tmp"; then
    cat "$tmp" > "$DS_COMPOSE_FILE"; rm -f "$tmp"
    ds_log "compose pin reverted: $DS_PIN_TO -> $DS_PIN_FROM (other lines untouched)"
  else
    rm -f "$tmp"; ds_log "compose pin revert failed: expected exactly one 'image: $DS_PIN_TO' line"
    return 1
  fi
}

# ds_auto_tag_regex APP -> the strict ERE for auto rollback tags of APP (dots escaped).
ds_auto_tag_regex() {
  local app="${1//./\\.}"
  printf '^%s:rollback-[0-9]{8}-[0-9a-f]{7}$' "$app"
}

# ds_select_expired APP KEEP [PROTECT]
#   stdin: lines "<epoch-created> <repo:tag>" (any tags; non-matching ones are ignored)
#   stdout: auto rollback tags to delete, i.e. all matching tags except the newest KEEP
#   (newest = latest YYYYMMDD in the tag, then latest image creation time). PROTECT is never printed.
ds_select_expired() {
  local app="$1" keep="$2" protect="${3:-}" re created ref day
  re="$(ds_auto_tag_regex "$app")"
  while read -r created ref; do
    [ -n "${ref:-}" ] || continue
    ds_match "$ref" "$re" || continue
    ds_match "$created" '^[0-9]{1,12}$' || created=0
    day="${ref#*:rollback-}"; day="${day%%-*}"
    printf '%s %s %s\n' "$day" "$created" "$ref"
  done | sort -k1,1nr -k2,2nr -k3,3r | awk -v keep="$keep" -v protect="$protect" '
    { if (seen[$3]++) next; n++; if (n > keep && $3 != protect) print $3 }'
}

# ds_list_rollback_tags APP -> "<epoch-created> <repo:tag>" for every <app>:rollback-* tag on the host.
ds_list_rollback_tags() {
  local app="$1" ref created
  docker image ls --format '{{.Repository}}:{{.Tag}}' --filter "reference=${app}:rollback-*" \
    | while read -r ref; do
        created="$(docker image inspect -f '{{.Created}}' "$ref" 2>/dev/null || true)"
        created="$(date -u -d "$created" +%s 2>/dev/null || echo 0)"
        printf '%s %s\n' "$created" "$ref"
      done
}

ds_label_of() { # ds_label_of IMAGE -> revision label or empty
  docker image inspect -f "{{ index .Config.Labels \"${DS_REVISION_LABEL}\" }}" "$1" 2>/dev/null \
    | sed 's/^<no value>$//' || true
}

# ds_pre: tag the currently running image and apply retention. No running container = no rollback tag.
ds_pre() {
  ds_require_env || return 1
  local rev short id
  DS_OLD_IMAGE_ID="$(docker inspect -f '{{.Image}}' "$DS_CONTAINER" 2>/dev/null || true)"
  DS_OLD_REF="$(docker inspect -f '{{.Config.Image}}' "$DS_CONTAINER" 2>/dev/null || true)"
  if ! ds_match "$DS_OLD_IMAGE_ID" '^sha256:[0-9a-f]{64}$'; then
    ds_log "no running $DS_CONTAINER; no rollback tag (first deploy or stopped service)"
    DS_OLD_IMAGE_ID=""; DS_OLD_REF=""
    return 0
  fi
  rev="$(ds_label_of "$DS_OLD_IMAGE_ID")"
  if ds_match "$rev" '^[0-9a-f]{7,40}$'; then
    short="${rev:0:7}"
  else
    id="${DS_OLD_IMAGE_ID#sha256:}"; short="${id:0:7}"   # older images without the label
    ds_log "running image has no ${DS_REVISION_LABEL}; using image id prefix $short"
  fi
  DS_ROLLBACK_TAG="${DS_APP}:rollback-$(date -u +%Y%m%d)-${short}"
  docker tag "$DS_OLD_IMAGE_ID" "$DS_ROLLBACK_TAG" || { DS_ROLLBACK_TAG=""; return 1; }
  ds_log "rollback tag $DS_ROLLBACK_TAG -> ${DS_OLD_IMAGE_ID:0:19}"
  ds_retain || ds_log "retention skipped (listing failed); no tags removed"
}

ds_retain() {
  local tag
  ds_list_rollback_tags "$DS_APP" | ds_select_expired "$DS_APP" "$DS_KEEP" "$DS_ROLLBACK_TAG" \
    | while read -r tag; do
        ds_log "retention: removing old auto tag $tag"
        docker rmi "$tag" >/dev/null || ds_log "could not untag $tag (kept)"
      done
}

# ds_wait_healthy [cmd...]: healthy within DS_HEALTH_TIMEOUT. Containers without a Docker HEALTHCHECK
# use the given in-container command (docker exec), else "running, not restarting" for 10 s.
ds_wait_healthy() {
  local deadline has_hc status running restarting stable_since=0
  deadline=$(( $(date +%s) + DS_HEALTH_TIMEOUT ))
  while [ "$(date +%s)" -le "$deadline" ]; do
    has_hc="$(docker inspect -f '{{if .State.Health}}yes{{end}}' "$DS_CONTAINER" 2>/dev/null || true)"
    running="$(docker inspect -f '{{.State.Running}}' "$DS_CONTAINER" 2>/dev/null || echo false)"
    restarting="$(docker inspect -f '{{.State.Restarting}}' "$DS_CONTAINER" 2>/dev/null || echo false)"
    if [ "$has_hc" = yes ]; then
      status="$(docker inspect -f '{{.State.Health.Status}}' "$DS_CONTAINER" 2>/dev/null || echo starting)"
      [ "$status" = healthy ] && [ "$restarting" = false ] && return 0
      [ "$status" = unhealthy ] && { ds_log "$DS_CONTAINER unhealthy"; return 1; }
    elif [ "$#" -gt 0 ]; then
      if [ "$running" = true ] && docker exec "$DS_CONTAINER" "$@" >/dev/null 2>&1; then return 0; fi
    elif [ "$running" = true ] && [ "$restarting" = false ]; then
      [ "$stable_since" -gt 0 ] || stable_since="$(date +%s)"
      [ $(( $(date +%s) - stable_since )) -ge 10 ] && return 0
    else
      stable_since=0
    fi
    sleep 2
  done
  ds_log "$DS_CONTAINER not healthy after ${DS_HEALTH_TIMEOUT}s"
  return 1
}

# ds_verify [cmd...]: healthy AND the running image's revision label == DS_SHA.
ds_verify() {
  local img rev
  ds_wait_healthy "$@" || return 1
  img="$(docker inspect -f '{{.Image}}' "$DS_CONTAINER" 2>/dev/null || true)"
  rev="$(ds_label_of "$img")"
  if [ "$rev" != "$DS_SHA" ]; then
    ds_log "revision label mismatch: running '${rev:0:40}' expected $DS_SHA"
    return 1
  fi
  ds_log "verified $DS_CONTAINER healthy at revision ${DS_SHA:0:7}"
}

# ds_rollback [cmd...]: point the compose ref back at the rollback tag, recreate, wait healthy.
ds_rollback() {
  if [ -z "$DS_ROLLBACK_TAG" ] || [ -z "$DS_OLD_REF" ]; then
    ds_log "no rollback tag (nothing was running before); cannot roll back"
    return 1
  fi
  if [ -n "$DS_PIN_TO" ]; then
    ds_pin_revert || return 1
  fi
  ds_log "rolling back $DS_SERVICE to $DS_ROLLBACK_TAG (as $DS_OLD_REF)"
  docker tag "$DS_ROLLBACK_TAG" "$DS_OLD_REF" || return 1
  docker compose -f "$DS_COMPOSE_FILE" up -d --no-deps --force-recreate "$DS_SERVICE" || return 1
  ds_wait_healthy "$@"
}

# ds_json_str VALUE REGEX -> VALUE if it matches, else "invalid" (never raw input in the record).
ds_json_str() { if ds_match "$1" "$2"; then printf '%s' "$1"; else printf 'invalid'; fi; }

# ds_record RESULT: append one JSON line describing what the container runs now.
ds_record() {
  local result="$1" file img digest rev line
  ds_match "$result" '^(deployed|rolled_back|failed)$' || result=failed
  file="${DS_RECORD_DIR}/${DS_APP}.jsonl"
  img="$(docker inspect -f '{{.Image}}' "$DS_CONTAINER" 2>/dev/null || true)"
  digest="$(docker image inspect -f '{{range .RepoDigests}}{{println .}}{{end}}' "$img" 2>/dev/null | head -n1 || true)"
  rev="$(ds_label_of "$img")"
  line="$(printf '{"ts":"%s","app":"%s","container":"%s","image_id":"%s","repo_digest":"%s","revision":"%s","target_revision":"%s","rollback_tag":"%s","run_id":"%s","result":"%s"}' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$DS_APP" "$DS_CONTAINER" \
    "$(ds_json_str "$img" '^(sha256:[0-9a-f]{64})?$')" \
    "$(ds_json_str "$digest" '^([a-z0-9][a-z0-9._/:-]{0,200}@sha256:[0-9a-f]{64})?$')" \
    "$(ds_json_str "$rev" '^([0-9a-f]{7,40})?$')" \
    "$DS_SHA" \
    "$(ds_json_str "$DS_ROLLBACK_TAG" '^([a-z0-9][a-z0-9._-]{0,63}:rollback-[0-9]{8}-[0-9a-f]{7})?$')" \
    "$DS_RUN_ID" "$result")"
  DS_RECORDED=1
  if [ ! -d "$DS_RECORD_DIR" ] && [ "$(id -u)" -eq 0 ]; then
    install -d -o root -g root -m 0755 "$DS_RECORD_DIR"
  fi
  if [ ! -e "$file" ] && [ "$(id -u)" -eq 0 ] && [ -d "$DS_RECORD_DIR" ]; then
    install -o root -g root -m 0644 /dev/null "$file"
  fi
  if [ -w "$file" ]; then
    printf '%s\n' "$line" >> "$file"
    ds_log "recorded result=$result in $file"
  else
    # Not fatal: the deploy itself is done. Non-root deploy users need the file pre-created
    # (ops/hostcheck/install.sh --prepare-deploy-records). The host check flags the gap.
    printf '::warning::deploy record not written (%s not writable)\n' "$file"
    printf '%s\n' "$line"
  fi
}

# ds_finish [cmd...]: verify; on failure roll back. Records the result; returns 1 unless deployed.
ds_finish() {
  ds_require_env || return 1
  if ds_verify "$@"; then ds_record deployed; return 0; fi
  docker logs --tail 50 "$DS_CONTAINER" 2>&1 | tail -n 50 || true
  if ds_rollback "$@"; then ds_record rolled_back; else ds_record failed; ds_manual_hint; fi
  return 1
}

# ds_manual_hint: after a failed automatic rollback, print the copy-paste recovery commands.
ds_manual_hint() {
  [ -n "$DS_ROLLBACK_TAG" ] && [ -n "$DS_OLD_REF" ] || return 0
  ds_log "MANUAL RECOVERY (run on the VPS in the compose dir):"
  if [ -n "$DS_PIN_TO" ]; then
    ds_log "  sed -i 's#image: ${DS_PIN_TO}\$#image: ${DS_PIN_FROM}#' ${DS_COMPOSE_FILE}"
  fi
  ds_log "  docker tag ${DS_ROLLBACK_TAG} ${DS_OLD_REF} && docker compose -f ${DS_COMPOSE_FILE} up -d --no-deps --force-recreate ${DS_SERVICE}"
}

# ds_on_exit: EXIT trap. If the script dies before ds_record (pull failed, pin failed, ...),
# write result=failed. Always returns 0 so the rest of the trap (temp login dir cleanup) still runs
# under set -e; bash keeps the script's original exit status for the shell itself.
ds_on_exit() {
  if [ "$DS_RECORDED" -eq 0 ] && [ -n "${DS_APP:-}" ] && ds_require_env 2>/dev/null; then
    ds_record failed || true
  fi
  return 0
}

ds_prune() {
  ds_log "pruning dangling images only (tagged and rollback-* images are kept)"
  docker image prune -f || true
}

# Direct execution, for local checks only: `deploy-safe.sh select-expired APP KEEP [PROTECT] < tags`.
if [ "${BASH_SOURCE[0]:-}" = "$0" ]; then
  case "${1:-}" in
    select-expired) shift; ds_select_expired "$@" ;;
    *) echo "source this file from the deploy script; see header" >&2; exit 64 ;;
  esac
fi
