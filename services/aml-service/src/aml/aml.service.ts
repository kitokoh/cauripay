import { Injectable } from '@nestjs/common';

export interface Alert {
  id: string;
  userId: string;
  score: number;
  reason: string;
  status: 'OPEN' | 'REVIEW' | 'CONFIRMED' | 'FALSE_POSITIVE';
  matchedLists: string[];
  createdAt: Date;
}

/**
 * aml-service — scoring de risque (0-100, seuil 70), filtrage listes
 * OFAC/ONU/GABAC et workflow des alertes. En phase 0 : liste de sanctions
 * embarquée (fixtures) + stockage mémoire ; en staging : source externe.
 */
@Injectable()
export class AmlService {
  private static readonly THRESHOLD = 70;

  // Fixtures minimales (noms de test) — remplacées par un flux réel en staging
  private static readonly SANCTIONED_NAMES = new Set([
    'GABAC-TEST-PERSON',
    'OFAC-TEST-PERSON',
    'ONU-TEST-PERSON',
  ]);

  private readonly alerts = new Map<string, Alert>();

  /** Score un utilisateur : 0-100. ≥70 → alerte. */
  scoreUser(dto: {
    userId: string;
    fullName: string;
    country: string;
    transactionVolumeMinor: number;
  }): {
    score: number;
    alert?: Alert;
  } {
    let score = 0;
    const matchedLists: string[] = [];

    const upper = dto.fullName.toUpperCase();
    if (AmlService.SANCTIONED_NAMES.has(upper)) {
      score += 90;
      matchedLists.push('GABAC');
    }
    if (dto.country.toUpperCase() === 'IR' || dto.country.toUpperCase() === 'KP') {
      score += 40;
      matchedLists.push('OFAC');
    }
    // Volume élevé sur petit compte → signal
    if (dto.transactionVolumeMinor > 10_000_000) {
      score += 20;
    }

    score = Math.min(100, score);
    if (score >= AmlService.THRESHOLD) {
      const alert: Alert = {
        id: `al_${globalThis.crypto.randomUUID().slice(0, 8)}`,
        userId: dto.userId,
        score,
        reason: `Score AML ${score}/100 — seuil ${AmlService.THRESHOLD}`,
        status: 'OPEN',
        matchedLists,
        createdAt: new Date(),
      };
      this.alerts.set(alert.id, alert);
      return { score, alert };
    }
    return { score };
  }

  /** Workflow alertes : OPEN → REVIEW → CONFIRMED | FALSE_POSITIVE. */
  updateAlert(
    alertId: string,
    action: 'review' | 'confirm' | 'false_positive',
    _reviewerId: string,
  ): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alerte inconnue: ${alertId}`);
    alert.status =
      action === 'review' ? 'REVIEW' : action === 'confirm' ? 'CONFIRMED' : 'FALSE_POSITIVE';
    return alert;
  }

  listAlerts(status?: Alert['status']): Alert[] {
    const all = [...this.alerts.values()];
    return status ? all.filter((a) => a.status === status) : all;
  }
}
