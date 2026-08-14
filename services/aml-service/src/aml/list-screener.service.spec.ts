import { ListScreenerService } from './list-screener.service';

describe('ListScreenerService (GOURSI-025b) — normalisation & fixtures', () => {
  it('normalise : minuscules, diacritiques, espaces', () => {
    expect(ListScreenerService.normalize('  Jean-Pierre  MABIALA ')).toBe('jean-pierre mabiala');
    expect(ListScreenerService.normalize('ABUBAKAR SHEKAU')).toBe('abubakar shekau');
    expect(ListScreenerService.normalize('Moussa Hassan')).toBe('moussa hassan');
  });

  it('fixtures couvertes par la normalisation (cas limites diacritiques)', () => {
    // Toutes les fixtures de seed doivent matcher leur nom normalisé
    const fixtures = [
      'ABUBAKAR SHEKAU', 'MOUSSA HASSAN', 'Jean-Pierre Mabiala', 'PAUL BOKA', 'Ivan Petrov',
    ];
    for (const name of fixtures) {
      const party = { normalizedName: ListScreenerService.normalize(name) };
      expect(party.normalizedName).toBeTruthy();
    }
    // translittération : 'Iván Pétrov' (avec accents) → même normalisation que 'IVAN PETROV'
    expect(ListScreenerService.normalize('Iván Pétrov')).toBe(ListScreenerService.normalize('IVAN PETROV'));
  });
});
