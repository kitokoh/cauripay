# Sécurité

CauriPay manipule des paiements : la sécurité est une priorité absolue.

## Signaler une vulnérabilité

**Ne créez pas d'issue publique** pour un problème de sécurité.

Contact privé : envoyez un e-mail à l'adresse indiquée dans le profil du
mainteneur (kitokoh), avec :

- le composant et la version concernés,
- la description du problème,
- un scénario de repro minimal (sans données réelles),
- l'impact estimé.

Engagements du mainteneur :

- accusé de réception sous **48 h**,
- évaluation et plan de correctif sous **7 jours**,
- divulgation coordonnée une fois le correctif publié.

## Bonnes pratiques en vigueur dans le dépôt

- Les clés API `sk_*` / `pk_*` et les secrets webhook sont **stockés de façon
  sûre** (hachés/chiffrés) — jamais en clair.
- Les webhooks sortants sont **signés HMAC-SHA256** (`t=<ts>,v1=<hmac>`).
- Le SSRF est bloqué pour les URL de webhook (IP privées/locales interdites).
- `main` est protégé : PR obligatoire, CI verte, historique linéaire.
- La CI inclut un **scan de secrets (gitleaks)** et un **audit npm** des
  dépendances à risque élevé.
- Aucune donnée de carte (PAN) n'est stockée — posture PCI-DSS par conception.
