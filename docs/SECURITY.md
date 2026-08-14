# CauriPay — Sécurité (menaces & mitigations)

> Posture de sécurité du monorepo. Les exigences de la spec (§3.7, §8.5) sont
> traduites en menaces concrètes, mitigations et vérifications automatisées.

## Menace minimale (top 5)

| # | Menace | Impact | Mitigation | Vérification |
|---|---|---|---|---|
| 1 | **SSRF webhooks** (marchand pointe un endpoint interne) | Accès réseau interne | Validation URL webhooks : DNS public uniquement, blocage IP privées/réservées en prod | Tests unitaires du validateur + revue CI |
| 2 | **Injection SQL** | Exfiltration ledger | Requêtes préparées partout (JdbcTemplate/Prisma) — jamais de concaténation | Audit de code + tests |
| 3 | **Clés API au repos** | Vol de secrets marchands | Chiffrement AES-256-GCM des clés sk_ au repos, jamais en clair en base | Script d'audit SQL + gitleaks |
| 4 | **JWT falsifié / secret faible** | Usurpation | Keycloak RS256 (clés gérées par Keycloak), refus de démarrer sans JWT_PUBLIC_KEY/ISSUER en prod | Test d'intégration auth |
| 5 | **Empoisonnement du ledger** (écriture non atomique) | Corruption comptable | Seul ledger-service écrit les soldes ; transferAtomic = 4 écritures dans une transaction ; triggers d'immutabilité | Test 10 threads + audit SQL équilibre 0 écart |

## Secrets & clés internes

### Conventions
- **Jamais de secret réel committé** (règle absolue — pas même chiffré).
- Les secrets vivent dans l'environnement (variables d'env staging/prod, GitHub Secrets).
- `.env.example` / `.env.test.example` ne contiennent que des valeurs d'exemple non utilisables en prod.
- `INTERNAL_SERVICE_KEY` : clé partagée inter-services (header `X-Service-Key`), comparée en **temps constant** côté Java. **Obligatoire et unique par environnement** (staging ≠ prod).

### Rotation de INTERNAL_SERVICE_KEY
1. Générer une nouvelle valeur : `openssl rand -hex 32`.
2. Déployer la nouvelle valeur sur tous les services (rolling).
3. Tous les services acceptent la nouvelle valeur avant de révoquer l'ancienne
   (fenêtre de chevauchement : double valeurs acceptées pendant 15 min si besoin).
4. Révoquer l'ancienne valeur (retirer des variables d'env + rotation des secrets).
5. Vérifier : `gitleaks detect --no-git` → 0 finding ; les services répondent 401
   avec une ancienne clé.

### Génération / distribution
- Dev : valeur d'exemple dans `.env.example` (non utilisable en staging/prod).
- Staging/prod : générée à l'installation, stockée dans GitHub Secrets /
  le gestionnaire de secrets de la plateforme, injectée au déploiement.

## Vérifications automatisées (CI)
- **Gitleaks** : détection de secrets sur chaque PR (diff) + full history hebdo. 0 finding requis.
- **Trivy** : scan des images Docker (CRITICAL/HIGH bloquants) + scan fs.
- **npm audit** : seuil `high`, bloque le merge.
- **ZAP baseline** (GOURSI-QA3) : scan api-core, 0 finding critique en DoD.
- **Audits SQL** (GOURSI-QA2) : immutabilité du ledger + équilibre comptable = 0 écart.

## Webhooks sortants (business-service)
- Signature **HMAC-SHA256** (`t.<payload>`), anti-replay ±5 min.
- Retries avec backoff + DLQ ; rejeu manuel ; ping de test.
- Validation URL : HTTPS exigé en staging/prod, blocage IP privées (SSRF).
- Limite de création d'endpoints par marchand (anti-spam).

## Chiffrement au repos
- Clés API `sk_*` : chiffrées **AES-256-GCM** avec clé maîtresse issue de l'environnement
  (`ENCRYPTION_KEY`), nonce unique par enregistrement. Jamais de clair en base.
- Documents KYC : chiffrés AES-256 (kyc-service), accès restreint aux rôles COMPLIANCE_OFFICER.

## Runbooks
- Rotation de clé : voir ci-dessus.
- Incident ledger : geler les writes (wallet FROZEN), vérifier `ledger_verify`, reverser en mode dégradé.
- Contact : à définir (SRE/on-call).
