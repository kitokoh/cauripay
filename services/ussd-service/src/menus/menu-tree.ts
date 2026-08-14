/**
 * Arbre de menus USSD *100# (GOURSI-027b).
 *
 * Déclaratif + i18n français/arabe. Service PUR : `renderMenu` n'effectue
 * AUCUN I/O (pas de Redis, pas de HTTP) — il est unit-testable directement.
 * Les actions terminales (solde, envoi, facture, retrait) sont déclarées dans
 * l'arbre via `action` et exécutées par UssdService (qui fait l'I/O).
 *
 * Parcours :
 *   *100# → root (choix langue : 'fr'/'ar' ou 1/2)
 *        → main  : 1=Solde/الرصيد · 2=Envoyer/إرسال · 3=Facture/فاتورة · 4=Retrait/سحب
 *        → envoi : numéro → montant → confirmation → api-core transfer
 *        → facture : fournisseur (stub) → montant → confirmation
 *        → retrait : OTP (stub) → confirmation
 */

export type Lang = 'fr' | 'ar';

export type ActionType = 'balance' | 'transfer' | 'bill' | 'withdraw';

export type StepId =
  | 'root'
  | 'main'
  | 'transfer_recipient'
  | 'transfer_amount'
  | 'transfer_confirm'
  | 'bill_provider'
  | 'bill_amount'
  | 'bill_confirm'
  | 'withdraw_otp'
  | 'withdraw_confirm';

/** Données temporaires de session accumulées pendant un parcours. */
export interface MenuData {
  recipient?: string;
  amount?: string;
  provider?: string;
  providerId?: string;
  otp?: string;
}

export interface RenderResult {
  /** prochaine étape à persister en session */
  step: StepId;
  /** texte à afficher ('' quand action terminale : le texte final est produit par l'exécuteur) */
  text: string;
  /** true → la session se termine après cette réponse */
  isEnd: boolean;
  /** action terminale à exécuter (I/O) — seulement si isEnd */
  action?: ActionType;
  /** mises à jour de données à persister */
  data?: MenuData;
}

/** Validation entrées : montant décimal (max 2 décimales), numéro, OTP 6 chiffres. */
export const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;
export const PHONE_RE = /^\+?\d{8,15}$/;
export const OTP_RE = /^\d{6}$/;

/** Remplit un gabarit `{key}` avec des variables (i18n terminal). */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

/** Sélection de langue par la première saisie : 'fr'/'ar' (ou 1/2). */
export function isLangChoice(input: string): Lang | null {
  const v = input.trim().toLowerCase();
  if (v === 'fr' || v === '1') return 'fr';
  if (v === 'ar' || v === '2') return 'ar';
  return null;
}

/** Formatage monétaire déterministe (fr-FR) : 1000000 → "1 000 000,00". */
export function formatAmount(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n
    .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[\u202f\u00a0]/g, ' ');
}

// ── Textes i18n (FR / AR) ────────────────────────────────────────────────────

export const LANG_MENU =
  'Bienvenue sur CauriPay *100#\n' +
  'Choisissez la langue / اختر اللغة:\n' +
  "1. Français ('fr')\n" +
  "2. العربية ('ar')";

export const I18N = {
  invalid: { fr: 'Saisie invalide. Réessayez.', ar: 'إدخال غير صالح. حاول مرة أخرى.' },
  invalidBilingual: "Entrée invalide. Choisissez 1 ou 2. / إدخال غير صالح. اختر 1 أو 2.",
  transferRecipient: {
    fr: "Envoyer de l'argent\nNuméro du destinataire:",
    ar: 'إرسال الأموال\nرقم المستلم:',
  },
  transferAmount: {
    fr: 'Montant en FCFA (ex: 10000):',
    ar: 'المبلغ بالفرنك (مثال: 10000):',
  },
  billProvider: {
    fr: 'Facture — Choisissez le fournisseur:\n1. SNE (Électricité)\n2. STEE (Eau)\n3. Canal+ (TV)',
    ar: 'فاتورة — اختر المزود:\n1. SNE (كهرباء)\n2. STEE (ماء)\n3. Canal+ (تلفزيون)',
  },
  billAmount: {
    fr: 'Montant de la facture en FCFA:',
    ar: 'مبلغ الفاتورة بالفرنك:',
  },
  withdrawOtp: {
    fr: 'Retrait — Entrez le code OTP reçu par SMS:',
    ar: 'سحب — أدخل رمز OTP المستلم عبر الرسائل:',
  },
  withdrawConfirm: {
    fr: 'Retrait — OTP validé.\n1. Confirmer le retrait\n2. Annuler',
    ar: 'سحب — تم التحقق من OTP.\n1. تأكيد السحب\n2. إلغاء',
  },
  balanceLabel: { fr: 'Votre solde est de', ar: 'رصيدك هو' },
  transferSuccess: {
    fr: 'Transfert de {amount} FCFA vers {recipient} réussi. Réf: {ref}',
    ar: 'تم تحويل {amount} فرنك إلى {recipient} بنجاح. المرجع: {ref}',
  },
  billSuccessLabel: {
    fr: 'Paiement de facture enregistré.',
    ar: 'تم تسجيل دفع الفاتورة.',
  },
  withdrawSuccessLabel: {
    fr: 'Demande de retrait enregistrée. Elle sera traitée par un agent.',
    ar: 'تم تسجيل طلب السحب. سيتم معالجته من قبل وكيل.',
  },
  serviceUnavailable: {
    fr: 'Service indisponible. Réessayez plus tard.',
    ar: 'الخدمة غير متاحة. حاول لاحقًا.',
  },
  recipientNotFound: {
    fr: 'Destinataire introuvable. Vérifiez le numéro.',
    ar: 'المستلم غير موجود. تحقق من الرقم.',
  },
  limitExceeded: {
    fr: 'Limite de transfert dépassée pour ce compte.',
    ar: 'تم تجاوز حد التحويل لهذا الحساب.',
  },
  walletInactive: {
    fr: 'Compte inactif. Contactez le support.',
    ar: 'الحساب غير نشط. اتصل بالدعم.',
  },
  insufficientFunds: {
    fr: 'Solde insuffisant pour effectuer cette opération.',
    ar: 'الرصيد غير كافٍ لإتمام هذه العملية.',
  },
  operationFailed: {
    fr: 'Opération refusée.',
    ar: 'تم رفض العملية.',
  },
};

export const SESSION_EXPIRED_TEXT =
  'Session expirée. Composez à nouveau *100#. / انتهت الجلسة. أعد الاتصال بـ *100#.';

/** Fournisseurs de facture (stub GOURSI-027d — liste statique en attendant api-core bills). */
export const BILL_PROVIDERS: Record<string, { label: Record<Lang, string> }> = {
  '1': { label: { fr: 'SNE (Électricité)', ar: 'SNE (كهرباء)' } },
  '2': { label: { fr: 'STEE (Eau)', ar: 'STEE (ماء)' } },
  '3': { label: { fr: 'Canal+ (TV)', ar: 'Canal+ (تلفزيون)' } },
};

/** Menu principal *100# (FR + AR). */
export function mainMenuText(lang: Lang): string {
  return (
    'CauriPay *100#\n' +
    (lang === 'fr'
      ? '1. Solde\n2. Envoyer\n3. Facture\n4. Retrait'
      : '1. الرصيد\n2. إرسال\n3. فاتورة\n4. سحب')
  );
}

/** Texte de confirmation d'une opération d'argent (avant action terminale). */
function confirmText(lang: Lang, kind: 'transfer' | 'bill', recipientOrProvider: string, amount: string): string {
  const q =
    kind === 'transfer'
      ? lang === 'fr'
        ? `Envoyer ${formatAmount(amount)} FCFA à ${recipientOrProvider}?`
        : `إرسال ${formatAmount(amount)} فرنك إلى ${recipientOrProvider}؟`
      : lang === 'fr'
        ? `Payer ${formatAmount(amount)} FCFA à ${recipientOrProvider}?`
        : `دفع ${formatAmount(amount)} فرنك إلى ${recipientOrProvider}؟`;
  return `${q}\n1. ${lang === 'fr' ? 'Confirmer' : 'تأكيد'}\n2. ${lang === 'fr' ? 'Annuler' : 'إلغاء'}`;
}

/**
 * Navigation pure : (step, input, lang, data) → { step, text, isEnd, action, data }.
 * Aucun I/O. Les entrées invalides réaffichent le menu courant précédé de « Saisie invalide ».
 */
export function renderMenu(step: StepId, input: string | undefined, lang: Lang, data: MenuData = {}): RenderResult {
  const raw = (input ?? '').trim();

  switch (step) {
    case 'root': {
      // Première saisie : sélection de la langue ('fr'/'ar' ou 1/2).
      // '' (premier appel passerelle) → simple affichage du choix de langue.
      const choice = isLangChoice(raw);
      if (raw === '') return { step: 'root', text: LANG_MENU, isEnd: false };
      if (!choice) {
        return { step: 'root', text: `${I18N.invalidBilingual}\n${LANG_MENU}`, isEnd: false };
      }
      return { step: 'main', text: mainMenuText(choice), isEnd: false };
    }

    case 'main': {
      switch (raw) {
        case '1': return { step: 'main', text: '', isEnd: true, action: 'balance' };
        case '2': return { step: 'transfer_recipient', text: I18N.transferRecipient[lang], isEnd: false };
        case '3': return { step: 'bill_provider', text: I18N.billProvider[lang], isEnd: false };
        case '4': return { step: 'withdraw_otp', text: I18N.withdrawOtp[lang], isEnd: false };
        default:
          return { step: 'main', text: `${I18N.invalid[lang]}\n${mainMenuText(lang)}`, isEnd: false };
      }
    }

    case 'transfer_recipient': {
      if (!PHONE_RE.test(raw)) {
        return { step, text: `${I18N.invalid[lang]}\n${I18N.transferRecipient[lang]}`, isEnd: false };
      }
      return { step: 'transfer_amount', text: I18N.transferAmount[lang], isEnd: false, data: { recipient: raw } };
    }

    case 'transfer_amount': {
      if (!AMOUNT_RE.test(raw)) {
        return { step, text: `${I18N.invalid[lang]}\n${I18N.transferAmount[lang]}`, isEnd: false };
      }
      return {
        step: 'transfer_confirm',
        text: confirmText(lang, 'transfer', data.recipient ?? '', raw),
        isEnd: false,
        data: { amount: raw },
      };
    }

    case 'transfer_confirm': {
      if (raw === '1') return { step, text: '', isEnd: true, action: 'transfer' };
      if (raw === '2') return { step: 'main', text: mainMenuText(lang), isEnd: false };
      return {
        step,
        text: `${I18N.invalid[lang]}\n${confirmText(lang, 'transfer', data.recipient ?? '', data.amount ?? '')}`,
        isEnd: false,
      };
    }

    case 'bill_provider': {
      const provider = BILL_PROVIDERS[raw];
      if (!provider) {
        return { step, text: `${I18N.invalid[lang]}\n${I18N.billProvider[lang]}`, isEnd: false };
      }
      return {
        step: 'bill_amount',
        text: I18N.billAmount[lang],
        isEnd: false,
        data: { provider: provider.label[lang], providerId: raw },
      };
    }

    case 'bill_amount': {
      if (!AMOUNT_RE.test(raw)) {
        return { step, text: `${I18N.invalid[lang]}\n${I18N.billAmount[lang]}`, isEnd: false };
      }
      return {
        step: 'bill_confirm',
        text: confirmText(lang, 'bill', data.provider ?? '', raw),
        isEnd: false,
        data: { amount: raw },
      };
    }

    case 'bill_confirm': {
      if (raw === '1') return { step, text: '', isEnd: true, action: 'bill' };
      if (raw === '2') return { step: 'main', text: mainMenuText(lang), isEnd: false };
      return {
        step,
        text: `${I18N.invalid[lang]}\n${confirmText(lang, 'bill', data.provider ?? '', data.amount ?? '')}`,
        isEnd: false,
      };
    }

    case 'withdraw_otp': {
      if (!OTP_RE.test(raw)) {
        return { step, text: `${I18N.invalid[lang]}\n${I18N.withdrawOtp[lang]}`, isEnd: false };
      }
      return { step: 'withdraw_confirm', text: I18N.withdrawConfirm[lang], isEnd: false, data: { otp: raw } };
    }

    case 'withdraw_confirm': {
      if (raw === '1') return { step, text: '', isEnd: true, action: 'withdraw' };
      if (raw === '2') return { step: 'main', text: mainMenuText(lang), isEnd: false };
      return {
        step,
        text: `${I18N.invalid[lang]}\n${I18N.withdrawConfirm[lang]}`,
        isEnd: false,
      };
    }

    default: {
      // Étape inconnue (session corrompue) → retour au menu principal.
      return { step: 'main', text: mainMenuText(lang), isEnd: false };
    }
  }
}
