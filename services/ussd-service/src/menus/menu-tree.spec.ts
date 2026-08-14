import {
  BILL_PROVIDERS,
  formatAmount,
  I18N,
  isLangChoice,
  LANG_MENU,
  mainMenuText,
  renderMenu,
} from './menu-tree';

describe('menu-tree (GOURSI-027b) — rendu FR/AR', () => {
  it('sélection de langue : "fr" → menu principal FR avec les 4 options', () => {
    const r = renderMenu('root', 'fr', 'fr');
    expect(r.step).toBe('main');
    expect(r.isEnd).toBe(false);
    expect(r.text).toContain('1. Solde');
    expect(r.text).toContain('2. Envoyer');
    expect(r.text).toContain('3. Facture');
    expect(r.text).toContain('4. Retrait');
  });

  it('sélection de langue : "ar" → menu principal AR (1=الرصيد 2=إرسال 3=فاتورة 4=سحب)', () => {
    const r = renderMenu('root', 'ar', 'ar');
    expect(r.step).toBe('main');
    expect(r.text).toContain('1. الرصيد');
    expect(r.text).toContain('2. إرسال');
    expect(r.text).toContain('3. فاتورة');
    expect(r.text).toContain('4. سحب');
  });

  it('premier appel passerelle (entrée vide) → affiche le choix de langue', () => {
    const r = renderMenu('root', '', 'fr');
    expect(r.step).toBe('root');
    expect(r.text).toBe(LANG_MENU);
    expect(r.isEnd).toBe(false);
  });

  it('entrée invalide à la racine → message bilingue + re-affichage choix langue', () => {
    const r = renderMenu('root', 'zz', 'fr');
    expect(r.step).toBe('root');
    expect(r.text).toContain('إدخال غير صالح');
    expect(r.text).toContain(LANG_MENU);
  });

  it('menu principal : "1" → action terminale balance (isEnd)', () => {
    const r = renderMenu('main', '1', 'fr');
    expect(r.isEnd).toBe(true);
    expect(r.action).toBe('balance');
  });

  it('menu principal : entrée invalide "9" → "Saisie invalide" + menu FR réaffiché', () => {
    const r = renderMenu('main', '9', 'fr');
    expect(r.isEnd).toBe(false);
    expect(r.text).toContain(I18N.invalid.fr);
    expect(r.text).toContain('1. Solde');
  });

  it('isLangChoice accepte fr/ar et 1/2', () => {
    expect(isLangChoice('fr')).toBe('fr');
    expect(isLangChoice('AR')).toBe('ar');
    expect(isLangChoice('2')).toBe('ar');
    expect(isLangChoice('1')).toBe('fr');
    expect(isLangChoice('9')).toBeNull();
  });
});

describe('menu-tree — navigation Envoyer (numéro → montant → confirmation)', () => {
  it('parcours complet : "2" → numéro → montant → "1" → action transfer', () => {
    const r1 = renderMenu('main', '2', 'fr');
    expect(r1.step).toBe('transfer_recipient');
    expect(r1.text).toContain('Numéro du destinataire');

    const r2 = renderMenu('transfer_recipient', '66000002', 'fr');
    expect(r2.step).toBe('transfer_amount');
    expect(r2.data?.recipient).toBe('66000002');
    expect(r2.text).toContain('Montant');

    const r3 = renderMenu('transfer_amount', '10000', 'fr', r2.data);
    expect(r3.step).toBe('transfer_confirm');
    expect(r3.data?.amount).toBe('10000');
    expect(r3.text).toContain('10 000,00 FCFA');
    expect(r3.text).toContain('66000002');
    expect(r3.text).toContain('1. Confirmer');

    const r4 = renderMenu('transfer_confirm', '1', 'fr', r3.data);
    expect(r4.isEnd).toBe(true);
    expect(r4.action).toBe('transfer');
  });

  it('numéro invalide → "Saisie invalide" + re-demande du numéro', () => {
    const r = renderMenu('transfer_recipient', 'abc', 'fr');
    expect(r.step).toBe('transfer_recipient');
    expect(r.text).toContain(I18N.invalid.fr);
  });

  it('montant invalide → "Saisie invalide" + re-demande du montant', () => {
    const r = renderMenu('transfer_amount', '10.999', 'fr');
    expect(r.step).toBe('transfer_amount');
    expect(r.text).toContain(I18N.invalid.fr);
  });

  it('annulation "2" à la confirmation → retour au menu principal', () => {
    const r = renderMenu('transfer_confirm', '2', 'fr', { recipient: '66000002', amount: '10000' });
    expect(r.step).toBe('main');
    expect(r.text).toContain('1. Solde');
    expect(r.isEnd).toBe(false);
  });

  it('confirmation en arabe → texte arabe', () => {
    const r = renderMenu('transfer_confirm', '1', 'ar', { recipient: '66000002', amount: '10000' });
    expect(r.isEnd).toBe(true);
    expect(r.action).toBe('transfer');
    const confirm = renderMenu('transfer_amount', '10000', 'ar', { recipient: '66000002' });
    expect(confirm.text).toContain('تأكيد');
  });
});

describe('menu-tree — navigation Facture et Retrait', () => {
  it('facture : "3" → fournisseur → montant → confirmation → action bill', () => {
    const r1 = renderMenu('main', '3', 'fr');
    expect(r1.step).toBe('bill_provider');
    expect(r1.text).toContain('SNE');

    const r2 = renderMenu('bill_provider', '1', 'fr');
    expect(r2.step).toBe('bill_amount');
    expect(r2.data?.provider).toBe(BILL_PROVIDERS['1'].label.fr);

    const r3 = renderMenu('bill_amount', '5000', 'fr', r2.data);
    expect(r3.step).toBe('bill_confirm');
    expect(r3.text).toContain('SNE');
    expect(r3.text).toContain('5 000,00');

    const r4 = renderMenu('bill_confirm', '1', 'fr', r3.data);
    expect(r4.isEnd).toBe(true);
    expect(r4.action).toBe('bill');
  });

  it('fournisseur inconnu → invalide + liste réaffichée', () => {
    const r = renderMenu('bill_provider', '9', 'fr');
    expect(r.step).toBe('bill_provider');
    expect(r.text).toContain(I18N.invalid.fr);
  });

  it('retrait : "4" → OTP (6 chiffres) → confirmation → action withdraw', () => {
    const r1 = renderMenu('main', '4', 'fr');
    expect(r1.step).toBe('withdraw_otp');
    expect(r1.text).toContain('OTP');

    const r2 = renderMenu('withdraw_otp', '123456', 'fr');
    expect(r2.step).toBe('withdraw_confirm');
    expect(r2.data?.otp).toBe('123456');

    const r3 = renderMenu('withdraw_confirm', '1', 'fr', r2.data);
    expect(r3.isEnd).toBe(true);
    expect(r3.action).toBe('withdraw');
  });

  it('OTP invalide (3 chiffres) → invalide + re-demande', () => {
    const r = renderMenu('withdraw_otp', '123', 'fr');
    expect(r.step).toBe('withdraw_otp');
    expect(r.text).toContain(I18N.invalid.fr);
  });

  it('étape inconnue (session corrompue) → retour menu principal', () => {
    const r = renderMenu('nope' as never, '1', 'fr');
    expect(r.step).toBe('main');
    expect(r.isEnd).toBe(false);
  });
});

describe('formatAmount', () => {
  it('formate un montant décimal en fr-FR (espace normal, 2 décimales)', () => {
    expect(formatAmount('2500000.00')).toBe('2 500 000,00');
    expect(formatAmount('10000')).toBe('10 000,00');
    expect(formatAmount('0')).toBe('0,00');
  });
});

describe('mainMenuText', () => {
  it('FR et AR ont les 4 options numérotées', () => {
    expect(mainMenuText('fr')).toContain('1. Solde');
    expect(mainMenuText('ar')).toContain('1. الرصيد');
  });
});
