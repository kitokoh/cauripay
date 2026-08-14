# SECRETS — Conventions de gestion des secrets & clés internes (GOURSI-SEC1)

## Principes

1. **Aucun secret committé** — gitleaks CI bloque (`security-scan.yml`), 0 finding.
2. **Une clé interne par environnement** : `INTERNAL_SERVICE_KEY` (X-Service-Key) est partagée par
   tous les services d'UN MÊME environnement ; staging ≠ prod ; rotation sans downtime
   (double clé temporaire tolérée pendant 24 h — à formaliser dans le vault).
3. **Génération** : `openssl rand -hex 32` (≥ 32 octets) pour tout secret applicatif.
4. **Stockage** : `.env` local (jamais commité) ; GitHub Secrets / vault du registry en CI.

## X-Service-Key (appels inter-services)

- Header obligatoire : `X-Service-Key: <INTERNAL_SERVICE_KEY>`
- Comparaison **en temps constant** (`MessageDigest.isEqual` côté Java ; `crypto.timingSafeEqual` côté TS).
- **Jamais loggé** (ni en clair, ni partiellement).
- Whitelist health : `/health`, `/actuator/health`, `/actuator/prometheus` accessibles sans clé.

## Clés sensibles par service

| Secret | Service(s) | Rotation |
|---|---|---|
| `INTERNAL_SERVICE_KEY` | tous | trimestrielle / incident |
| `JWT_SECRET` | api-core (MPIN local) | semestrielle |
| `WEBHOOK_SIGNING_SECRET` | business, dev-gateway | par endpoint (rotation via API) |
| `KYC_ENCRYPTION_KEY` | kyc-service (AES-256) | annuelle / incident |
| `KEYCLOAK_CLIENT_SECRET` | web-admin, web-business | annuelle |
| Secrets PSP/rails (Wave, MTN…) | business-service | à la demande du provider |

## Incident

1. Révoquer la clé compromise immédiatement (tous les environnements qui l'utilisent).
2. Regénérer (`openssl rand -hex 32`), déployer, vérifier les healthchecks.
3. Auditer les logs (sans exposer la clé) ; documenter dans ce fichier.
