// Récepteur de webhook minimal (Node/Express) — GOURSI-051c.
// Vérifie la signature HMAC, répond 200 vite, traite hors-requête, déduplique par event.id.
//
// Démarrage : npm install express && node server.mjs
// Test : POST /webhook avec header X-CauriPay-Signature et corps JSON.

import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

const app = express();
const PORT = process.env.PORT ?? 8080;
const WEBHOOK_SECRET = process.env.GOURSI_WEBHOOK_SECRET ?? 'whsec_demo';
const TOLERANCE_SECONDS = 300;

app.use(express.json({ limit: '1mb' }));

// Déduplication (ADR-005) : en mémoire ici — utiliser Redis/table en production.
const seen = new Set();

function verifySignature(signature, rawBody) {
  if (!signature) return false;
  const parts = signature.split(',').map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);
  if (!timestamp || !v1) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post('/webhook', (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-cauripay-signature'];

  if (!verifySignature(signature, rawBody)) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }

  const event = req.body;
  // Idempotence de traitement (ADR-005) : un événement n'est traité qu'une fois.
  if (seen.has(event.id)) {
    return res.status(200).json({ ok: true, duplicate: true });
  }
  seen.add(event.id);

  // Traitement asynchrone (hors-requête) : la réponse 200 ne doit pas attendre le métier.
  setImmediate(() => {
    console.log(`[webhook] ${event.event} ${event.id} — traitement…`);
    // → ici : maj commande, notification, exports…
  });

  res.status(200).json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ status: 'UP' }));

app.listen(PORT, () => console.log(`Webhook receiver sur :${PORT}`));
