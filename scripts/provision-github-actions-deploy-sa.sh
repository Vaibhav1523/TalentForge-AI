#!/usr/bin/env bash
# Create a service account for GitHub Actions → Artifact Registry + Cloud Run (service: hookstep).
# Run locally while authenticated as owner of jr-consulting-co:
#   gcloud config set project jr-consulting-co && ./scripts/provision-github-actions-deploy-sa.sh
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-jr-consulting-co}"
REGION="${GCP_REGION:-us-central1}"
SA_NAME="${GITHUB_ACTIONS_SA_NAME:-github-cloud-run-hookstep}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Project: ${PROJECT_ID} (${PROJECT_NUMBER})"
echo "Service account: ${SA_EMAIL}"

gcloud iam service-accounts create "${SA_NAME}" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions deploy hookstep" 2>/dev/null || echo "(SA may already exist)"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --condition=None --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin" \
  --condition=None --quiet

# Allows the workflow step "gcloud services enable run.googleapis.com artifactregistry.googleapis.com".
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageAdmin" \
  --condition=None --quiet

# CI runs gcloud secrets describe / versions list before deploy (hookstep-dotenv).
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.viewer" \
  --condition=None --quiet

gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

# After secret hookstep-dotenv exists (run scripts/sync-dotenv-to-secret-manager.sh once), CI can add versions.
DOTENV_SECRET="${DOTENV_SECRET_NAME:-hookstep-dotenv}"
if gcloud secrets describe "${DOTENV_SECRET}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud secrets add-iam-policy-binding "${DOTENV_SECRET}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretVersionAdder" \
    --project="${PROJECT_ID}" \
    --quiet 2>/dev/null || true
  echo "Granted secretVersionAdder on ${DOTENV_SECRET} to ${SA_EMAIL}"
else
  echo "(Skip) Secret ${DOTENV_SECRET} not found yet — run ./scripts/sync-dotenv-to-secret-manager.sh then re-run this script to grant CI upload on that secret."
fi

echo ""
echo "Create JSON key (download once, add entire JSON as GitHub secret GCP_SA_JSON):"
echo "  gcloud iam service-accounts keys create github-hookstep-sa.json --iam-account=${SA_EMAIL} --project=${PROJECT_ID}"
echo ""
echo "Then in GitHub: repo → Settings → Secrets → Actions → New repository secret → name: GCP_SA_JSON"
