#!/usr/bin/env bash
# Production env → Secret Manager → Cloud Run (same source as CI when DOTENV_PRODUCTION_B64 is set).
# Replaces the old "env-vars-file" flow with a mounted secret at /secrets/.env read by entry-cloud-run.cjs.
#
#   npm run env:sync
#   npm run env:sync -- /path/to/.env   (npm forwards args after --)
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/scripts/sync-dotenv-to-secret-manager.sh" "${1:-}"
