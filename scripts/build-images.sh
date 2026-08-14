#!/usr/bin/env bash
# =============================================================================
# CauriPay — build & push des images applicatives (GOURSI-005c)
# Détecte les services présents : pom.xml → Dockerfile.java, package.json → Dockerfile.nestjs
# Pousse vers ghcr.io/kitokoh/cauripay/<service>:<TAG> (TAG défaut : latest).
# Usage : TAG=abc bash scripts/build-images.sh
# =============================================================================
set -euo pipefail

TAG="${TAG:-latest}"
REGISTRY="ghcr.io/kitokoh/cauripay"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Login GHCR si GITHUB_TOKEN est disponible (CI)
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR:-github-actions}" --password-stdin
fi

built=0
for svc_dir in "$ROOT"/services/*/; do
  svc="$(basename "$svc_dir")"
  if [[ -f "$svc_dir/pom.xml" ]]; then
    dockerfile="infra/docker/Dockerfile.java"
  elif [[ -f "$svc_dir/package.json" ]]; then
    dockerfile="infra/docker/Dockerfile.nestjs"
  else
    continue
  fi
  echo "==> build ${REGISTRY}/${svc}:${TAG}"
  docker build -f "$ROOT/$dockerfile" \
    --build-arg "SERVICE_DIR=services/${svc}" \
    -t "${REGISTRY}/${svc}:${TAG}" \
    -t "${REGISTRY}/${svc}:latest" "$ROOT"
  docker push "${REGISTRY}/${svc}:${TAG}"
  built=$((built + 1))
done

echo "==> ${built} image(s) poussée(s) sur ${REGISTRY}"
[[ "$built" -gt 0 ]]
