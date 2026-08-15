# CauriPay — Référence API v1 (contrat)

> Version : 0.1 (sandbox) · Base URL : `http://localhost:4000`
> Tous les corps sont en JSON. Montants en **unités mineures entières** (ISO 4217) : XOF 25 000 = 25 000 (0 décimale) ; EUR 25,00 = 2500 (2 décimales).

## 1. Authentification

### API développeur (`/api/v1/*`)
Header `Authorization: Bearer <clé>`. Les clés préfixées `sk_` (secret) ont tous les droits ; les clés `pk_` (publiable) sont limitées en lecture et création de paiement (pas de sandbox, pas de cancel).
- `sk_test_…` / `pk_test_…` → mode test (simulateur).
- `sk_live_…` / `pk_live_…` → réservé v0.2 ; 403 tant que `live_enabled = 0`.

### API marchand (`/api/*`) — dashboard
Header `Authorization: Bearer <jwt>` obtenu via `/api/auth/login` ou `/api/auth/register`.

## 2. API marchand (dashboard)

### POST /api/auth/register
```json
{ "name": "Awa Diallo", "company": "Kora Labs", "email": "awa@kora.app", "password": "••••••••" }
```
→ `201` `{ "token": "<jwt>", "merchant": {…}, "keys": { "publishable_test", "secret_test", "publishable_live", "secret_live", "webhook_secret_test", "webhook_secret_live" } }`
> ⚠️ Les clés `sk_` sont **hachées au repos** (jamais stockées en clair) : la valeur en clair n'est renvoyée **qu'une seule fois**, ici et lors des rotations. Copiez-les immédiatement (modèle Stripe).
Erreurs : `400` champs manquants/invalides, `409` email déjà utilisé.

### POST /api/auth/login
`{ "email", "password" }` → `200` `{ token, merchant }` · `401` identifiants invalides.

### GET /api/auth/me → `{ merchant }` (id, name, company, email, created_at)

### PATCH /api/auth/me
`{ "name"?, "company"?, "password"?, "password_current"? }` → `{ merchant }` · `400` si `password_current` absent quand nouveau mot de passe.

### Paiements & simulateur (dashboard, session JWT)
Le dashboard utilise des endpoints dédiés (JWT) — les clés API restent pour vos intégrations :
- `GET /api/payments?status=&limit=&before=` → `{ payments, has_more }`
- `GET /api/payments/:id` → `{ payment }`
- `POST /api/payments` → crée un paiement de **test** `{ payment, duplicate }`
- `POST /api/payments/:id/cancel` → `{ payment }`
- `POST /api/sandbox/payments/:id/approve|fail|expire` → simulateur (équivalent JWT du sandbox v1)

### GET /api/keys
→ `200`
```json
{ "keys": {
    "publishable_test": "pk_test_…", "publishable_live": "pk_live_…",
    "webhook_secret_test": "whsec_test_••••••••wxyz", "webhook_secret_live": "…",
    "secret_test_present": true, "secret_live_present": true
}}
```
Les clés `sk_` ne sont **jamais renvoyées** par cet endpoint (hachées au repos) : seule leur présence est indiquée. Les secrets webhook sont **masqués** (en clair une seule fois à la création d'un webhook).

### POST /api/keys/rotate
`{ "mode": "test"|"live", "scope": "publishable"|"secret"|"webhook" }` → `200` `{ "key": "<nouvelle valeur en clair (une seule fois)>" }`
La clé correspondante est régénérée ; l'ancienne cesse d'être valide immédiatement. **Conservez la réponse** : c'est la seule fois où la nouvelle valeur est visible.

### GET /api/stats
→ `200`
```json
{ "totals": { "count": 42, "volume_minor": 1_250_000, "success_rate": 0.88, "currency": "XOF" },
  "by_day": [ { "date": "2026-08-11", "count": 5, "volume_minor": 120000, "succeeded": 4 } ],
  "recent": [ "<payment>", "…" ] }
```

## 3. Webhooks (configuration marchand)

### GET /api/webhooks → `[ { "id", "url", "events": ["*"], "mode": "test", "secret": "whsec_test_…", "active": 1, "created_at" } ]`

### POST /api/webhooks
`{ "url": "https://exemple.com/hooks", "events": ["*"] | ["payment.succeeded", "payment.failed"], "mode": "test" }`
→ `201` webhook complet (secret inclus, une seule fois). La signature HMAC utilise ce secret.
- **Limite** : 10 webhooks max par compte et par mode (défaut, configurable) → `400 webhook_limit_exceeded`.
- **Anti-SSRF** : en production, les URL vers des IP privées/locales (127.0.0.1, RFC 1918, link-local…) sont **refusées**, et `https` est exigé. En dev, `ALLOW_PRIVATE_WEBHOOKS=true` / `ALLOW_INSECURE_WEBHOOKS=true` pour les tunnels locaux.

### PATCH /api/webhooks/:id `{ "active": 0|1 }` → `{ webhook }`
### DELETE /api/webhooks/:id → `{ "ok": true }`

### GET /api/webhooks/:id/attempts
→ `[ { "id", "event_type", "payload": {…}, "signature", "status": "delivered"|"failed", "http_status", "attempts", "created_at" } ]`

### POST /api/webhooks/:id/replay
Rejoue le dernier événement reçu par ce webhook → `{ "ok": true, "attempt_id" }`

### POST /api/webhooks/:id/test
Envoie un ping `webhook.test` → `{ "ok": true }`

## 4. API développeur — Paiements (`/api/v1`)

### POST /api/v1/payments
Body :
```json
{
  "amount_minor": 25000,
  "currency": "XOF",
  "methods": ["orange_money", "mtn_momo", "wave", "card", "international"],
  "description": "Abonnement Premium — 1 mois",
  "metadata": { "user_id": "u_123", "plan": "premium" },
  "redirect_url": "https://app.ma.com/succes",
  "idempotency_key": "cmd-2026-08-11-001"
}
```
`methods` optionnel (défaut : tous). Header `Idempotency-Key` accepté en alternative à `idempotency_key` dans le body.
→ `201`
```json
{ "payment": {
    "id": "pay_a1b2…", "status": "pending", "amount_minor": 25000, "currency": "XOF",
    "methods": ["orange_money", …], "provider": null, "provider_ref": null,
    "description": "…", "metadata": {…}, "redirect_url": "…",
    "mode": "test", "checkout_url": "http://localhost:4000/checkout/ck_…",
    "idempotency_key": "…", "created_at": "…", "updated_at": "…",
    "timeline": [ { "type": "payment.created", "created_at": "…" } ]
}}
```
Erreurs : `400` montant ≤ 0 / devise inconnue / méthode inconnue · `409` idempotency_key déjà utilisée (renvoie le paiement existant, statut 200-voir → `200` avec `"duplicate": true`).

### GET /api/v1/payments?status=&limit=25&before=<payment_id>
→ `200` `{ "payments": [ … ], "has_more": false }` (trié par date desc, curseur `before`).

### GET /api/v1/payments/:id
→ `200` `{ "payment": { …complet, timeline, phone?, provider?, provider_ref? } }` · `404` inconnu ou autre marchand.

### POST /api/v1/payments/:id/cancel
(pending uniquement) → `200` `{ payment }` (status `cancelled`) · `409` mauvais état.

## 5. Simulateur sandbox (`sk_test_*` uniquement — 403 sinon)

| Endpoint | Effet |
|---|---|
| `POST /api/v1/sandbox/payments/:id/approve` | `pending|processing → succeeded` (ref `SIM-xxxx`), émet `payment.processing` puis `payment.succeeded` |
| `POST /api/v1/sandbox/payments/:id/fail` `{ "reason"?: "insufficient_funds"\|"provider_error"\|"timeout" }` | `pending|processing → failed`, émet `payment.failed` |
| `POST /api/v1/sandbox/payments/:id/expire` | `pending|processing → expired`, émet `payment.expired` |

→ `200` `{ "payment": { … } }` · `409` transition invalide.

## 6. Registres publics

### GET /api/v1/methods
```json
[ { "id": "orange_money", "label": "Orange Money", "kind": "mobile_money",
    "countries": ["CI","SN","ML","BF","NE","CM","GA","CG","CD"], "logo_emoji": "🟠" }, … ]
```
Autres : `mtn_momo` (🟡), `moov_money` (🔵), `wave` (🌊), `card` (💳 Visa/Mastercard), `international` (🌍 virement/SEPA/cartes intl simulés).

### GET /api/v1/currencies
```json
[ { "code": "XOF", "name": "Franc CFA (UEMOA)", "decimals": 0, "countries": ["CI","SN",…] }, … ]
```
XOF (0), XAF (0), GNF (0), CDF (0), NGN (2), GHS (2), EUR (2), USD (2).

## 7. Événements & signature webhook

Types : `payment.created`, `payment.processing`, `payment.succeeded`, `payment.failed`, `payment.cancelled`, `payment.expired`, `webhook.test`.

Payload envoyé :
```json
{ "event": "payment.succeeded", "data": { "payment": { … } }, "created_at": "…" }
```
Header : `X-CauriPay-Signature: t=1789123456,v1=<hex>` où `<hex>` = HMAC-SHA256(secret, `t + "." + corps brut`). Vérif : fenêtre ±5 min, comparaison à temps constant.

## 8. Checkout public (aucune auth)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/checkout/:token` | — | HTML (page paiement) |
| POST | `/checkout/:token/initiate` | `{ "phone": "+2250708091011" }` | `{ "step": "pin", "payment": { id, amount_minor, currency, provider, status } }` |
| POST | `/checkout/:token/confirm` | `{ "pin": "1234" }` | `{ "status": "processing" }` (succès auto ~1,5 s ; PIN `0000` → échec) |
| POST | `/checkout/:token/initiate` | — | `429 checkout_blocked` après trop d'échecs de PIN (anti-brute-force) |
| GET | `/checkout/:token/status` | — | `{ "status", "amount_minor", "currency", "description", "provider_label" }` (polling) |

## 9. Codes d'erreur normalisés

```json
{ "error": { "type": "invalid_request_error"|"authentication_error"|"permission_error"|"rate_limit_error"|"api_error",
             "code": "invalid_amount"|"unknown_currency"|"unknown_method"|"idempotency_conflict"|"invalid_state"|"not_found"|"unauthorized"|"live_not_enabled"|"webhook_limit_exceeded"|"invalid_webhook_url"|"checkout_blocked",
             "message": "…" } }
```
Statuts : `400` requête invalide · `401` clé/jeton manquant ou invalide · `403` permission (sk requis, live non activé) · `404` introuvable · `409` conflit d'état/idempotence · `429` rate limit **par clé API** sur `/api/v1` (défaut 1 000 req/min) ou blocage anti-brute-force checkout · `5xx` erreur interne.

### Cas limites
- **`429`** : réessayer avec backoff (`Retry-After`). Le quota est **par clé API** (pas par IP) sur `/api/v1`.
- **`409 duplicate`** : renvoie le paiement existant avec `"duplicate": true` (200) — voir §4. Un conflit concurrent sur la même `Idempotency-Key` ne produit **jamais** de 500.
- **Timeouts** : un webhook sortant est abandonné après 8 s ; 4 tentatives avec backoff (1 s / 5 s / 30 s / 5 min) ; les retries **survivent au redémarrage** du serveur.
- **Idempotence** : les clés `Idempotency-Key` sont garanties uniques par marchand ; les doublons simultanés retournent le même paiement.
