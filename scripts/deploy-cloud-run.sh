#!/usr/bin/env bash
# Build and deploy the Next.js app to Cloud Run (from frontend/).
#
# Prerequisites: gcloud CLI, logged in (gcloud auth login). Project has Cloud Run + Artifact Registry + Cloud Build APIs.
# The Cloud Build service account needs: roles/run.admin, roles/iam.serviceAccountUser, roles/logging.logWriter
#
# By default, after deploy runs ./scripts/push-env-to-cloud-run.sh (reads .env.production).
# Set SKIP_PUSH_ENV=1 to skip pushing env.
#
# Usage (works from frontend/ or frontend/scripts/):
#   ./scripts/deploy-cloud-run.sh
#   SKIP_PUSH_ENV=1 ./scripts/deploy-cloud-run.sh

set -e

PROJECT_ID="${PROJECT_ID:-favorable-axe-485111-b0}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-hireu-frontend}"
SKIP_PUSH_ENV="${SKIP_PUSH_ENV:-0}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Project:       $PROJECT_ID"
echo "Region:        $REGION"
echo "Service name:  $SERVICE_NAME"
echo ""

gcloud config set project "$PROJECT_ID"

echo "[...] Enabling Cloud Run, Artifact Registry, Cloud Build APIs ..."
enable_output=$(gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --quiet 2>&1)
enable_exit=$?
if [[ $enable_exit -ne 0 ]]; then
  if echo "$enable_output" | grep -qi "already enabled\|already exists"; then
    echo "[OK] APIs already enabled."
  else
    echo "[ERROR] Failed to enable APIs (exit $enable_exit):"
    echo "$enable_output"
    echo "Check permissions, billing, and quota then re-run."
    exit $enable_exit
  fi
fi

echo "[...] Building and deploying to Cloud Run (this may take several minutes) ..."
echo "      First run: ~5 min (no cache). Subsequent runs: ~1-2 min (layer cache)."
cd "$FRONTEND_DIR"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=$REGION,_SERVICE_NAME=$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  .

echo ""
echo "[OK] Deployed. Fetching service URL ..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)' 2>/dev/null || true)
if [[ -n "$SERVICE_URL" ]]; then
  echo "Service URL: $SERVICE_URL"
fi

if [[ "$SKIP_PUSH_ENV" == "1" ]]; then
  echo ""
  echo "Skipping push-env (SKIP_PUSH_ENV=1). Run ./scripts/push-env-to-cloud-run.sh to push .env.production."
  exit 0
fi

echo ""
echo "[...] Pushing env from .env.production to Cloud Run ..."
"$SCRIPT_DIR/push-env-to-cloud-run.sh"
echo ""
echo "Done. Deploy and env update complete."
