import { Injectable } from '@nestjs/common';
import { UssdSession, UssdSessionStore } from './ussd-session.store';

/**
 * Moteur USSD — menu hiérarchisé FR+AR (spec GOURSI-027b) :
 *   1=Solde 2=Envoyer 3=Facture 4=Retrait
 * Retour : { sessionEnded, ussdMenu } conforme au standard USSD (CON/SWI).
 */
@Injectable()
export class UssdEngine {
  constructor(private readonly sessions: UssdSessionStore) {}

  /** Point d'entrée : phone + texte saisi (code court + entrées successives). */
  handle(phone: string, input: string): { sessionEnded: boolean; ussdMenu: string } {
    let session = this.sessions.get(phone);

    if (!session) {
      session = this.sessions.create(phone, this.detectLang(input));
      return this.mainMenu(session);
    }

    // Session active → traite l'entrée
    const choice = input.trim();
    if (choice === '0') {
      this.sessions.delete(phone);
      return { sessionEnded: true, ussdMenu: this.t(session, 'Au revoir') };
    }

    if (session.op === null) {
      return this.routeMain(session, choice);
    }
    return this.routeOp(session, choice);
  }

  private mainMenu(session: UssdSession) {
    return {
      sessionEnded: false,
      ussdMenu: `${this.t(session, 'CauriPay')}\n1. ${this.t(session, 'Solde')}\n2. ${this.t(session, 'Envoyer')}\n3. ${this.t(session, 'Facture')}\n4. ${this.t(session, 'Retrait')}\n0. ${this.t(session, 'Quitter')}`,
    };
  }

  private routeMain(session: UssdSession, choice: string) {
    switch (choice) {
      case '1':
        session.op = 'BALANCE';
        session.step = 0;
        this.sessions.update(session);
        return {
          sessionEnded: true,
          ussdMenu: this.t(
            session,
            'Votre solde est consulté via api-core (GET /wallets/me/balance).',
          ),
        };
      case '2':
        session.op = 'SEND';
        session.step = 1;
        this.sessions.update(session);
        return {
          sessionEnded: false,
          ussdMenu: `${this.t(session, 'Envoyer')}:\n${this.t(session, 'Numéro destinataire ?')}`,
        };
      case '3':
        session.op = 'BILL';
        session.step = 1;
        this.sessions.update(session);
        return {
          sessionEnded: false,
          ussdMenu: `${this.t(session, 'Facture')}:\n${this.t(session, 'Référence facture ?')}`,
        };
      case '4':
        session.op = 'WITHDRAW';
        session.step = 1;
        this.sessions.update(session);
        return {
          sessionEnded: false,
          ussdMenu: `${this.t(session, 'Retrait')}:\n${this.t(session, 'Montant (FCFA) ?')}`,
        };
      default:
        this.sessions.delete(session.phone);
        return { sessionEnded: true, ussdMenu: this.t(session, 'Choix invalide') };
    }
  }

  private routeOp(session: UssdSession, input: string) {
    session.data[`step${session.step}`] = input;
    session.step += 1;
    this.sessions.update(session);

    switch (session.op) {
      case 'SEND':
        if (session.step === 2) {
          return { sessionEnded: false, ussdMenu: `${this.t(session, 'Montant (FCFA) ?')}` };
        }
        this.sessions.delete(session.phone);
        return {
          sessionEnded: true,
          ussdMenu: `${this.t(session, 'Envoi initié')} (${session.data['step1']})`,
        };
      case 'BILL':
        this.sessions.delete(session.phone);
        return {
          sessionEnded: true,
          ussdMenu: `${this.t(session, 'Paiement facture initié')} (${session.data['step1']})`,
        };
      case 'WITHDRAW':
        this.sessions.delete(session.phone);
        return {
          sessionEnded: true,
          ussdMenu: `${this.t(session, 'Retrait initié')} (${session.data['step1']} FCFA)`,
        };
      default:
        this.sessions.delete(session.phone);
        return { sessionEnded: true, ussdMenu: this.t(session, 'Fin') };
    }
  }

  private detectLang(input: string): 'FR' | 'AR' {
    return /[\u0600-\u06FF]/.test(input) ? 'AR' : 'FR';
  }

  private t(session: UssdSession, fr: string): string {
    return session.lang === 'AR' ? this.ar(fr) : fr;
  }

  private ar(fr: string): string {
    const dict: Record<string, string> = {
      CauriPay: 'كوري باي',
      Solde: 'الرصيد',
      Envoyer: 'إرسال',
      Facture: 'فاتورة',
      Retrait: 'سحب',
      Quitter: 'خروج',
      'Au revoir': 'مع السلامة',
      'Choix invalide': 'اختيار غير صالح',
      'Numéro destinataire ?': 'رقم المستلم؟',
      'Montant (FCFA) ?': 'المبلغ (فرنك)؟',
      'Référence facture ?': 'مرجع الفاتورة؟',
      'Envoi initié': 'تم بدء الإرسال',
      'Paiement facture initié': 'تم بدء دفع الفاتورة',
      'Retrait initié': 'تم بدء السحب',
      Fin: 'نهاية',
      'Votre solde est consulté via api-core (GET /wallets/me/balance).':
        'يتم استشارة رصيدك عبر api-core',
    };
    return dict[fr] ?? fr;
  }
}
