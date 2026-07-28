#!/usr/bin/env bash
# Create a dedicated service account + JSON key for LOCAL dev GCS only (never commit the key).
# Cloud Run prod should omit GCS_SERVICE_ACCOUNT_JSON and use ADC + grant-cloud-run-bucket-access.sh.
#
#   gcloud config set project jr-consulting-co
#   npm run env:local-gcs-sa
#
# Then in .env (not .env.production):
#   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/frontend/.keys/hookstep-local-gcs.json
#   (or set GCS_SERVICE_ACCOUNT_JSON to the minified JSON on one line — prefer the file path.)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="${GCP_PROJECT:-jr-consulting-co}"
SA_NAME="${LOCAL_GCS_SA_NAME:-hookstep-local-gcs}"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
KEY_DIR="${ROOT}/.keys"
KEY_FILE="${KEY_DIR}/${SA_NAME}.json"

RESUME_BUCKET="${GCS_BUCKET_RESUMES:-hireu-resumes-staging}"
LOGOS_BUCKET="${GCS_BUCKET_IMAGES:-hookstep-logos-staging}"
TEAM_BUCKET="${GCS_BUCKET_TEAM_PHOTOS:-hookstep-team-photos-staging}"
ROLE="${GCS_BUCKET_IAM_ROLE:-roles/storage.objectAdmin}"

echo "Project: $PROJECT"
echo "SA: $SA_EMAIL"
echo "Buckets: $RESUME_BUCKET $LOGOS_BUCKET $TEAM_BUCKET"

gcloud iam service-accounts create "${SA_NAME}" \
  --project="${PROJECT}" \
  --display-name="Hookstep local dev GCS (workstation only)" 2>/dev/null || echo "(SA may already exist)"

for b in "${RESUME_BUCKET}" "${LOGOS_BUCKET}" "${TEAM_BUCKET}"; do
  gcloud storage buckets add-iam-policy-binding "gs://${b}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --project="${PROJECT}" \
    --quiet
done

mkdir -p "${KEY_DIR}"
if [[ -f "${KEY_FILE}" ]]; then
  echo "Key file already exists: ${KEY_FILE}"
  echo "To rotate: gcloud iam service-accounts keys delete KEY_ID --iam-account=${SA_EMAIL} --project=${PROJECT}"
else
  gcloud iam service-accounts keys create "${KEY_FILE}" \
    --iam-account="${SA_EMAIL}" \
    --project="${PROJECT}" \
    --quiet
  chmod 600 "${KEY_FILE}"
fi

echo ""
echo "Add to your local .env (absolute path recommended):"
echo "  GOOGLE_APPLICATION_CREDENTIALS=${KEY_FILE}"
echo ""
echo "Do not add this key to .env.production or Secret Manager."
