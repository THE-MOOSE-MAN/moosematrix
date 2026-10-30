#!/usr/bin/env bash
# Install (or update) moose-hostcheck on the VPS. Idempotent: safe to re-run; it converges to the same state.
# Run as root from a checkout of this repo:  sudo ops/hostcheck/install.sh [options]
#
#   --prepare-deploy-records  create /var/lib/moose-deploys (root:root 0755) and pre-create one <app>.jsonl per app,
#                             owned by $DEPLOY_USER (default: moose) mode 0644, so non-root CI deploys can append
#                             but cannot create, rename or delete files there. Apps: $DEPLOY_APPS.
#   --run-now                 run one check right away
#   --dry-run                 print what would change, change nothing
#
# Undo: ops/hostcheck/uninstall.sh. Needs the owner's approval before running on the VPS (host change).
set -euo pipefail

ROOT="${MOOSE_ROOT:-}"          # tests only: install into a fake root
DEPLOY_USER="${DEPLOY_USER:-moose}"
DEPLOY_APPS="${DEPLOY_APPS:-moosematrix moosematrix-dev moosebrain-api moose-money-prod mooseman-site-prod}"
HC_USER=moose-hostcheck
LIB="$ROOT/usr/local/lib/moose-hostcheck"
UNITS="$ROOT/etc/systemd/system"
RECORDS="$ROOT/var/lib/moose-deploys"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The systemd timer is the only supported scheduler: it carries the sandbox (VB R39 M4 removed --cron).
PREP=0 RUN_NOW=0 DRY=0
for a in "$@"; do
  case "$a" in
    --prepare-deploy-records) PREP=1 ;;
    --run-now) RUN_NOW=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "unknown option: $a" >&2; exit 64 ;;
  esac
done

do_() { if [ "$DRY" -eq 1 ]; then printf 'would run: %s\n' "$*"; else "$@"; fi; }

if [ "$DRY" -eq 0 ] && [ -z "$ROOT" ] && [ "$(id -u)" -ne 0 ]; then
  echo "run as root (or use --dry-run)" >&2; exit 1
fi
[[ "$DEPLOY_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || { echo "bad DEPLOY_USER" >&2; exit 64; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }

# 1. dedicated system user, no login, no home
if ! id -u "$HC_USER" >/dev/null 2>&1; then
  do_ useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$HC_USER"
fi
# docker group = read access to the docker socket (root-equivalent; see README "Privilege tradeoff")
if getent group docker >/dev/null 2>&1 && ! id -nG "$HC_USER" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
  do_ usermod -aG docker "$HC_USER"
fi

# 2. script (root-owned, read-only for the service user)
do_ install -d -m 0755 "$LIB"
do_ install -m 0755 "$SRC/moose_hostcheck.py" "$LIB/moose_hostcheck.py"

# 3. scheduler: sandboxed systemd service + timer
do_ install -d -m 0755 "$UNITS"
do_ install -m 0644 "$SRC/systemd/moose-hostcheck.service" "$UNITS/moose-hostcheck.service"
do_ install -m 0644 "$SRC/systemd/moose-hostcheck.timer" "$UNITS/moose-hostcheck.timer"
do_ systemctl daemon-reload
do_ systemctl enable --now moose-hostcheck.timer

# 4. optional: deploy record files for non-root deploy users
if [ "$PREP" -eq 1 ]; then
  do_ install -d -m 0755 "$RECORDS"
  do_ chown root:root "$RECORDS"
  for app in $DEPLOY_APPS; do
    [[ "$app" =~ ^[a-z0-9][a-z0-9._-]{0,63}$ ]] || { echo "bad app name: $app" >&2; exit 64; }
    f="$RECORDS/$app.jsonl"
    [ -e "$f" ] || do_ install -m 0644 /dev/null "$f"
    do_ chown "$DEPLOY_USER:$DEPLOY_USER" "$f"
    do_ chmod 0644 "$f"
  done
fi

if [ "$RUN_NOW" -eq 1 ]; then
  do_ systemctl start moose-hostcheck.service
fi
echo "moose-hostcheck installed (systemd timer)."
