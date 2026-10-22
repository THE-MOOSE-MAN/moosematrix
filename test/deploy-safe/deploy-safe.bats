#!/usr/bin/env bats
# Unit tests for scripts/deploy-safe.sh with a stateful docker mock (no real docker, no network).

SCRIPT="${DEPLOY_SAFE:-$BATS_TEST_DIRNAME/../../scripts/deploy-safe.sh}"
OLD=sha256:$(printf 'a%.0s' {1..64})
NEW=sha256:$(printf 'b%.0s' {1..64})
OLDREV=1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
NEWREV=2222222bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb

setup() {
  export MOCK_STATE="$BATS_TEST_TMPDIR/state"; mkdir -p "$MOCK_STATE"
  export PATH="$BATS_TEST_DIRNAME/mock:$PATH"
  export DS_RECORD_DIR="$BATS_TEST_TMPDIR/records"; mkdir -p "$DS_RECORD_DIR"
  export DS_APP=moosematrix DS_CONTAINER=moosematrix-app-prod DS_SERVICE=moosematrix-app-prod
  export DS_SHA=$NEWREV DS_RUN_ID=123456 DS_HEALTH_TIMEOUT=1
  export DS_LOCK_FILE="$BATS_TEST_TMPDIR/moose-deploy.lock" DS_LOCK_WAIT=1
  cat > "$MOCK_STATE/images" <<EOF
$OLD 2026-10-20T10:00:00Z $OLDREV ghcr.io/the-moose-man/moosematrix@sha256:$(printf 'c%.0s' {1..64})
$NEW 2026-10-21T10:00:00Z $NEWREV ghcr.io/the-moose-man/moosematrix@sha256:$(printf 'd%.0s' {1..64})
EOF
  printf 'ghcr.io/the-moose-man/moosematrix:prod-latest %s\n' "$OLD" > "$MOCK_STATE/tags"
  echo moosematrix-app-prod > "$MOCK_STATE/ctr_name"
  echo "$OLD" > "$MOCK_STATE/ctr_image"
  echo ghcr.io/the-moose-man/moosematrix:prod-latest > "$MOCK_STATE/ctr_ref"
  echo true > "$MOCK_STATE/ctr_running"; echo false > "$MOCK_STATE/ctr_restarting"
  echo healthy > "$MOCK_STATE/ctr_health"
  touch "$DS_RECORD_DIR/moosematrix.jsonl"
  # shellcheck source=/dev/null
  source "$SCRIPT"
  TODAY=$(date -u +%Y%m%d)
}

simulate_deploy() { # new image arrives as prod-latest and compose recreates
  echo "${1:-healthy}" > "$MOCK_STATE/health_after_up"
  docker tag "$NEW" ghcr.io/the-moose-man/moosematrix:prod-latest
  docker compose -f x up -d --no-deps --force-recreate moosematrix-app-prod
  echo healthy > "$MOCK_STATE/health_after_up"   # a rollback recreate comes up healthy
}

# ---------- retention (pure) ----------
@test "retention keeps newest 3 auto tags and never touches manual tags" {
  run ds_select_expired moosematrix 3 <<EOF
100 moosematrix:rollback-20261001-aaaaaaa
200 moosematrix:rollback-20261005-bbbbbbb
300 moosematrix:rollback-20261010-ccccccc
400 moosematrix:rollback-20261015-ddddddd
500 moosematrix:rollback-20261020-eeeeeee
1 moosematrix:rollback-2026-10-21-r36
1 moosematrix:rollback-2026-10-21-r38
1 moosematrix:rollback-2026-10-21
1 moosematrix:rollback-20261001-aaaaaaaa
1 moosematrix:rollback-20261001-AAAAAAA
1 moosematrix:rollback-2026100-aaaaaaa
1 moosematrix:rollback-20261001-aaaaaaa-r1
1 ghcr.io/the-moose-man/moosematrix:rollback-20260101-aaaaaaa
1 moose-money-prod:rollback-20260101-aaaaaaa
1 moosematrix-dev:rollback-20260101-aaaaaaa
EOF
  [ "$status" -eq 0 ]
  [ "${lines[*]}" = "moosematrix:rollback-20261005-bbbbbbb moosematrix:rollback-20261001-aaaaaaa" ]
}

@test "retention: same-day tags ordered by image creation time" {
  run ds_select_expired app 2 <<EOF
50 app:rollback-20261021-1111111
70 app:rollback-20261021-3333333
60 app:rollback-20261021-2222222
EOF
  [ "$output" = "app:rollback-20261021-1111111" ]
}

@test "retention: protected (just created) tag is never selected" {
  run ds_select_expired app 1 app:rollback-20200101-0000000 <<EOF
1 app:rollback-20200101-0000000
2 app:rollback-20261021-1111111
EOF
  [ "$output" = "" ]
}

@test "retention: fewer than KEEP tags deletes nothing; empty input ok" {
  run ds_select_expired app 3 <<< "1 app:rollback-20261021-1111111"
  [ "$output" = "" ]
  run ds_select_expired app 3 < /dev/null
  [ "$status" -eq 0 ] && [ "$output" = "" ]
}

@test "retention: app name with a dot does not act as a regex wildcard" {
  run ds_select_expired my.app 0 <<EOF
1 myXapp:rollback-20261021-1111111
2 my.app:rollback-20261021-2222222
EOF
  [ "$output" = "my.app:rollback-20261021-2222222" ]
}

@test "CLI select-expired works when executed directly" {
  run bash "$SCRIPT" select-expired app 1 <<EOF
1 app:rollback-20261020-1111111
2 app:rollback-20261021-2222222
EOF
  [ "$output" = "app:rollback-20261020-1111111" ]
}

# ---------- ds_pre ----------
@test "pre tags the running image with date + short revision" {
  ds_pre
  [ "$DS_ROLLBACK_TAG" = "moosematrix:rollback-$TODAY-1111111" ]
  grep -q "^moosematrix:rollback-$TODAY-1111111 $OLD\$" "$MOCK_STATE/tags"
}

@test "pre applies retention on the host but leaves manual tags" {
  for d in 20261001 20261002 20261003 20261004; do echo "moosematrix:rollback-$d-abcdef0 $OLD" >> "$MOCK_STATE/tags"; done
  echo "moosematrix:rollback-2026-10-21-r36 $OLD" >> "$MOCK_STATE/tags"
  echo "moose-money-prod:rollback-20200101-abcdef0 $OLD" >> "$MOCK_STATE/tags"
  ds_pre
  run grep -c ':rollback-' "$MOCK_STATE/tags"
  [ "$output" -eq 5 ]   # 3 moosematrix auto (incl. today) + r36 manual + other app
  grep -q 'moosematrix:rollback-2026-10-21-r36' "$MOCK_STATE/tags"
  grep -q 'moose-money-prod:rollback-20200101-abcdef0' "$MOCK_STATE/tags"
  grep -q "moosematrix:rollback-$TODAY-1111111" "$MOCK_STATE/tags"
  ! grep -q 'rollback-20261001-' "$MOCK_STATE/tags"
  ! grep -q 'rmi -f' "$MOCK_STATE/calls"
}

@test "pre: retention listing failure does not abort the deploy or delete anything" {
  echo "moosematrix:rollback-20261001-abcdef0 $OLD" >> "$MOCK_STATE/tags"
  touch "$MOCK_STATE/fail_ls"
  ds_pre
  grep -q 'rollback-20261001-abcdef0' "$MOCK_STATE/tags"
}

@test "pre falls back to image id prefix when the running image has no revision label" {
  sed -i "s/ $OLDREV / - /" "$MOCK_STATE/images"
  ds_pre
  [ "$DS_ROLLBACK_TAG" = "moosematrix:rollback-$TODAY-aaaaaaa" ]
}

@test "pre with no running container: no tag, no failure" {
  rm "$MOCK_STATE/ctr_image"
  ds_pre
  [ -z "$DS_ROLLBACK_TAG" ]
}

@test "pre rejects bad inputs (injection attempts)" {
  local good_sha=$DS_SHA
  DS_SHA='abc"; rm -rf /'; run ds_pre; [ "$status" -ne 0 ]; DS_SHA=$good_sha
  DS_APP='Moose Matrix'; run ds_pre; [ "$status" -ne 0 ]; DS_APP=moosematrix
  DS_RUN_ID='12;id'; run ds_pre; [ "$status" -ne 0 ]; DS_RUN_ID=1
  DS_CONTAINER='-c'; run ds_pre; [ "$status" -ne 0 ]; DS_CONTAINER=moosematrix-app-prod
  DS_REVISION_LABEL='x" }}{{ .Config.Env'; run ds_pre; [ "$status" -ne 0 ]
  ! grep -q 'docker tag' "$MOCK_STATE/calls"
}

# ---------- verify / finish ----------
@test "finish: healthy + matching revision -> deployed record" {
  ds_pre; simulate_deploy healthy
  ds_finish
  run tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl"
  echo "$output" | jq -e --arg r "$NEWREV" --arg id "$NEW" --arg t "moosematrix:rollback-$TODAY-1111111" \
    '.result=="deployed" and .revision==$r and .image_id==$id and .rollback_tag==$t and .run_id=="123456" and .app=="moosematrix" and (.repo_digest|test("@sha256:d{64}$")) and (.ts|test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]{8}Z$"))'
}

@test "finish: unhealthy -> auto rollback to the tag, rolled_back record, nonzero" {
  ds_pre; simulate_deploy unhealthy
  run ds_finish
  [ "$status" -eq 1 ]
  [ "$(cat "$MOCK_STATE/ctr_image")" = "$OLD" ]
  grep -q "docker tag moosematrix:rollback-$TODAY-1111111 ghcr.io/the-moose-man/moosematrix:prod-latest" "$MOCK_STATE/calls"
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e --arg r "$OLDREV" '.result=="rolled_back" and .revision==$r and .target_revision!=.revision'
}

@test "finish: healthy but wrong revision label -> rollback" {
  ds_pre; DS_SHA=3333333ccccccccccccccccccccccccccccccccc; simulate_deploy healthy
  run ds_finish
  [ "$status" -eq 1 ]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="rolled_back"'
}

@test "finish: no previous container -> failed record (cannot roll back)" {
  rm "$MOCK_STATE/ctr_image"; ds_pre
  echo "$NEW" > "$MOCK_STATE/ctr_image"; echo unhealthy > "$MOCK_STATE/ctr_health"
  run ds_finish
  [ "$status" -eq 1 ]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="failed" and .rollback_tag==""'
}

# ---------- pinned-tag repos (m2, mooseman): rollback reverts only this service's image line ----------
pinned_setup() { # compose file with two pinned services sharing the file (m2 + mooseman)
  C="$BATS_TEST_TMPDIR/compose.yml"; DS_COMPOSE_FILE="$C"
  PIN_OLD=ghcr.io/the-moose-man/moose-money-prod:prod-$OLDREV
  PIN_NEW=ghcr.io/the-moose-man/moose-money-prod:prod-$NEWREV
  printf '%s\n' "services:" "  m2-app-prod:" "    image: $PIN_OLD" "  mooseman-site-prod:" \
    "    image: ghcr.io/the-moose-man/mooseman-site-prod:prod-aaaaaaa" > "$C"
  printf '%s %s\n%s %s\n' "$PIN_OLD" "$OLD" "$PIN_NEW" "$NEW" >> "$MOCK_STATE/tags"
  echo "$PIN_OLD" > "$MOCK_STATE/ctr_ref"
  echo "$C" > "$MOCK_STATE/compose_pin_file"; echo moose-money-prod > "$MOCK_STATE/compose_pin_prefix"
}
pin_deploy() { # what the m2 workflow does: pin, record the pin, compose up
  sed -i "s#^    image: $PIN_OLD\$#    image: $PIN_NEW#" "$C"
  ds_pin_set "$PIN_OLD" "$PIN_NEW"
  echo "${1:-healthy}" > "$MOCK_STATE/health_after_up"
  docker compose -f "$C" up -d --no-deps m2-app-prod
  echo healthy > "$MOCK_STATE/health_after_up"
}

@test "pinned: rollback reverts only this service's image line; another app's concurrent pin survives" {
  pinned_setup; ds_pre; pin_deploy unhealthy
  # another deploy re-pinned mooseman while this one was running (what a whole-file restore used to undo)
  sed -i 's#mooseman-site-prod:prod-aaaaaaa#mooseman-site-prod:prod-bbbbbbb#' "$C"
  run ds_finish
  [ "$status" -eq 1 ]
  grep -qx "    image: $PIN_OLD" "$C"
  grep -qx '    image: ghcr.io/the-moose-man/mooseman-site-prod:prod-bbbbbbb' "$C"
  [ "$(cat "$MOCK_STATE/ctr_image")" = "$OLD" ]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="rolled_back"'
}

@test "pinned: success leaves the new pin in place" {
  pinned_setup; ds_pre; pin_deploy healthy
  ds_finish
  grep -qx "    image: $PIN_NEW" "$C"
}

@test "pinned: revert refuses when the pinned line is missing or duplicated (no blind edits)" {
  pinned_setup; ds_pin_set "$PIN_OLD" "$PIN_NEW"
  run ds_pin_revert; [ "$status" -eq 1 ]           # line not present
  printf '    image: %s\n    image: %s\n' "$PIN_NEW" "$PIN_NEW" >> "$C"
  before="$(sha256sum < "$C")"
  run ds_pin_revert; [ "$status" -eq 1 ]           # duplicated
  [ "$(sha256sum < "$C")" = "$before" ]
  ! ls "$C".ds-revert.* 2>/dev/null
}

@test "pinned: hostile pin refs are rejected" {
  run ds_pin_set 'x#y' "$NEWREV"; [ "$status" -ne 0 ]
  run ds_pin_set 'ghcr.io/a:b' 'a b'; [ "$status" -ne 0 ]
}

@test "failed rollback prints the manual recovery command (L3)" {
  pinned_setup; ds_pre; pin_deploy unhealthy
  touch "$MOCK_STATE/up_fail"
  run ds_finish
  [ "$status" -eq 1 ]
  [[ "$output" == *"MANUAL RECOVERY"* ]]
  [[ "$output" == *"docker tag moosematrix:rollback-$TODAY-1111111 $PIN_OLD"* ]]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="failed"'
}

@test "verify: container without HEALTHCHECK uses the in-container command" {
  echo none > "$MOCK_STATE/ctr_health"; echo "$NEW" > "$MOCK_STATE/ctr_image"
  run ds_verify wget -qO- http://localhost:3000/healthz
  [ "$status" -eq 1 ]
  touch "$MOCK_STATE/exec_ok"
  run ds_verify wget -qO- http://localhost:3000/healthz
  [ "$status" -eq 0 ]
}

@test "verify: no HEALTHCHECK and no command -> needs 10s of running, not restarting" {
  echo none > "$MOCK_STATE/ctr_health"; echo "$NEW" > "$MOCK_STATE/ctr_image"
  DS_HEALTH_TIMEOUT=3; run ds_verify
  [ "$status" -eq 1 ]
  DS_HEALTH_TIMEOUT=13; run ds_verify
  [ "$status" -eq 0 ]
}

@test "verify: restarting container is not healthy" {
  echo "$NEW" > "$MOCK_STATE/ctr_image"; echo true > "$MOCK_STATE/ctr_restarting"
  run ds_verify
  [ "$status" -eq 1 ]
}

# ---------- record ----------
@test "record: hostile label value never reaches the JSON" {
  sed -i "s/ $NEWREV / x\",\"result\":\"deployed /" "$MOCK_STATE/images"
  echo "$NEW" > "$MOCK_STATE/ctr_image"
  ds_record deployed
  run tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl"
  echo "$output" | jq -e '.revision=="invalid"'
  [ "$(echo "$output" | jq -r 'keys|length')" -eq 10 ]
}

@test "record: unknown result coerced to failed; every line is valid JSON" {
  ds_record 'deployed","x":"y'
  ds_record deployed
  jq -e -s 'length==2 and .[0].result=="failed"' "$DS_RECORD_DIR/moosematrix.jsonl"
}

@test "record: unwritable record file warns and does not fail" {
  rm "$DS_RECORD_DIR/moosematrix.jsonl"; chmod 0555 "$DS_RECORD_DIR"
  run ds_record deployed
  [ "$status" -eq 0 ]
  [[ "$output" == *"::warning::deploy record not written"* ]]
  chmod 0755 "$DS_RECORD_DIR"
}

@test "on_exit: dying before a record writes result=failed and keeps the exit code" {
  run bash -c "export PATH='$PATH' MOCK_STATE='$MOCK_STATE'; source '$SCRIPT'; trap ds_on_exit EXIT; ds_pre; false"
  [ "$status" -eq 1 ]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="failed"'
}

@test "on_exit returns 0 so the rest of the trap (GHCR login dir cleanup) runs; exit code kept (L1)" {
  d="$BATS_TEST_TMPDIR/ghcr-login"; mkdir -p "$d"
  run bash -c "set -euo pipefail; export PATH='$PATH' MOCK_STATE='$MOCK_STATE'; source '$SCRIPT'; trap 'ds_on_exit; rm -rf \"$d\"' EXIT; ds_pre; exit 7"
  [ "$status" -eq 7 ]
  [ ! -e "$d" ]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="failed"'
}

@test "on_exit: no duplicate record after ds_finish" {
  run bash -c "export PATH='$PATH' MOCK_STATE='$MOCK_STATE'; source '$SCRIPT'; trap ds_on_exit EXIT; ds_pre; echo '$NEW' > '$MOCK_STATE/ctr_image'; ds_finish"
  [ "$status" -eq 0 ]
  [ "$(wc -l < "$DS_RECORD_DIR/moosematrix.jsonl")" -eq 1 ]
}

@test "prune is dangling-only" {
  ds_prune
  grep -qx 'docker image prune -f' "$MOCK_STATE/calls"
  ! grep -q -- '-a' <(grep prune "$MOCK_STATE/calls")
}

@test "streamed over stdin (bash -s) loads the functions without running anything" {
  run bash -c "{ cat '$SCRIPT'; echo 'type ds_finish >/dev/null && echo LOADED'; } | bash -s"
  [ "$status" -eq 0 ] && [ "$output" = LOADED ]
}

# ---------- H1: stdin. The remote script is streamed over `ssh ... bash -s`. ----------
# body BODY: deploy-safe.sh + a remote body shaped like the moose-brain one (migration via compose run).
stream() { # stream WRAPPED(0|1)
  local body='ds_lock
export DS_APP=moosematrix DS_CONTAINER=moosematrix-app-prod DS_SERVICE=moosematrix-app-prod DS_SHA='"$NEWREV"' DS_RUN_ID=1
trap "ds_on_exit || true" EXIT
ds_pre
docker tag '"$NEW"' ghcr.io/the-moose-man/moosematrix:prod-latest
docker compose -f docker-compose.yml run --rm -T moosematrix-app-prod npx prisma migrate deploy </dev/null
docker compose -f docker-compose.yml up -d --no-deps moosematrix-app-prod
docker exec moosematrix-app-prod true
ds_finish
ds_prune
echo POST_STEPS_DONE'
  cat "$SCRIPT"
  if [ "$1" = 1 ]; then printf 'main() {\n%s\n}\nmain </dev/null; exit $?\n' "$body"
  else printf '%s\n' "$(printf '%s' "$body" | sed 's# </dev/null##')"; fi
}

@test "H1 control: without the wrapper, a stdin-reading compose run swallows the rest of the script" {
  export MOCK_READ_STDIN=1
  touch "$MOCK_STATE/exec_ok"
  run bash -c "$(declare -f stream); SCRIPT='$SCRIPT' NEW='$NEW' NEWREV='$NEWREV' stream 0 | bash -s"
  [ "$status" -eq 0 ]                              # the job would look green...
  [[ "$output" != *POST_STEPS_DONE* ]]             # ...but verify/record/prune never ran
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="failed"'   # only the EXIT trap wrote
  ! grep -q 'image prune' "$MOCK_STATE/calls"
}

@test "H1: with main() </dev/null, compose run + exec read stdin and every post-step still runs" {
  export MOCK_READ_STDIN=1
  touch "$MOCK_STATE/exec_ok"
  run bash -c "$(declare -f stream); SCRIPT='$SCRIPT' NEW='$NEW' NEWREV='$NEWREV' stream 1 | bash -s"
  [ "$status" -eq 0 ]
  [[ "$output" == *POST_STEPS_DONE* ]]
  [ "$(wc -l < "$DS_RECORD_DIR/moosematrix.jsonl")" -eq 1 ]
  tail -n1 "$DS_RECORD_DIR/moosematrix.jsonl" | jq -e '.result=="deployed"'
  grep -qx 'docker image prune -f' "$MOCK_STATE/calls"
}

# ---------- M1: host-wide deploy lock ----------
@test "lock: a second deploy waits, then fails cleanly while the lock is held" {
  flock "$DS_LOCK_FILE" /bin/sleep 3 & holder=$!
  /bin/sleep 0.3
  run ds_lock
  [ "$status" -eq 1 ]
  [[ "$output" == *"deploy lock busy"* ]]
  wait "$holder"
}

@test "lock: acquired when free, and held for the life of the shell" {
  run bash -c "export PATH='$PATH'; source '$SCRIPT'; ds_lock; flock -n '$DS_LOCK_FILE' true && echo NOT_HELD || echo HELD"
  [ "$status" -eq 0 ]
  [[ "$output" == *HELD* ]] && [[ "$output" != *NOT_HELD* ]]
}

@test "lock: bad DS_LOCK_WAIT rejected" {
  DS_LOCK_WAIT='1;id' run ds_lock
  [ "$status" -eq 1 ]
}
