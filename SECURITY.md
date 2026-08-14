# Sécurité — CauriPay

## Statut

CauriPay v0.1 est un **MVP sandbox** : aucune transaction réelle, aucun argent réel transite.
Le mode live est verrouillé (`live_enabled = 0`) en attendant les connecteurs PSP et le KYC.

## Signaler une vulnérabilité

**Ne créez pas d'issue publique** pour un problème de sécurité (clés, secrets, injection,
SSRF, données personnelles…).

- Écrivez au mainteneur via un canal privé (email/slack du projet) ou ouvrez un
  [advisory GitHub privé](https://github.com/kitokoh/cauripay/security/advisories/new).
- Incluez : composant, version, description, repro minimal, impact estimé.
- Engagement : accusé de réception sous 48 h, correctif prioritaire (label `security`),
  aucune divulgation publique avant le correctif.

## Règles pour les contributeurs

- **Jamais de secret dans le dépôt** : clés API, tokens, mots de passe, DATABASE_PATH…
  (`.env` est git-ignoré ; gitleaks scanne chaque PR).
- Les clés `sk_` ne sont **jamais stockées en clair** : hash côté serveur, valeur en clair
  renvoyée une seule fois (création/rotation).
- Ne pas afficher de clé secrète dans les logs, les réponses API publiques, ou le dashboard
  (masquage uniquement).
- Webhooks sortants : URL validées (anti-SSRF en production), signature HMAC-SHA256,
  anti-replay ±5 min.

## Posture produit

- **Aucun PAN (numéro de carte) stocké** — la méthode `card` est simulée ; posture PCI-DSS par conception.
- Montants en unités mineures entières ; jamais de virgule flottante.
- Voir [docs/DESIGN.md §11](docs/DESIGN.md) pour la matrice des menaces complète.
