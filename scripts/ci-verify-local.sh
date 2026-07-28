#!/usr/bin/env bash
# Mirrors GitHub Actions "Build (Next.js)" before deploy: lockfile → npm ci → prisma → next build → optional docker.
# Usage (from repo root): ./scripts/ci-verify-local.sh
#   CI_APP_ROOT=.          force app directory
#   SKIP_DOCKER=1        skip docker build
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

has_lock() {
  [[ -f "$1/package.json" && -f "$1/package-lock.json" ]]
}

if [[ -n "${CI_APP_ROOT:-}" ]]; then
  APP="${CI_APP_ROOT}"
elif has_lock "."; then
  APP="."
elif has_lock "frontend"; then
  APP="frontend"
else
  echo "No package.json + package-lock.json at . or ./frontend. Set CI_APP_ROOT=path/to/app" >&2
  exit 1
fi

echo "==> App root: $APP (pwd: $ROOT)"
cd "$ROOT/$APP"

echo "==> TypeScript (no emit)"
npx tsc --noEmit

echo "==> npm ci"
npm ci

echo "==> Prisma generate"
DATABASE_URL="${DATABASE_URL:-mongodb://127.0.0.1:27017/ci-verify}" npx prisma generate

echo "==> next build"
DATABASE_URL="${DATABASE_URL:-mongodb://127.0.0.1:27017/ci-verify}" npm run build

if [[ "${SKIP_DOCKER:-}" == "1" ]]; then
  echo "==> SKIP_DOCKER=1 — skipping docker build"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "==> Docker not available (SKIP_DOCKER=1 to silence). Skipping docker build." >&2
  exit 0
fi

echo "==> docker build"
docker build -t hookstep-ci-verify:local .

echo "==> CI verify OK (build + docker)"
