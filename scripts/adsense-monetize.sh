#!/usr/bin/env bash
# Monetize hookstep.in with Google AdSense using CLI + AdSense Management API.
#
# Prerequisites:
#   gcloud auth application-default login \
#     --scopes="https://www.googleapis.com/auth/adsense,https://www.googleapis.com/auth/cloud-platform"
#
# Usage (from frontend/):
#   ./scripts/adsense-monetize.sh           # verify + write env
#   ./scripts/adsense-monetize.sh --sync    # also sync Secret Manager
#   ./scripts/adsense-monetize.sh --deploy  # sync + rebuild/deploy Cloud Run
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="${GCP_PROJECT:-jr-consulting-co}"
PUBLISHER_NUMERIC="${ADSENSE_PUBLISHER_NUMERIC_ID:-6574958062528034}"
ACCOUNT="accounts/pub-${PUBLISHER_NUMERIC}"
DO_SYNC=0
DO_DEPLOY=0

for arg in "$@"; do
  case "$arg" in
    --sync) DO_SYNC=1 ;;
    --deploy) DO_SYNC=1; DO_DEPLOY=1 ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
  esac
done

echo "==> Enabling AdSense API on ${PROJECT}"
gcloud services enable adsense.googleapis.com --project="${PROJECT}" --quiet

echo "==> Fetching access token (ADC must include adsense scope)"
TOKEN="$(gcloud auth application-default print-access-token)"

api() {
  local path="$1"
  curl -sS -H "Authorization: Bearer ${TOKEN}" \
    -H "x-goog-user-project: ${PROJECT}" \
    "https://adsense.googleapis.com/v2/${path}"
}

echo "==> AdSense account"
ACCOUNTS_JSON="$(api accounts)"
echo "${ACCOUNTS_JSON}" | python3 -m json.tool | head -40
echo "${ACCOUNTS_JSON}" | python3 -c "import sys,json; d=json.load(sys.stdin); assert any(a.get('name')=='${ACCOUNT}' for a in d.get('accounts',[])), 'Publisher account not found'; print('OK account', '${ACCOUNT}')"

echo "==> Sites"
SITES_JSON="$(api "${ACCOUNT}/sites")"
echo "${SITES_JSON}" | python3 -m json.tool
AUTO_ADS="$(echo "${SITES_JSON}" | python3 -c "import sys,json; d=json.load(sys.stdin); s=next((x for x in d.get('sites',[]) if x.get('domain')=='hookstep.in'),{}); print('1' if s.get('autoAdsEnabled') else '0'); print(s.get('state',''), file=sys.stderr)")"
SITE_STATE="$(echo "${SITES_JSON}" | python3 -c "import sys,json; d=json.load(sys.stdin); s=next((x for x in d.get('sites',[]) if x.get('domain')=='hookstep.in'),{}); print(s.get('state',''))")"
echo "hookstep.in autoAds=${AUTO_ADS} state=${SITE_STATE}"

echo "==> Ad units"
CLIENT="${ACCOUNT}/adclients/ca-pub-${PUBLISHER_NUMERIC}"
UNITS_JSON="$(api "${CLIENT}/adunits")"
echo "${UNITS_JSON}" | python3 -m json.tool
SLOT="$(echo "${UNITS_JSON}" | python3 -c "
import sys, json
units = json.load(sys.stdin).get('adUnits') or []
# Prefer an ACTIVE unit; extract trailing id from name .../adunits/ID
active = [u for u in units if u.get('state') == 'ACTIVE'] or units
if not active:
  print('')
  raise SystemExit(0)
name = active[0].get('name','')
print(name.rsplit('/', 1)[-1])
")"

if [[ -z "${SLOT}" ]]; then
  echo "error: no AdSense ad units found. Create one in https://www.google.com/adsense/ for pub-${PUBLISHER_NUMERIC}" >&2
  exit 1
fi
echo "Using ad unit slot: ${SLOT}"

echo "==> Live ads.txt"
LIVE_ADS="$(curl -sS https://hookstep.in/ads.txt || true)"
echo "${LIVE_ADS}"
EXPECTED="google.com, pub-${PUBLISHER_NUMERIC}, DIRECT, f08c47fec0942fa0"
if ! echo "${LIVE_ADS}" | grep -Fq "pub-${PUBLISHER_NUMERIC}"; then
  echo "warning: live ads.txt missing publisher pub-${PUBLISHER_NUMERIC}" >&2
fi

ENV_FILE="${ROOT}/.env"
touch "${ENV_FILE}"
upsert_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    # macOS/BSD sed
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
    rm -f "${ENV_FILE}.bak"
  else
    printf '\n%s=%s\n' "${key}" "${val}" >> "${ENV_FILE}"
  fi
}

upsert_env "NEXT_PUBLIC_ADSENSE_ENABLED" "1"
upsert_env "NEXT_PUBLIC_ADSENSE_PUBLISHER_NUMERIC_ID" "${PUBLISHER_NUMERIC}"
upsert_env "NEXT_PUBLIC_ADSENSE_HOME_FOOTER_SLOT" "${SLOT}"
upsert_env "ADSENSE_ENABLED" "1"
upsert_env "ADSENSE_PUBLISHER_NUMERIC_ID" "${PUBLISHER_NUMERIC}"
upsert_env "ADSENSE_HOME_FOOTER_SLOT" "${SLOT}"

# Keep a deployable production env copy for Secret Manager sync
PROD_ENV="${ROOT}/.env.production"
if [[ -f "${ENV_FILE}" ]]; then
  cp "${ENV_FILE}" "${PROD_ENV}"
fi

echo "==> Wrote AdSense keys to .env / .env.production"
grep -E '^NEXT_PUBLIC_ADSENSE_|^ADSENSE_' "${ENV_FILE}" | sed 's/=.*/=***/'

echo "==> Alerts (payment / onboarding may still need console action)"
api "${ACCOUNT}/alerts" | python3 -m json.tool | head -60 || true

if [[ "${DO_SYNC}" -eq 1 ]]; then
  echo "==> Syncing dotenv → Secret Manager (hookstep-dotenv)"
  bash "${ROOT}/scripts/sync-dotenv-to-secret-manager.sh" "${PROD_ENV}"
fi

if [[ "${DO_DEPLOY}" -eq 1 ]]; then
  echo "==> Building + deploying Cloud Run (linux/amd64)"
  REGION="${CLOUD_RUN_REGION:-us-central1}"
  SERVICE="${CLOUD_RUN_SERVICE:-hookstep}"
  AR_REPOSITORY="${AR_REPOSITORY:-cloud-run-source-deploy}"
  SHA="$(git rev-parse HEAD)"
  IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT}/${AR_REPOSITORY}/${SERVICE}"
  docker build --platform linux/amd64 \
    --build-arg "NEXT_PUBLIC_ADSENSE_ENABLED=1" \
    --build-arg "NEXT_PUBLIC_ADSENSE_PUBLISHER_NUMERIC_ID=${PUBLISHER_NUMERIC}" \
    --build-arg "NEXT_PUBLIC_ADSENSE_HOME_FOOTER_SLOT=${SLOT}" \
    -t "${IMAGE_BASE}:${SHA}" -t "${IMAGE_BASE}:latest" .
  docker push "${IMAGE_BASE}:${SHA}"
  docker push "${IMAGE_BASE}:latest"
  gcloud run deploy "${SERVICE}" \
    --image="${IMAGE_BASE}:${SHA}" \
    --region="${REGION}" \
    --platform=managed \
    --project="${PROJECT}" \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --allow-unauthenticated \
    --set-secrets="/secrets/.env=hookstep-dotenv:latest" \
    --quiet
  gcloud run services describe "${SERVICE}" --region="${REGION}" --project="${PROJECT}" \
    --format='value(status.url,status.latestReadyRevisionName)'
fi

cat <<EOF

✅ AdSense monetization config ready
  Publisher: ca-pub-${PUBLISHER_NUMERIC}
  Slot:      ${SLOT}
  Auto ads:  ${AUTO_ADS} (site state: ${SITE_STATE})
  ads.txt:   https://hookstep.in/ads.txt

Manual follow-ups in AdSense console (cannot be finished by API):
  • Complete payment profile if alerted
  • Wait for site review if status is NEEDS_ATTENTION (ads code now on site helps)

EOF
