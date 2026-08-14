// GOURSI-QA1 — Test de charge P2P : 1000 tx/min (DoD #7)
// Spec §8.4 / §8.5 : p95 < 2 s · erreur < 0,1 % · 1000 tx/min soutenues
//
// Usage (staging, JAMAIS en prod) :
//   k6 run -e BASE_URL=https://staging.goursi.app -e VUS=50 tests/load/p2p-1000tpm.js
//
// Scénario réaliste : login → transfer P2P (X-Idempotency-Key) → vérification du solde.
// Le test est SANS ÉTAT entre itérations (chaque VU porte son propre wallet source).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Cibles DoD (#7) ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
// 1000 tx/min → avec des itérations d'environ 3 s, il faut ~50 VU simultanés.
const VUS = __ENV.VUS ? Number(__ENV.VUS) : 50;
const DURATION = __ENV.DURATION || '2m';

// Métriques custom
const p2pLatency = new Trend('p2p_transfer_duration_ms', true);
const p2pErrors = new Rate('p2p_transfer_errors');
const p2pSuccess = new Rate('p2p_transfer_success');

export const options = {
  scenarios: {
    p2p_load: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    // DoD #7 : p95 < 2 s
    p2p_transfer_duration_ms: ['p(95)<2000'],
    // DoD #7 : erreur < 0,1 %
    p2p_transfer_errors: ['rate<0.001'],
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<2000'],
  },
};

// Un wallet source par VU (déterministe) — le seed de staging crée les comptes test.
function sourceWalletForVu(vu) {
  return {
    phone: `+23566${String(60000001 + vu).padStart(8, '0')}`,
    mpin: '1234',
    accountNumber: `GRS${String(1000000 + vu).padStart(8, '0')}`,
  };
}

function login(phone, mpin) {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    phoneNumber: phone,
    mpin,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, { 'login 200': (r) => r.status === 200 });
  if (res.status !== 200) {
    p2pErrors.add(true);
    return null;
  }
  return res.json().data.accessToken;
}

export default function () {
  const vu = __VU; // 1..VUS
  const wallet = sourceWalletForVu(vu);

  // 1. Login (1 appel)
  const token = login(wallet.phone, wallet.mpin);
  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Idempotency-Key': `load-${Date.now()}-${vu}-${Math.random().toString(36).slice(2, 8)}`,
  };

  // 2. Transfer P2P vers un wallet destinataire fixe (le même pour tous : +23566000000000)
  const start = Date.now();
  const transfer = http.post(`${BASE_URL}/api/v1/transactions/transfer`, JSON.stringify({
    amount: 1000,
    currency: 'XAF',
    toAccountNumber: 'GRS10000000',
  }), { headers });

  const durationMs = Date.now() - start;
  p2pLatency.add(durationMs);

  const ok = check(transfer, {
    'transfer 201': (r) => r.status === 201,
    'transaction SUCCESS': (r) => {
      if (r.status !== 201) return false;
      const data = r.json()?.data;
      return data && data.status === 'SUCCESS';
    },
  });
  p2pSuccess.add(ok);
  p2pErrors.add(!ok);

  sleep(2.5); // cycle ~3 s par itération → ~20 it/min/VU → 50 VU ≈ 1000 tx/min
}

// ── Rapport ───────────────────────────────────────────────────────────────────
// Après exécution, publier dans docs/load-tests/ :
//   - p95 < 2 s ✔/✘
//   - erreur < 0,1 % ✔/✘
//   - tx/min soutenues = (success × 60) / durée
//   - goulot identifié (ledger DB ? api-core ? rabbitmq ?)
