import { qget, qrun } from './db.js';
import { config } from './config.js';
import { toIso } from './util.js';

/**
 * Anti-brute-force du checkout (issue #54) — compteur d'échecs de PIN par token,
 * stocké en base (survit aux redémarrages).
 */

export function isCheckoutBlocked(token: string): boolean {
  const row = qget<{ blocked_until: string | null }>('SELECT blocked_until FROM checkout_throttle WHERE token = ?', token);
  return !!row?.blocked_until && row.blocked_until > toIso();
}

/** Enregistre un échec de PIN ; renvoie true si le token passe en blocage. */
export function registerPinFailure(token: string): boolean {
  const row = qget<{ failures: number; blocked_until: string | null }>('SELECT failures, blocked_until FROM checkout_throttle WHERE token = ?', token);
  if (row?.blocked_until && row.blocked_until > toIso()) return true;
  const failures = (row?.failures ?? 0) + 1;
  const now = toIso();
  if (failures >= config.checkoutMaxPinFailures) {
    const blockedUntil = toIso(new Date(Date.now() + config.checkoutBlockMinutes * 60_000));
    qrun(
      `INSERT INTO checkout_throttle (token, failures, blocked_until, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(token) DO UPDATE SET failures = excluded.failures, blocked_until = excluded.blocked_until, updated_at = excluded.updated_at`,
      token, failures, blockedUntil, now,
    );
    return true;
  }
  qrun(
    `INSERT INTO checkout_throttle (token, failures, blocked_until, updated_at) VALUES (?, ?, NULL, ?)
     ON CONFLICT(token) DO UPDATE SET failures = excluded.failures, blocked_until = NULL, updated_at = excluded.updated_at`,
    token, failures, now,
  );
  return false;
}

/** Paiement réussi : on réinitialise le compteur. */
export function clearCheckoutThrottle(token: string): void {
  qrun('DELETE FROM checkout_throttle WHERE token = ?', token);
}
