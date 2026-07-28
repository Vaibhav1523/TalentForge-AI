#!/usr/bin/env bash
# After adding a new Secret Manager version, disable every other ENABLED version so only the
# newest remains active (reduces stale .env snapshots). :latest still resolves correctly.
#
# Usage:
#   ./scripts/disable-old-secret-manager-versions.sh [SECRET_NAME] [PROJECT_ID]
#
# Env:
#   DISABLE_OLD_SECRET_VERSIONS=0  — skip (no disable)
#
set -euo pipefail

SECRET="${1:-${DOTENV_SECRET_NAME:-hookstep-dotenv}}"
PROJECT="${2:-${GCP_PROJECT:-jr-consulting-co}}"

if [[ "${DISABLE_OLD_SECRET_VERSIONS:-}" == "0" ]]; then
  echo "DISABLE_OLD_SECRET_VERSIONS=0 — skipping old-version disable for $SECRET"
  exit 0
fi

newest="$(
  gcloud secrets versions list "$SECRET" --project="$PROJECT" \
    --filter="state:ENABLED" \
    --sort-by="~createTime" \
    --limit=1 \
    --format="value(name)" 2>/dev/null | awk -F/ '{print $NF}'
)"

if [[ -z "$newest" ]]; then
  echo "warning: no ENABLED versions for secret $SECRET in $PROJECT; nothing to disable" >&2
  exit 0
fi

echo "Secret $SECRET: keeping version $newest enabled; disabling other enabled versions..."
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  vid="${name##*/}"
  if [[ "$vid" == "$newest" ]]; then
    continue
  fi
  echo "  disabling version $vid"
  gcloud secrets versions disable "$vid" --secret="$SECRET" --project="$PROJECT" --quiet
done < <(gcloud secrets versions list "$SECRET" --project="$PROJECT" \
  --filter="state:ENABLED" \
  --format="value(name)")
