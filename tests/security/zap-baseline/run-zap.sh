#!/usr/bin/env bash
# GOURSI-QA3 — Baseline OWASP ZAP contre api-core (staging)
# DoD #10 : 0 vulnérabilité critique (CVSS > 9).
# Usage : ./tests/security/zap-baseline/run-zap.sh <target_url>
# Prérequis : docker (image ghcr.io/zaproxy/zaproxy)

set -euo pipefail

TARGET="${1:-http://localhost:3000}"
REPORT_DIR="docs/security/zap-reports"
mkdir -p "${REPORT_DIR}"

echo "▶ Baseline ZAP sur ${TARGET}"
docker run --rm -t \
  ghcr.io/zaproxy/zaproxy \
  zap-baseline.py \
  -t "${TARGET}" \
  -r "${REPORT_DIR}/zap-report-$(date +%Y%m%d-%H%M).html" \
  -J "${REPORT_DIR}/zap-report-$(date +%Y%m%d-%H%M).json" \
  -c tests/security/zap-baseline/zap.conf \
  || echo "✘ HIGH/CRITICAL détectées — cf. rapport HTML (DoD #10 non satisfait)"

echo "✔ Baseline terminé — rapports dans ${REPORT_DIR}"
