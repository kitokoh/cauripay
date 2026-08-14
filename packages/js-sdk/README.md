# @goursi/js-sdk

SDK officiel **GOURSI (CauriPay)** pour Node.js et navigateur : paiements, webhooks signés,
sandbox. Zéro dépendance runtime.

> Montants : **toujours en string (unités mineures)** — jamais de float (spec §8.2).

## Installation

```bash
npm install @goursi/js-sdk
```

## Démarrage rapide (< 10 min — critère DX)

```ts
import { GoursiClient } from '@goursi/js-sdk';

const goursi = new GoursiClient({
  apiKey: 'sk_test_xxx',            // Clés API → dashboard développeur
  webhookSecret: 'whsec_xxx',       // affiché une seule fois à la création du webhook
});

// 1. Créer un paiement (idempotent)
const payment = await goursi.payments.initiate(
  { amount: '25000', to: '+23566000001', description: 'Abonnement Premium' },
  'cmd-001',                        // Idempotency-Key : rejouer est sans effet
);
// → { id: 'pay_…', status: 'PENDING', checkoutUrl: '…' }

// 2. Vérifier un webhook reçu (HMAC-SHA256, anti-replay ±5 min)
const rawBody = '{"id":"pay_…","event":"payment.succeeded","amount":"25000"}';
const signature = req.headers['x-cauripay-signature'];
const isValid = goursi.webhooks.verifySignature(signature, rawBody);
```

## API

| Méthode | Description |
|---|---|
| `payments.initiate(params, idempotencyKey?)` | Crée un paiement |
| `payments.get(paymentId)` | Détail d'un paiement |
| `payments.cancel(paymentId)` | Annule un paiement (PENDING) |
| `webhooks.verifySignature(sig, payload, toleranceSeconds?)` | Vérifie HMAC + anti-replay |

## Gestion d'erreurs

Toutes les erreurs API lèvent `GoursiError` avec le code stable de l'API :

```ts
import { GoursiError, GoursiNetworkError } from '@goursi/js-sdk';

try {
  await goursi.payments.initiate({ amount: '99999999', to: 'x' });
} catch (e) {
  if (e instanceof GoursiError) console.log(e.code, e.status);   // INSUFFICIENT_FUNDS, 422
  if (e instanceof GoursiNetworkError) console.log('réseau/timeout');
}
```

## Publication npm

Le pipeline de publication (semver, provenance, tag `latest`/`beta`) est défini dans
`.github/workflows/publish-sdk.yml` (voir GOURSI-051a) — déclenché sur les tags `sdk-v*`.
