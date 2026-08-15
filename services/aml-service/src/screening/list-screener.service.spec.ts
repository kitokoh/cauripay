import { describe, expect, it } from '@jest/globals';
import { ListScreenerService, normalizeName, tokenJaccard } from './list-screener.service';

describe('ListScreenerService (GOURSI-025b)', () => {
  const screener = new ListScreenerService();

  it('normalisation : diacritiques, casse, espaces', () => {
    expect(normalizeName('  Ibrahïm   Koné  ')).toBe('ibrahim kone');
    expect(normalizeName('JEAN-PIERRE MBOUMBA')).toBe('jean pierre mboumba');
  });

  it('match EXACT sur nom normalisé (diacritiques ignorées)', () => {
    const r = screener.screen('Ibrahïm Koné');
    expect(r.hit).toBe(true);
    expect(r.kind).toBe('exact');
    expect(r.matchedEntity?.list).toBe('GABAC');
  });

  it('match EXACT sur alias', () => {
    const r = screener.screen('ibrahima kone');
    expect(r.hit).toBe(true);
    expect(r.kind).toBe('exact');
  });

  it('match EXACT avec pays concordant', () => {
    const r = screener.screen('FATOU DIALLO', 'SN');
    expect(r.hit).toBe(true);
    expect(r.kind).toBe('exact');
  });

  it('nom identique mais pays différent → match exact quand même (AML : pas de fausse négative)', () => {
    const r = screener.screen('FATOU DIALLO', 'CI');
    expect(r.hit).toBe(true);
    expect(r.kind).toBe('exact');
    expect(r.countryMatched).toBe(false);
  });

  it('nom inconnu dans un pays listé → aucun match', () => {
    const r = screener.screen('AMADOU BARRY', 'SN');
    expect(r.hit).toBe(false);
  });

  it('match FUZZY pour une faute de frappe (similarité caractères)', () => {
    const r = screener.screen('Ibrahïm Konné'); // "Koné" → "Konné" (1 faute)
    expect(r.hit).toBe(true);
    expect(r.kind).toBe('fuzzy');
    expect(r.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('match FUZZY par tokens (nom partiel)', () => {
    const r = screener.screen('Jean Pierre Mbumba'); // transposition
    expect(r.hit).toBe(true);
  });

  it('pas de match pour un nom inconnu', () => {
    const r = screener.screen('AMADOU BARRY');
    expect(r.hit).toBe(false);
  });

  it('Jaccard : identique = 1, disjoint = 0', () => {
    expect(tokenJaccard(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(tokenJaccard(['a'], ['b'])).toBe(0);
  });
});
