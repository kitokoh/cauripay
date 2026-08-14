// Exemple d'intégration Node.js minimal (GOURSI-051c / critère DX < 10 min).
// Exécuter : node examples/quickstart.mjs (ou compiler le TS via ts-node)
import { GoursiClient } from '../src/client';

const goursi = new GoursiClient({
  apiKey: process.env.GOURSI_API_KEY ?? 'sk_test_demo',
  baseUrl: process.env.GOURSI_BASE_URL ?? 'http://localhost:3080',
  webhookSecret: process.env.GOURSI_WEBHOOK_SECRET ?? 'whsec_demo',
});

const payment = await goursi.payments.initiate(
  {
    amount: '25000',
    to: '+23566000001',
    description: 'Abonnement Premium',
    metadata: { customer: 'demo' },
  },
  `cmd-${Date.now()}`,
);

console.log('Paiement créé :', payment.id, payment.status, payment.checkoutUrl ?? '');

// Vérification de signature (simulée — voir test/webhooks.test.ts pour le flux réel)
const signature = process.env.GOURSI_WEBHOOK_SIGNATURE;
if (signature) {
  const rawBody = JSON.stringify({ id: payment.id, event: 'payment.succeeded' });
  console.log('Signature valide :', goursi.webhooks.verifySignature(signature, rawBody));
}
