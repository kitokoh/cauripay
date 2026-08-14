import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Vérification des webhooks signés (spec v0.1 + GOURSI-050c).
 *
 * Header : `X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>`
 * Anti-replay : fenêtre de ±5 min entre le timestamp du header et l'heure locale.
 */
export class Webhooks {
  private readonly secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Vérifie la signature d'un webhook.
   *
   * @param signature valeur du header X-CauriPay-Signature (ex: "t=1710000000,v1=abc…")
   * @param payload corps brut du webhook (string JSON — PAS re-sérialisé)
   * @param toleranceSeconds fenêtre anti-replay (défaut 300 s)
   * @returns true si la signature est valide et dans la fenêtre
   */
  verifySignature(signature: string, payload: string, toleranceSeconds = 300): boolean {
    const parts = signature.split(',').map((p) => p.trim());
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !v1) {
      return false;
    }

    // Anti-replay : le timestamp ne doit pas être trop vieux ni dans le futur
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > toleranceSeconds) {
      return false;
    }

    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return safeEqual(expected, v1);
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
