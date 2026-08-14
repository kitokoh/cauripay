import { Injectable } from '@nestjs/common';

/** Nombre maximal de tentatives d'envoi (GOURSI-026d) : la 4e défaillance → FAILED + DLQ. */
export const MAX_ATTEMPTS = 4;

/**
 * Backoff exponentiel plafonné (GOURSI-026d) : 30 s → 2 min → 10 min → 30 min.
 * Croissance ≈ ×4 par tentative, plafond dur à 30 min (valeurs spec des issues #210-#213).
 */
export const BACKOFF_SCHEDULE_MS = [30_000, 120_000, 600_000, 1_800_000] as const;

@Injectable()
export class BackoffService {
  /**
   * Délai d'attente avant la prochaine tentative, en fonction du nombre d'échecs déjà subis.
   * attempts <= 0 → 30 s (clamp bas) ; attempts > 4 → 30 min (plafond).
   */
  getDelayMs(attempt: number): number {
    const index = Math.max(0, Math.min(attempt - 1, BACKOFF_SCHEDULE_MS.length - 1));
    return BACKOFF_SCHEDULE_MS[index];
  }
}
