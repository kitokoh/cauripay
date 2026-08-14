# Test du récepteur de webhook (bout en bout)

```bash
cd examples/node-webhook-receiver
npm install
GOURSI_WEBHOOK_SECRET=whsec_demo node server.mjs
```

Dans un autre terminal :

```bash
# Générer une signature valide (timestamp actuel)
TS=$(date +%s)
PAYLOAD='{"id":"evt_1","event":"payment.succeeded","amount":"25000"}'
SIG="t=${TS},v1=$(printf '%s.%s' "$TS" "$PAYLOAD" | openssl dgst -sha256 -hmac 'whsec_demo' | awk '{print $2}')"

curl -s -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-CauriPay-Signature: ${SIG}" \
  -d "$PAYLOAD"
# → {"ok":true}

# Signature invalide → 401
curl -s -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-CauriPay-Signature: t=1,v1=bad" \
  -d '{"id":"x"}'
# → {"error":"INVALID_SIGNATURE"}
```
