#!/usr/bin/env bash
# GOURSI — scripts/setup-check.sh : valide l'environnement de dev (GOURSI-QA6)
set -euo pipefail

FAIL=0
ok()   { echo "✔ $1"; }
ko()   { echo "✘ $1"; FAIL=1; }

command -v node >/dev/null 2>&1 || { ko "node manquant (requis : >= 20)"; exit 1; }
command -v npm  >/dev/null 2>&1 || { ko "npm manquant"; exit 1; }
command -v java >/dev/null 2>&1 || { ko "java manquant (requis : 21)"; exit 1; }
command -v docker >/dev/null 2>&1 || { ko "docker manquant"; exit 1; }

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
[ "$NODE_MAJOR" -ge 20 ] && ok "node >= 20 ($(node -v))" || ko "node < 20 ($(node -v))"

JAVA_MAJOR=$(java -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')
[ "$JAVA_MAJOR" -ge 21 ] && ok "java >= 21 ($(java -version 2>&1 | head -1))" || ko "java < 21 — JDK 21 requis pour ledger-service"

docker compose version >/dev/null 2>&1 && ok "docker compose OK" || ko "docker compose manquant"

[ -f .env ] || { ko ".env manquant — exécuter : cp .env.example .env"; }
[ -f package-lock.json ] && ok "package-lock.json présent" || ko "npm install jamais exécuté"

if [ "$FAIL" -eq 0 ]; then
  echo; echo "✅ Environnement GOURSI prêt — make setup pour aller plus loin."
else
  echo; echo "❌ Environnement incomplet — corriger les points ci-dessus."
  exit 1
fi
