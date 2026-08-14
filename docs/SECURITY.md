# CauriPay — Sécurité & gestion des secrets (GOURSI-SEC1)

## 1. Principes

1. **Aucun secret en clair** dans le code, les logs, les commits, les images ou les fixtures.
   `gitleaks` tourne en CI (workflow `security.yml`) et bloque toute fuite.
2. **Tout secret passe par l'environnement** : `.env` (local, gitignoré), secrets GitHub
   (CI), variables d'environnement (conteneurs, staging). `.env.example` documente les
   variables **sans** valeur sensible.
3. **Fail-fast** : un service refuse de démarrer si un secret requis est absent
   (validation `make validate-env` côté TS, `application.yml` côté Java).

## 2. Clés internes inter-services (X-Service-Key)

Les communications HTTP internes entre services sont authentifiées par l'en-tête
`X-Service-Key` (secret partagé, un par service consommateur).

- **Convention** : `X-Service-Key: <service>.<secret>` où `<secret>` est un hex de 32 octets.
- **Génération** : `openssl rand -hex 32` (jamais de secret dev en staging/prod).
- **Vérification** : comparaison **en temps constant** (`MessageDigest.isEqual` en Java,
  `timingSafeEqual` en Node) — jamais `==`/`===` sur des secrets.
- **Rotations** : planifiées (tous les 90 jours) et immédiates en cas de suspicion de fuite ;
  le changement de clé ne nécessite pas d'arrêt (relu à chaque requête).
- **Variables** : `LEDGER_SERVICE_KEY`, `API_CORE_SERVICE_KEY`, `KYC_SERVICE_KEY`, etc.

## 3. Mot de passe & clés utilisateur

- Mots de passe : **bcrypt (coût 12)** — cf. GOURSI-021b ; jamais de stockage en clair.
- JWT : **RS256** signé par Keycloak (realm `goursi`) ; `api-core` valide via JWKS.
- Clés API marchand (business-service, futur) : stockage **haché**, comparaison en temps
  constant, jamais renvoyées en clair après création.

## 4. Données sensibles au repos

- Documents KYC : chiffrés **AES-256** avant stockage (clé par environnement).
- Aucun PAN de carte (posture PCI-DSS par conception) ; la méthode `card` reste simulée
  tant qu'aucun PSP cartes n'est branché.

## 5. Audit & réaction

- Journal d'audit des actions sensibles (voir GOURSI-070 / épic journal d'audit).
- En cas de fuite : rotation immédiate des secrets concernés, revue des logs d'accès,
  post-mortem. Signaler via une issue `security` (template bug).

## 6. Secret scanning local

```bash
# Vérifier avant chaque push
gitleaks detect --source . -v
```
