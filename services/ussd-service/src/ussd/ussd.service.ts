import { Injectable } from '@nestjs/common';
import { SessionStoreService, UssdSession } from '../session/session-store.service';
import {
  ActionType,
  fillTemplate,
  formatAmount,
  I18N,
  isLangChoice,
  Lang,
  MenuData,
  renderMenu,
  RenderResult,
  SESSION_EXPIRED_TEXT,
} from '../menus/menu-tree';
import { ApiCoreClientService } from './api-core-client.service';

/** Réponse au format opérateur USSD (GOURSI-027c). */
export interface UssdSessionResponse {
  text: string;
  endOfSession: boolean;
}

/**
 * Orchestrateur USSD (GOURSI-027d) :
 * session Redis → navigation pure (renderMenu) → action terminale (I/O api-core).
 * Toute opération d'argent passe par api-core → ledger-service.
 */
@Injectable()
export class UssdService {
  constructor(
    private readonly store: SessionStoreService,
    private readonly apiCore: ApiCoreClientService,
  ) {}

  async handle(sessionId: string, msisdn: string, input: string): Promise<UssdSessionResponse> {
    let session = await this.store.get(sessionId);

    // Session absente : expirée (déjà vue) ou nouvelle (*100#).
    if (!session) {
      if (await this.store.hasSeen(sessionId)) {
        return { text: SESSION_EXPIRED_TEXT, endOfSession: true };
      }
      session = { msisdn, step: 'root', data: {} };
    }

    // Langue : choisie à la première saisie ('fr'/'ar' ou 1/2), sinon persistée.
    let lang: Lang = session.lang ?? 'fr';
    if (!session.lang) {
      const choice = isLangChoice(input);
      if (choice) lang = choice;
    }

    // Navigation pure (aucun I/O) — testable directement.
    const result: RenderResult = renderMenu(session.step, input, lang, session.data ?? {});

    const data: MenuData = { ...(session.data ?? {}), ...(result.data ?? {}) };
    session = { ...session, msisdn, step: result.step, lang, data };
    await this.store.set(sessionId, session);

    if (!result.isEnd) {
      return { text: result.text, endOfSession: false };
    }

    // Action terminale : I/O (api-core) puis fin de session.
    const text = await this.executeAction(result.action, session, lang);
    await this.store.clear(sessionId);
    return { text, endOfSession: true };
  }

  /** Exécution des 4 opérations (GOURSI-027d). Erreurs → texte USSD convivial. */
  private async executeAction(action: ActionType | undefined, session: UssdSession, lang: Lang): Promise<string> {
    try {
      switch (action) {
        case 'balance': {
          const bal = await this.apiCore.getBalance(session.msisdn);
          const amount = formatAmount(bal.availableBalance ?? bal.balance);
          return `${I18N.balanceLabel[lang]} ${amount} FCFA.`;
        }
        case 'transfer': {
          const amount = formatAmount(session.data.amount ?? '');
          const recipient = session.data.recipient ?? '';
          const res = await this.apiCore.transfer({
            idempotencyKey: `ussd-${session.msisdn}-${Date.now()}`,
            fromMsisdn: session.msisdn,
            toAccountNumber: recipient,
            amountMinor: session.data.amount ?? '',
            description: 'Envoi USSD *100#',
          });
          const ref = res.transactionId ?? res.id ?? '';
          return fillTemplate(I18N.transferSuccess[lang], { amount, recipient, ref });
        }
        case 'bill': {
          // Stub : pas encore d'endpoint facture api-core — transaction « enregistrée ».
          return `${I18N.billSuccessLabel[lang]} ${formatAmount(session.data.amount ?? '')} FCFA (${session.data.provider ?? ''}).`;
        }
        case 'withdraw': {
          // Stub : le retrait réel passera par cash-out agent api-core (OTP client).
          return I18N.withdrawSuccessLabel[lang];
        }
        default:
          return I18N.serviceUnavailable[lang];
      }
    } catch (e) {
      return this.mapError(e, lang);
    }
  }

  /** Mapping erreurs api-core → message USSD clair (ex: solde insuffisant). */
  private mapError(e: unknown, lang: Lang): string {
    const err = e as { status?: number; code?: string; message?: string };
    const code = err.code ?? '';
    if (code === 'RECIPIENT_NOT_FOUND') return I18N.recipientNotFound[lang];
    if (code === 'KYC_LIMIT_EXCEEDED') return I18N.limitExceeded[lang];
    if (code === 'WALLET_INACTIVE') return I18N.walletInactive[lang];
    if (code.startsWith('INSUFFICIENT')) return I18N.insufficientFunds[lang];
    if ((err.status ?? 0) >= 500) return I18N.serviceUnavailable[lang];
    const detail = err.message ? ` (${err.message})` : '';
    return `${I18N.operationFailed[lang]}${detail}`;
  }
}
