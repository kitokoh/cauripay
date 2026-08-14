#!/usr/bin/env node
/**
 * CauriPay — Déclaration idempotente de la topologie RabbitMQ.
 *
 * Exécuté en init-container (ou au démarrage) : crée les exchanges, queues,
 * bindings et DLQ s'ils n'existent pas. Peut être relancé sans risque.
 *
 * Topologie (spec §6) :
 *   exchanges : financial.events (topic), kyc.events (topic), aml.events (topic),
 *               notification.events (fanout), audit.events (fanout)
 */

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

const EXCHANGES = [
  { name: 'financial.events', type: 'topic', durable: true },
  { name: 'kyc.events', type: 'topic', durable: true },
  { name: 'aml.events', type: 'topic', durable: true },
  { name: 'notification.events', type: 'fanout', durable: true },
  { name: 'audit.events', type: 'fanout', durable: true },
];

// { queue, exchange, routingKey }
const BINDINGS = [
  // Notifications — consomme tous les événements utiles (fanout)
  { queue: 'q.notification.all', exchange: 'notification.events', routingKey: '' },
  // Reconciliation — événements financiers (topic, routing financial.*)
  { queue: 'q.reconciliation.financial', exchange: 'financial.events', routingKey: 'financial.*' },
  // AML — événements KYC (validation → scoring)
  { queue: 'q.aml.created', exchange: 'kyc.events', routingKey: 'kyc.submitted' },
  // Audit — journal (fanout)
  { queue: 'q.audit.insert', exchange: 'audit.events', routingKey: '' },
  // KYC — approbation/complétion (topic)
  { queue: 'q.kyc.approved', exchange: 'kyc.events', routingKey: 'kyc.approved' },
];

async function main() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  // Exchanges
  for (const ex of EXCHANGES) {
    await ch.assertExchange(ex.name, ex.type, { durable: ex.durable });
    console.log(`✓ exchange ${ex.name} (${ex.type})`);
  }

  // Queues + DLQ + bindings
  for (const b of BINDINGS) {
    await ch.assertQueue(b.queue, { durable: true });
    await ch.assertQueue(`${b.queue}.dlq`, { durable: true });
    // DLQ : redirige les messages rejetés/expirés
    await ch.bindQueue(`${b.queue}.dlq`, b.exchange, `${b.routingKey}.dlq`);
    await ch.bindQueue(b.queue, b.exchange, b.routingKey);
    console.log(`✓ queue ${b.queue} ↔ ${b.exchange} [${b.routingKey}]`);
  }

  await conn.close();
  console.log('Topologie RabbitMQ déclarée avec succès.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur de déclaration de la topologie RabbitMQ :', err.message);
  process.exit(1);
});
