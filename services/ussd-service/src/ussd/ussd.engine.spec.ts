import { UssdEngine } from './ussd.engine';
import { UssdSessionStore } from './ussd-session.store';

describe('UssdEngine', () => {
  let engine: UssdEngine;

  beforeEach(() => {
    engine = new UssdEngine(new UssdSessionStore());
  });

  it('affiche le menu principal au premier appel', () => {
    const r = engine.handle('+23566000001', '*123#');
    expect(r.sessionEnded).toBe(false);
    expect(r.ussdMenu).toContain('1. Solde');
    expect(r.ussdMenu).toContain('4. Retrait');
  });

  it('solde : réponse immédiate', () => {
    engine.handle('+23566000001', '*123#');
    const r = engine.handle('+23566000001', '1');
    expect(r.sessionEnded).toBe(true);
    expect(r.ussdMenu).toContain('solde');
  });

  it('envoi : parcours en 2 étapes (numéro puis montant)', () => {
    engine.handle('+23566000001', '*123#');
    const step1 = engine.handle('+23566000001', '2');
    expect(step1.sessionEnded).toBe(false);
    expect(step1.ussdMenu).toContain('Numéro');
    const step2 = engine.handle('+23566000001', '+23566000002');
    expect(step2.sessionEnded).toBe(false);
    expect(step2.ussdMenu).toContain('Montant');
    const step3 = engine.handle('+23566000001', '5000');
    expect(step3.sessionEnded).toBe(true);
    expect(step3.ussdMenu).toContain('Envoi initié');
  });

  it('retrait : montant puis fin', () => {
    engine.handle('+23566000001', '*123#');
    engine.handle('+23566000001', '4');
    const r = engine.handle('+23566000001', '25000');
    expect(r.sessionEnded).toBe(true);
    expect(r.ussdMenu).toContain('Retrait initié');
  });

  it('quitter : fin de session', () => {
    engine.handle('+23566000001', '*123#');
    const r = engine.handle('+23566000001', '0');
    expect(r.sessionEnded).toBe(true);
  });

  it('menus en arabe si la saisie contient des caractères arabes', () => {
    const r = engine.handle('+23566000001', '*123# الواجهة');
    expect(r.ussdMenu).toContain('كوري باي');
    expect(r.ussdMenu).toContain('الرصيد');
  });

  it('détecte l’arabe et affiche الرصيد', () => {
    engine.handle('+23566000001', '*123# عربي');
    const r = engine.handle('+23566000001', '1');
    expect(r.ussdMenu).toMatch(/رصيد|يتم استشارة/);
  });
});
