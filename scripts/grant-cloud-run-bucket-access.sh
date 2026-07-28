#!/usr/bin/env bash
# Grant the Cloud Run default runtime service account access to GCS buckets in the same project.
# After this, you can omit GCS_SERVICE_ACCOUNT_JSON on Cloud Run and use ADC via getGcsStorage().
#
#   gcloud config set project jr-consulting-co
#   ./scripts/grant-cloud-run-bucket-access.sh
#
# Override buckets:
#   RESUME_BUCKET=... LOGOS_BUCKET=... TEAM_PHOTOS_BUCKET=... ./scripts/grant-cloud-run-bucket-access.sh
set -euo pipefail

PROJECT="${GCP_PROJECT:-jr-consulting-co}"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

RESUME_BUCKET="${GCS_BUCKET_RESUMES:-hireu-resumes-staging}"
LOGOS_BUCKET="${GCS_BUCKET_IMAGES:-hookstep-logos-staging}"
TEAM_BUCKET="${GCS_BUCKET_TEAM_PHOTOS:-hookstep-team-photos-staging}"

ROLE="${GCS_BUCKET_IAM_ROLE:-roles/storage.objectAdmin}"

echo "Runtime SA: ${RUNTIME_SA}"
echo "Role per bucket: ${ROLE}"

for b in "${RESUME_BUCKET}" "${LOGOS_BUCKET}" "${TEAM_BUCKET}"; do
  echo "Binding ${RUNTIME_SA} on gs://${b} ..."
  gcloud storage buckets add-iam-policy-binding "gs://${b}" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="${ROLE}" \
    --project="${PROJECT}" \
    --quiet
done

echo "Done. You may remove GCS_SERVICE_ACCOUNT_JSON from .env.production on Cloud Run if you rely on ADC only."
