/**
 * Exemple bout en bout : intégration minimale GOURSI (Node/Express).
 * 1) Initie un paiement sandbox
 * 2) Reçoit et vérifie un webhook signé
 *
 * Usage :
 *   cp .env.example .env  # renseigner GOURSI_API_KEY + WEBHOOK_SECRET
 *   npm install
 *   node server.js
 */
import express from 'express';
import { GoursiClient } from '@goursi/js-sdk';

const apiKey = process.env.GOURSI_API_KEY ?? 'sk_test_xxxx';
const webhookSecret = process.env.WEBHOOK_SECRET ?? 'change-me';

const client = new GoursiClient({ apiKey, sandbox: true });
const app = express();
const port = Number(process.env.PORT ?? 4000);

// Récepteur de webhook signé
app.post('/webhooks', express.text({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-goursi-signature'];
  if (
    typeof signature !== 'string' ||
    !client.verifySignature(webhookSecret, signature, req.body)
  ) {
    return res.status(401).json({ error: 'signature invalide' });
  }
  const event = JSON.parse(req.body);
  console.log(`✓ Webhook reçu : ${event.type} — ${JSON.stringify(event.data)}`);
  res.status(200).end();
});

app.get('/pay', async (_req, res) => {
  const payment = await client.paymentsInitiate({
    amountMinor: 2500,
    currency: 'XAF',
    to: '+23566000001',
    idempotencyKey: `cmd-${Date.now()}`,
  });
  res.json({ payment, note: 'Ouvrez checkoutUrl pour payer (sandbox, PIN 0000 = échec)' });
});

app.listen(port, () => {
  console.log(`Exemple GOURSI sur http://localhost:${port}`);
  console.log(`→ POST /pay pour initier un paiement`);
  console.log(`→ POST /webhooks pour recevoir les notifications signées`);
});
