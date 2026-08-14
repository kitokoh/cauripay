# Sécurité — CauriPay / GOURSI

CauriPay traite de l'argent. La sécurité est une exigence, pas une option.

## Signaler une vulnérabilité

**Ne créez pas d'issue publique** pour une vulnérabilité exploitable.
Utilisez [GitHub Private Vulnerability Reporting](https://github.com/kitokoh/cauripay/security/advisories)
ou contactez le propriétaire du dépôt en privé.

Réponse sous 72 h ouvrées. Vulnérabilités confirmées → label `security` + `prio:critical`.

## Principes de sécurité (cf. docs/DESIGN-v2.md §7)

- **Montants : jamais de float** — `BigDecimal`/`Decimal`/string.
- **Le ledger est la seule source de vérité des soldes** — aucun service n'écrit de solde en base.
- **Écritures comptables immuables** : triggers PostgreSQL, `@Immutable`, `@Version` (verrou optimiste).
- **Idempotence partout** : `X-Idempotency-Key` obligatoire sur les écritures.
- **Inter-services** : `X-Service-Key` comparé en temps constant, jamais loggé.
- **Auth unique Keycloak RS256** — lockout, OTP, MPIN.
- **Webhooks** : HMAC-SHA256 (`t + "." + body`), anti-replay ±5 min, retries + DLQ.
- **Documents KYC** : chiffrés AES-256 au repos.
- **Secrets** : jamais committés (gitleaks CI), rotation documentée.

## Garde-fous automatisés (CI)

- `gitleaks` — scan des secrets sur chaque PR (0 finding requis).
- `npm audit --audit-level=high` — vulnérabilités high bloquantes.
- Trivy (CRITICAL/HIGH) — scan des images de conteneurs (quand les images existent).
- Vérification : aucun `.env` committé.

## Liste rouge (extrait DESIGN-v2 §9)

1. Montants en float/double · 2. Écriture de solde hors ledger · 3. Transaction d'écriture non SERIALIZABLE
4. UPDATE/DELETE sur une `LedgerEntry` ou un `AuditLog` · 5. Transaction sans clé d'idempotence
6. Exception avalée silencieusement · 7. `@Autowired` par champ (Java) · 8. Secret committé / clé loggée
9. Migration Flyway modifiée après application (nouvelle V7+ pour tout correctif)
