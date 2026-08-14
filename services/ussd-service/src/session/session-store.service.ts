import { Inject, Injectable } from '@nestjs/common';
import { RedisClient, REDIS } from '../redis/redis.module';
import { Lang, MenuData, StepId } from '../menus/menu-tree';

/** TTL d'inactivité d'une session USSD (spec GOURSI-027a : 180 s, timeout 3 min). */
export const SESSION_TTL_SECONDS = 180;

/** Marqueur « session déjà vue » : permet de distinguer une session expirée d'une nouvelle session. */
export const SEEN_TTL_SECONDS = 24 * 60 * 60;

/**
 * Session USSD stateful, stockée dans Redis sous `ussd:session:<sessionId>`.
 * Valeur : JSON { msisdn, step, data }. Aucune donnée sensible (MPIN/OTP) n'est
 * conservée au-delà du besoin immédiat — l'OTP de retrait est une stub en MVP.
 */
export interface UssdSession {
  msisdn: string;
  step: StepId;
  lang?: Lang;
  data: MenuData;
}

/**
 * SessionStore (GOURSI-027a) : get/set/clear avec TTL 180 s + reprise si
 * l'utilisateur revient. `hasSeen` discrimine « session expirée » vs
 * « nouvelle session » (un nouveau *100# produit un nouveau sessionId côté passerelle).
 */
@Injectable()
export class SessionStoreService {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  private sessionKey(sessionId: string): string {
    return `ussd:session:${sessionId}`;
  }

  private seenKey(sessionId: string): string {
    return `ussd:seen:${sessionId}`;
  }

  async get(sessionId: string): Promise<UssdSession | null> {
    const raw = await this.redis.get(this.sessionKey(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UssdSession;
    } catch {
      return null;
    }
  }

  async set(sessionId: string, session: UssdSession): Promise<void> {
    await this.redis.set(this.sessionKey(sessionId), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
    await this.redis.set(this.seenKey(sessionId), '1', 'EX', SEEN_TTL_SECONDS);
  }

  async clear(sessionId: string): Promise<void> {
    await this.redis.del(this.sessionKey(sessionId));
  }

  /** true si ce sessionId a déjà été vu (session expirée ou terminée). */
  async hasSeen(sessionId: string): Promise<boolean> {
    return (await this.redis.exists(this.seenKey(sessionId))) === 1;
  }
}
