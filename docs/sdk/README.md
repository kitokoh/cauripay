# GOURSI SDK — Démarrage rapide

> **Objectif DX** : un développeur inconnu intègre un paiement en **moins de 10 minutes**.

## 1. Créer une clé sandbox

```bash
curl -X POST https://sandbox.api.goursi.dev/v1/dev/api-keys \
  -H "Content-Type: application/json" \
  -d '{"developerId":"dev-123","mode":"sandbox","prefix":"sk_"}'
# → { "key": { "id": "key_...", "mode": "sandbox" }, "secret": "sk_..." }
```

> ⚠️ Le secret n'est affiché **qu'une seule fois** — copiez-le.

## 2. Installer le SDK

```bash
npm install @goursi/js-sdk
```

## 3. Initier un paiement (Node)

```ts
import { GoursiClient } from '@goursi/js-sdk';

const client = new GoursiClient({
  apiKey: 'sk_test_xxxx',
  sandbox: true, // AUCUN appel réel
});

const payment = await client.paymentsInitiate({
  amountMinor: 2500, // 25,00 FCFA (unités mineures)
  currency: 'XAF',
  to: '+23566000001',
  idempotencyKey: 'cmd-001', // rejeu sûr
});

console.log(payment.checkoutUrl); // → page de paiement hébergée
```

## 4. Vérifier un webhook (Express)

```ts
import express from 'express';
import { GoursiClient } from '@goursi/js-sdk';

const app = express();
app.post('/webhooks', express.text({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-goursi-signature'] as string;
  const ok = new GoursiClient({ apiKey: 'sk_test_xxxx', sandbox: true }).verifySignature(
    WEBHOOK_SECRET,
    signature,
    req.body,
  );
  if (!ok) return res.status(401).end(); // signature invalide / replay
  const event = JSON.parse(req.body);
  if (event.type === 'payment.succeeded') {
    // créditer la commande…
  }
  res.status(200).end();
});
```

**Header** : `X-Goursi-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.<payload>")>`
**Anti-replay** : fenêtre ±5 min.

## 5. Sandbox (developer-gateway)

| Méthode | Route                               | Effet                            |
| ------- | ----------------------------------- | -------------------------------- |
| POST    | `/dev/payments`                     | Initie un paiement sandbox       |
| POST    | `/dev/sandbox/payments/:id/approve` | pending → processing → succeeded |
| POST    | `/dev/sandbox/payments/:id/fail`    | processing → failed              |
| POST    | `/dev/sandbox/payments/:id/expire`  | processing → expired             |

Le sandbox est **isolé** : aucune donnée de prod, aucun appel sortant réel.

## Références

- [API-v2.md](../API-v2.md) — référence publique api-core
- [API-ledger.md](../API-ledger.md) — contrat interne ledger
- `examples/node-express/` — récepteur de webhook complet
