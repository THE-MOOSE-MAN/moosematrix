#!/usr/bin/env bash
# Remove moose-hostcheck (systemd timer + service). Idempotent. Keeps /var/lib/moose-hostcheck reports unless --purge.
# Never touches /var/lib/moose-deploys (the deploy records belong to the CI deploys).
#   sudo ops/hostcheck/uninstall.sh [--purge] [--dry-run]
set -euo pipefail
ROOT="${MOOSE_ROOT:-}"
HC_USER=moose-hostcheck
PURGE=0 DRY=0
for a in "$@"; do
  case "$a" in --purge) PURGE=1 ;; --dry-run) DRY=1 ;; *) echo "unknown option: $a" >&2; exit 64 ;; esac
done
do_() { if [ "$DRY" -eq 1 ]; then printf 'would run: %s\n' "$*"; else "$@"; fi; }
if [ "$DRY" -eq 0 ] && [ -z "$ROOT" ] && [ "$(id -u)" -ne 0 ]; then echo "run as root (or use --dry-run)" >&2; exit 1; fi

if [ -e "$ROOT/etc/systemd/system/moose-hostcheck.timer" ] || [ -e "$ROOT/etc/systemd/system/moose-hostcheck.service" ]; then
  do_ systemctl disable --now moose-hostcheck.timer || true
  do_ rm -f "$ROOT/etc/systemd/system/moose-hostcheck.timer" "$ROOT/etc/systemd/system/moose-hostcheck.service"
  do_ systemctl daemon-reload
fi
[ -d "$ROOT/usr/local/lib/moose-hostcheck" ] && do_ rm -rf "$ROOT/usr/local/lib/moose-hostcheck"
if id -u "$HC_USER" >/dev/null 2>&1; then do_ userdel "$HC_USER"; fi
if [ "$PURGE" -eq 1 ] && [ -d "$ROOT/var/lib/moose-hostcheck" ]; then do_ rm -rf "$ROOT/var/lib/moose-hostcheck"; fi
echo "moose-hostcheck removed$([ "$PURGE" -eq 1 ] && echo ' (reports purged)' || echo '; reports kept in /var/lib/moose-hostcheck')."
