#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root using our Node helper
ROOT="$(node "$(dirname "$0")/find-repo-root.mjs" || true)"
if [ -z "${ROOT}" ]; then
  echo "[gymbro] ERROR: Cannot find repo root. Aborting." >&2
  exit 1
fi

# If not already in root, jump there
if [ "$PWD" != "$ROOT" ]; then
  cd "$ROOT"
fi

# Execute the rest of the command passed to this script
# Usage: run-from-root.sh <command...>
exec "$@"
