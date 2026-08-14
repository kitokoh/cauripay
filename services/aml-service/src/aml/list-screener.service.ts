import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SanctionsList } from '@prisma/client';

/**
 * Screening contre les listes de sanctions (OFAC / ONU / GABAC) — GOURSI-025b.
 *
 * Normalisation : unicodé NFC, minuscules, suppression des diacritiques →
 * matching exact sur nom normalisé (+ pays si fourni).
 * Match exact → alerte CRITICAL (gel du wallet consommé par api-core, GOURSI-025d).
 */
@Injectable()
export class ListScreenerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Normalise un nom : NFC, minuscule, sans diacritiques, espaces réduits. */
  static normalize(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // diacritiques
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Vérifie une partie contre les listes chargées. */
  async screen(name: string, countryIso?: string | null): Promise<{ matched: boolean; party?: SanctionsList; name?: string }> {
    const normalized = ListScreenerService.normalize(name);
    const party = await this.prisma.sanctionedParty.findUnique({ where: { normalizedName: normalized } });
    if (!party) {
      return { matched: false };
    }
    // Match nom normalisé ; le pays est un critère de confirmation, pas d'exclusion
    if (countryIso && party.country && party.country !== countryIso.toUpperCase()) {
      return { matched: false };
    }
    return { matched: true, party: party.listSource, name: party.name };
  }

  /** Charge les fixtures de listes (idempotent — upsert par nom normalisé). */
  async seedFixtures(): Promise<void> {
    const fixtures: Array<[string, string | null, SanctionsList]> = [
      ['ABUBAKAR SHEKAU', 'NG', SanctionsList.OFAC],
      ['MOUSSA HASSAN', 'TD', SanctionsList.UN],
      ['JEAN-PIERRE MABIALA', 'CG', SanctionsList.GABAC],
      ['PAUL BOKA', 'CI', SanctionsList.GABAC],
      ['IVAN PETROV', 'RU', SanctionsList.OFAC],
    ];
    for (const [name, country, list] of fixtures) {
      await this.prisma.sanctionedParty.upsert({
        where: { normalizedName: ListScreenerService.normalize(name) },
        update: {},
        create: { name, normalizedName: ListScreenerService.normalize(name), country, listSource: list },
      });
    }
  }
}
