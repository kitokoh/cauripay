# goursi_flutter

SDK officiel **GOURSI (CauriPay)** pour Flutter : paiements, webhooks signés, sandbox.

> Montants : **toujours en String (unités mineures)** — jamais de double (spec §8.2).

## Installation

```yaml
dependencies:
  goursi_flutter: ^0.1.0
```

## Démarrage rapide

```dart
import 'package:goursi_flutter/goursi_flutter.dart';

final goursi = GoursiClient(apiKey: 'sk_test_…');

// 1. Créer un paiement (idempotent)
final payment = await goursi.payments.initiate(InitiatePaymentParams(
  amount: '25000',                       // unités mineures, string obligatoire
  to: '+23566000001',
  idempotencyKey: 'cmd-001',
));

// 2. Vérifier un webhook (HMAC-SHA256, anti-replay ±5 min)
final verifier = WebhookVerifier(secret: 'whsec_…');
final valid = verifier.verifySignature(signature, rawPayload);
```

## API

| Méthode | Description |
|---|---|
| `payments.initiate(params)` | Crée un paiement (header `Idempotency-Key`) |
| `payments.get(paymentId)` | Détail d'un paiement |
| `payments.cancel(paymentId)` | Annule un paiement (PENDING) |
| `WebhookVerifier.verifySignature(sig, payload)` | Vérifie HMAC + anti-replay |

## Erreurs

- `GoursiApiException` : code API stable (`INSUFFICIENT_FUNDS`, `RATE_LIMITED`…) + statut HTTP
- `GoursiNetworkException` : erreur réseau / timeout

## Publication pub.dev

Publication via `dart pub publish` avec analyse `flutter analyze` à 0 erreur (acceptance #259).
