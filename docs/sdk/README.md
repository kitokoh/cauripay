# SDK & intégration — Guide développeur GOURSI

> Objectif : **premier paiement en moins de 10 minutes** (critère DX, spec §8.5 #8).
> Public : tout développeur inconnu du projet. Sources : `packages/js-sdk/`, `docs/API.md`.

---

## 1. Démarrage rapide (JS/TS) — < 10 min

```bash
npm install @goursi/js-sdk
```

```ts
import { GoursiClient } from '@goursi/js-sdk';

const goursi = new GoursiClient({
  apiKey: process.env.GOURSI_API_KEY,        // sk_test_… (dashboard développeur)
  webhookSecret: process.env.GOURSI_WEBHOOK_SECRET,
  baseUrl: process.env.GOURSI_BASE_URL,       // sandbox par défaut
});

// 1. Créer un paiement (idempotent)
const payment = await goursi.payments.initiate(
  { amount: '25000', to: '+23566000001', description: 'Abonnement Premium' },
  'cmd-001',
);
console.log(payment.checkoutUrl); // page de paiement hébergée

// 2. Vérifier un webhook (HMAC-SHA256, anti-replay ±5 min)
const valid = goursi.webhooks.verifySignature(
  req.headers['x-cauripay-signature'],
  rawBody,
);
```

## 2. Récepteur de webhook (Node/Express)

Voir `examples/node-webhook-receiver/` : serveur Express minimal qui vérifie la signature
HMAC, répond `200` rapidement, puis traite l'événement hors-requête (queue en mémoire).

Principes :
- Répondre `200` dès que la signature est valide (retries avec backoff côté GOURSI sinon).
- Traiter l'événement de façon **idempotente** (déduplication par `event.id`, ADR-005).
- Ne jamais faire confiance au corps sans signature vérifiée.

## 3. Référence rapide de l'API développeur

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/v1/payments` | Créer un paiement (header `Idempotency-Key` requis) |
| GET | `/api/v1/payments/:id` | Détail + statut |
| POST | `/api/v1/payments/:id/cancel` | Annuler (PENDING) |
| GET | `/api/v1/methods` · `/api/v1/currencies` | Registres |
| POST | `/api/v1/sandbox/payments/:id/approve|fail|expire` | Simulateur sandbox |

Enveloppe de réponse : `{ success, data, timestamp, requestId }`.
Erreurs : `{ success: false, error: { code, message, details } }` — codes stables
(`INSUFFICIENT_FUNDS`, `RATE_LIMITED`, `INVALID_KEY`, `IDEMPOTENCY_CONFLICT`…).

## 4. Webhooks

- Header : `X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>`
- Retries : 4 tentatives avec backoff (1 s, 5 s, 30 s, 5 min) + journal + rejeu manuel.
- Événements : `payment.created`, `payment.processing`, `payment.succeeded`,
  `payment.failed`, `payment.cancelled`, `payment.expired`.
- Le secret de signature n'est montré **qu'une seule fois** à la création du webhook.

## 5. Sandbox

- Clés `sk_test_*` : simulation fidèle (saisie téléphone → PIN → succès/échec).
- Endpoints sandbox pour forcer approve/fail/expire d'un paiement.
- **Aucun argent réel** — badge « Mode TEST » permanent.

## 6. Flutter (bientôt)

Le SDK Dart `goursi_flutter` (GOURSI-051b) suivra le même contrat : `GoursiClient`,
`payments.*`, `webhooks.verifySignature`. Lien ajouté ici à la publication.

---

_Liens : [packages/js-sdk/README.md](../../packages/js-sdk/README.md) ·
[examples/node-webhook-receiver](../../examples/node-webhook-receiver/) ·
[API.md](../API.md) · [REVUE-CONSTITUTION.md](../REVUE-CONSTITUTION.md)_
