/**
 * Simulateur USSD (GOURSI-027d — DoD #8) : envoie { sessionId, msisdn, input }
 * à POST /api/v1/ussd/session et affiche les réponses { text, endOfSession }.
 *
 * Usage :
 *   npm run simulator                  # session interactive (REPL)
 *   npm run simulator -- --scripted    # 4 opérations de bout en bout (rapport)
 *   --url http://localhost:3060        # base URL (défaut env USSD_URL ou http://localhost:3060)
 *
 * Exemple :
 *   USSD_URL=http://localhost:3060 npx ts-node scripts/ussd-simulator.ts --scripted
 */

/* eslint-disable no-console */

import * as readline from 'node:readline';

const BASE_URL = process.env.USSD_URL ?? parseArg('--url') ?? 'http://localhost:3060';
const MSISDN = '+23566000001';
const ENDPOINT = `${BASE_URL}/api/v1/ussd/session`;

interface SessionResponse {
  text: string;
  endOfSession: boolean;
}

function parseArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

async function send(sessionId: string, input: string): Promise<SessionResponse> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, msisdn: MSISDN, input }),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: SessionResponse; code?: string; message?: string };
  if (!res.ok || !body.data) {
    throw new Error(`HTTP ${res.status} — ${body.code ?? ''} ${body.message ?? ''}`.trim());
  }
  return body.data;
}

async function runFlow(sessionId: string, label: string, inputs: string[], expectEnd: boolean): Promise<void> {
  let ended = false;
  try {
    for (const input of inputs) {
      const resp = await send(sessionId, input);
      console.log(`\n[${label}] entrée: ${input === '' ? '(vide)' : input}`);
      console.log(resp.text);
      if (resp.endOfSession) {
        console.log('— session terminée —');
        ended = true;
        break;
      }
    }
  } catch (e) {
    console.log(`✗ ${label}: ${(e as Error).message}`);
    return;
  }
  console.log(`${ended === expectEnd ? '✔' : '✘'} ${label}`);
}

async function scripted(): Promise<void> {
  console.log(`Simulateur USSD — scripted (4 opérations) → ${ENDPOINT}\n`);

  // 1) Solde : fr → 1
  await runFlow('sim-balance', 'Solde', ['fr', '1'], true);
  // 2) Envoi : fr → 2 → numéro → montant → confirmer
  await runFlow('sim-transfer', 'Envoi', ['fr', '2', '66000002', '10000', '1'], true);
  // 3) Facture : fr → 3 → SNE → montant → confirmer
  await runFlow('sim-bill', 'Facture', ['fr', '3', '1', '5000', '1'], true);
  // 4) Retrait : fr → 4 → OTP → confirmer
  await runFlow('sim-withdraw', 'Retrait', ['fr', '4', '123456', '1'], true);
}

async function interactive(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const sessionId = `sim-${Date.now()}`;
  console.log(`Session interactive ${sessionId} → ${ENDPOINT} (Ctrl+C pour quitter)\n`);

  const prompt = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  let input = '';
  while (true) {
    const resp = await send(sessionId, input);
    console.log(`\n${resp.text}\n`);
    if (resp.endOfSession) {
      console.log('— session terminée —');
      rl.close();
      return;
    }
    input = await prompt('saisie> ');
  }
}

async function main(): Promise<void> {
  if (process.argv.includes('--scripted')) {
    await scripted();
  } else {
    await interactive();
  }
}

void main();
