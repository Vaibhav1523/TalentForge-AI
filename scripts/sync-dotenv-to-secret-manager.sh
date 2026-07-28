#!/usr/bin/env bash
# Upload .env.production (or path) to Secret Manager as hookstep-dotenv, grant Cloud Run runtime SA access,
# and roll the service so :latest picks up the new version. Then disables older ENABLED secret versions
# (only the newest stays enabled). Set DISABLE_OLD_SECRET_VERSIONS=0 to skip that step.
#
#   gcloud config set project jr-consulting-co
#   npm run env:sync
#   ./scripts/sync-dotenv-to-secret-manager.sh /path/to/.env
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-$ROOT/.env.production}"
PROJECT="${GCP_PROJECT:-jr-consulting-co}"
SECRET="${DOTENV_SECRET_NAME:-hookstep-dotenv}"
SERVICE="${CLOUD_RUN_SERVICE:-hookstep}"
REGION="${CLOUD_RUN_REGION:-us-central1}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: file not found: $ENV_FILE" >&2
  exit 1
fi

echo "Project=$PROJECT secret=$SECRET service=$SERVICE"

# Cloud Run sets PORT / HOSTNAME; never store them in the mounted secret (avoids wrong listen port).
STRIPPED="$(mktemp)"
awk '
  /^[[:space:]]*$/ { print; next }
  /^[[:space:]]*#/ { print; next }
  /^[[:space:]]*PORT=/ { next }
  /^[[:space:]]*HOSTNAME=/ { next }
  /^[[:space:]]*HOST=/ { next }
  { print }
' "$ENV_FILE" > "$STRIPPED"
trap 'rm -f "$STRIPPED"' EXIT

gcloud services enable secretmanager.googleapis.com --project="$PROJECT" --quiet

if gcloud secrets describe "$SECRET" --project="$PROJECT" &>/dev/null; then
  echo "Secret exists; adding new version..."
else
  echo "Creating secret $SECRET..."
  gcloud secrets create "$SECRET" \
    --replication-policy="automatic" \
    --project="$PROJECT" \
    --quiet
fi

gcloud secrets versions add "$SECRET" --data-file="$STRIPPED" --project="$PROJECT" --quiet

bash "$ROOT/scripts/disable-old-secret-manager-versions.sh" "$SECRET" "$PROJECT"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Grant Secret Accessor to Cloud Run runtime SA: $RUNTIME_SA"
gcloud secrets add-iam-policy-binding "$SECRET" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT" \
  --quiet

# New revision so :latest secret version is picked up (if service already exists)
if gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT" &>/dev/null; then
  echo "Updating Cloud Run to mount ${SECRET}:latest at /secrets/.env ..."
  gcloud run services update "$SERVICE" \
    --region="$REGION" \
    --project="$PROJECT" \
    --update-secrets="/secrets/.env=${SECRET}:latest" \
    --quiet
else
  echo "note: Cloud Run service $SERVICE not found yet — push CI deploy first; this script already uploaded the secret."
fi

echo "Done."
