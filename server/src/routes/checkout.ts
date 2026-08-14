import type { FastifyInstance } from 'fastify';
import { db, qall, qget, qrun } from '../db.js';
import { getPaymentByCheckoutToken, transition, type PaymentRow } from '../payments.js';
import { formatMoney, isValidPhone } from '../util.js';
import { methodById, ALL_METHOD_IDS } from '../registries.js';

export const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'expired']);

export async function checkoutRoutes(app: FastifyInstance): Promise<void> {
  app.get('/checkout/:token', async (req, reply) => {
    const { token } = req.params as { token: string };
    const pay = getPaymentByCheckoutToken(token);
    if (!pay) return reply.code(404).type('text/html').send('<h1>Paiement introuvable</h1>');
    const merchant = qget<{ name: string; company: string }>('SELECT name, company FROM merchants WHERE id = ?', pay.merchant_id)!;
    reply.type('text/html; charset=utf-8').send(renderCheckout(pay, merchant.name, merchant.company));
  });

  app.post('/checkout/:token/initiate', async (req, reply) => {
    const { token } = req.params as { token: string };
    const body = (req.body ?? {}) as { phone?: string; method?: string };
    const pay = getPaymentByCheckoutToken(token);
    if (!pay) return reply.code(404).send({ error: { type: 'invalid_request_error', code: 'not_found', message: 'Paiement introuvable.' } });
    if (TERMINAL.has(pay.status)) return reply.code(409).send({ error: { type: 'invalid_request_error', code: 'invalid_state', message: 'Paiement déjà terminé.' } });

    const phone = body.phone?.trim() ?? '';
    if (!isValidPhone(phone)) return reply.code(400).send({ error: { type: 'invalid_request_error', code: 'invalid_request_error', message: 'Numéro de téléphone invalide (ex : +2250708091011).' } });

    const allowed = JSON.parse(pay.methods) as string[];
    const method = body.method && allowed.includes(body.method) ? body.method : allowed[0];
    if (!method) return reply.code(400).send({ error: { type: 'invalid_request_error', code: 'invalid_request_error', message: 'Aucune méthode de paiement disponible.' } });

    if (pay.status === 'pending') transition(pay.merchant_id, pay.id, 'processing', { provider: method, phone });
    const fresh = getPaymentByCheckoutToken(token)!;
    return { step: 'pin', payment: { id: fresh.id, status: fresh.status, provider: fresh.provider, provider_ref: fresh.provider_ref, amount_minor: fresh.amount_minor, currency: fresh.currency } };
  });

  app.post('/checkout/:token/confirm', async (req, reply) => {
    const { token } = req.params as { token: string };
    const body = (req.body ?? {}) as { pin?: string };
    const pay = getPaymentByCheckoutToken(token);
    if (!pay) return reply.code(404).send({ error: { type: 'invalid_request_error', code: 'not_found', message: 'Paiement introuvable.' } });
    if (pay.status !== 'processing') return reply.code(409).send({ error: { type: 'invalid_request_error', code: 'invalid_state', message: `Statut actuel : ${pay.status}.` } });

    const pin = body.pin ?? '';
    if (!/^\d{4}$/.test(pin)) return reply.code(400).send({ error: { type: 'invalid_request_error', code: 'invalid_request_error', message: 'Le PIN doit contenir 4 chiffres.' } });

    // Simulation sandbox : 0000 → échec (flux d'échec démontrable), sinon succès après ~1,5 s.
    setTimeout(() => {
      if (pin === '0000') {
        transition(pay.merchant_id, pay.id, 'failed', { reason: 'incorrect_pin' });
      } else {
        transition(pay.merchant_id, pay.id, 'succeeded', { providerRef: `SIM-${Math.random().toString(36).slice(2, 6).toUpperCase()}` });
      }
    }, 1500);

    return { status: 'processing', message: 'Confirmation en cours…' };
  });

  app.get('/checkout/:token/status', async (req) => {
    const { token } = req.params as { token: string };
    const pay = getPaymentByCheckoutToken(token);
    if (!pay) return { status: 'not_found' };
    const method = pay.provider ? methodById(pay.provider) : undefined;
    return {
      status: pay.status,
      amount_minor: pay.amount_minor,
      currency: pay.currency,
      amount_label: formatMoney(pay.amount_minor, pay.currency),
      description: pay.description,
      provider_label: method?.label ?? null,
      provider_ref: pay.provider_ref,
      redirect_url: pay.redirect_url,
      mode: pay.mode,
    };
  });
}

export function renderCheckout(pay: PaymentRow, merchantName: string, merchantCompany: string): string {
  const allowed = JSON.parse(pay.methods) as string[];
  const methodOptions = ALL_METHOD_IDS
    .filter((m) => allowed.includes(m))
    .map((m) => {
      const def = methodById(m)!;
      return `<button class="method" data-method="${esc(m)}" type="button"><span class="method-emoji">${def.emoji}</span><span><strong>${esc(def.label)}</strong><br><small>${esc(def.hint)}</small></span></button>`;
    })
    .join('');

  const initial = TERMINAL.has(pay.status);
  const resultKind = pay.status === 'succeeded' ? 'success' : pay.status === 'failed' ? 'fail' : 'info';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paiement — CauriPay</title>
<style>
  :root{--green:#0E9F6E;--dark:#0B1220;--gold:#F59E0B;--bg:#F6F7F9;--ink:#111827;--muted:#6B7280;--danger:#E02424}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(160deg,#0B1220 0%,#123 60%,#0E9F6E22 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:100%;max-width:430px;overflow:hidden}
  .head{background:var(--dark);color:#fff;padding:22px 24px;display:flex;align-items:center;gap:12px}
  .logo{width:38px;height:38px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
  .head small{color:#9CA3AF;display:block}
  .badge{display:inline-block;background:var(--gold);color:#111827;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;margin-left:auto;letter-spacing:.3px}
  .body{padding:24px}
  .amount{font-size:32px;font-weight:800;color:var(--ink)}
  .desc{color:var(--muted);margin:4px 0 20px}
  .methods{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
  .method{display:flex;align-items:center;gap:12px;border:2px solid #E5E7EB;border-radius:12px;padding:10px 12px;background:#fff;cursor:pointer;text-align:left;font:inherit}
  .method.sel{border-color:var(--green);background:#F0FDF4}
  .method-emoji{font-size:22px}
  label{display:block;font-size:13px;font-weight:600;color:var(--ink);margin:14px 0 6px}
  input{width:100%;padding:12px 14px;border:2px solid #E5E7EB;border-radius:10px;font-size:15px;font-family:inherit}
  input:focus{outline:none;border-color:var(--green)}
  .btn{width:100%;margin-top:18px;background:var(--green);color:#fff;border:none;border-radius:10px;padding:14px;font-size:16px;font-weight:700;cursor:pointer}
  .btn:disabled{opacity:.6;cursor:wait}
  .hint{font-size:12px;color:var(--muted);margin-top:10px;text-align:center}
  .note{background:#FFF7E6;border:1px solid #F5DEB3;color:#7A5C00;border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:16px}
  .result{text-align:center;padding:8px 0}
  .result .ico{font-size:52px}
  .result h2{margin:10px 0 6px}
  .result p{color:var(--muted);font-size:14px}
  .error{background:#FEF2F2;color:var(--danger);border:1px solid #FECACA;border-radius:10px;padding:10px 12px;font-size:13px;margin-top:14px;display:none}
  .spinner{display:inline-block;width:22px;height:22px;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;vertical-align:-4px;margin-right:8px}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="card">
  <div class="head">
    <div class="logo">C</div>
    <div><strong>CauriPay</strong><small>${esc(merchantCompany || merchantName)}</small></div>
    <span class="badge">${pay.mode === 'test' ? 'MODE TEST — AUCUN DÉBIT RÉEL' : 'PAIEMENT SÉCURISÉ'}</span>
  </div>
  <div class="body" id="app">
    ${initial ? renderResult(pay, resultKind, methodById(pay.provider ?? '')?.label) : `
    <div class="amount">${esc(formatMoney(pay.amount_minor, pay.currency))}</div>
    <div class="desc">${esc(pay.description || 'Paiement')}</div>
    <div class="note">🧪 Environnement de test : aucun argent réel ne sera débité.</div>
    <div class="methods" id="methods">${methodOptions}</div>
    <div id="step-phone">
      <label for="phone">Numéro mobile money</label>
      <input id="phone" inputmode="tel" placeholder="+225 07 08 09 10 11" autocomplete="tel">
      <button class="btn" id="btn-pay">Payer ${esc(formatMoney(pay.amount_minor, pay.currency))}</button>
      <p class="hint">En test, utilisez n'importe quel numéro.</p>
    </div>
    <div id="step-pin" style="display:none">
      <label for="pin">Code PIN (4 chiffres)</label>
      <input id="pin" inputmode="numeric" maxlength="4" placeholder="••••">
      <button class="btn" id="btn-confirm"><span class="spinner" style="display:none" id="spinner"></span>Confirmer le paiement</button>
      <p class="hint">N'importe quel code fonctionne. <strong>0000</strong> simule un échec.</p>
    </div>
    <div class="error" id="error"></div>`}
  </div>
</div>
<script>
(function(){
  const token = ${JSON.stringify(pay.checkout_token)};
  if (${initial}) return;
  const methods = document.querySelectorAll('.method');
  let selected = ${JSON.stringify(allowed[0] ?? null)};
  methods.forEach(b => {
    if (b.dataset.method === selected) b.classList.add('sel');
    b.onclick = () => {
      methods.forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      selected = b.dataset.method;
    };
  });
  const err = (m) => { const e = document.getElementById('error'); e.style.display='block'; e.textContent = m; };
  document.getElementById('btn-pay').onclick = async () => {
    const phone = document.getElementById('phone').value.trim();
    document.getElementById('btn-pay').disabled = true;
    try {
      const r = await fetch('/checkout/'+token+'/initiate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, method: selected }) });
      const j = await r.json();
      if (!r.ok) { err(j.error?.message || 'Erreur'); document.getElementById('btn-pay').disabled = false; return; }
      document.getElementById('step-phone').style.display = 'none';
      document.getElementById('step-pin').style.display = 'block';
    } catch(e) { err('Erreur réseau'); document.getElementById('btn-pay').disabled = false; }
  };
  document.getElementById('btn-confirm').onclick = async () => {
    const pin = document.getElementById('pin').value.trim();
    if (!/^\\d{4}$/.test(pin)) return err('PIN : 4 chiffres.');
    const sp = document.getElementById('spinner');
    sp.style.display = 'inline-block';
    document.getElementById('btn-confirm').disabled = true;
    try {
      const r = await fetch('/checkout/'+token+'/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin }) });
      const j = await r.json();
      if (!r.ok) { err(j.error?.message || 'Erreur'); sp.style.display='none'; document.getElementById('btn-confirm').disabled=false; return; }
      poll();
    } catch(e) { err('Erreur réseau'); sp.style.display='none'; document.getElementById('btn-confirm').disabled=false; }
  };
  async function poll() {
    for (let i = 0; i < 30; i++) {
      await new Promise(res => setTimeout(res, 1500));
      try {
        const r = await fetch('/checkout/'+token+'/status');
        const j = await r.json();
        if (['succeeded','failed','cancelled','expired'].includes(j.status)) { window.location.reload(); return; }
      } catch(e) {}
    }
  }
})();
</script>
</body>
</html>`;
}

function renderResult(pay: PaymentRow, kind: 'success' | 'fail' | 'info', providerLabel?: string): string {
  const map = {
    success: { ico: '✅', title: 'Paiement réussi', sub: providerLabel ? `Via ${esc(providerLabel)} — référence ${esc(pay.provider_ref ?? '')}` : 'Votre paiement a été accepté.' },
    fail: { ico: '❌', title: 'Paiement échoué', sub: "Le paiement n'a pas abouti. Vous pouvez réessayer." },
    info: { ico: 'ℹ️', title: `Paiement ${esc(pay.status)}`, sub: "Aucun débit n'a été effectué (mode test)." },
  }[kind];
  const redirect = pay.status === 'succeeded' && pay.redirect_url
    ? `<a class="btn" href="${esc(pay.redirect_url)}" style="display:block;text-align:center;text-decoration:none">Retour au site</a>`
    : '';
  return `<div class="result"><div class="ico">${map.ico}</div><h2>${map.title}</h2><p>${map.sub}</p>${redirect}<p class="hint" style="margin-top:14px">Référence : ${esc(pay.id)}</p></div>`;
}
