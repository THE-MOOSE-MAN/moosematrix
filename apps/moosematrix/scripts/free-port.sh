#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3001}"

# Kill any process listening on this port (ignore errors if none)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
else
  PIDS="$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${PIDS}" ]]; then
    kill ${PIDS} >/dev/null 2>&1 || true
  fi
fi
