import { Injectable } from '@nestjs/common';

export type UssdOp = 'BALANCE' | 'SEND' | 'BILL' | 'WITHDRAW';

export interface UssdSession {
  phone: string;
  op: UssdOp | null;
  step: number;
  data: Record<string, string>;
  lang: 'FR' | 'AR';
  expiresAt: number;
}

/**
 * Sessions USSD stateful (Redis, TTL 180 s — spec GOURSI-027a).
 * En phase 0 : store en mémoire avec TTL ; en staging : Redis (ioredis).
 */
@Injectable()
export class UssdSessionStore {
  private readonly ttlMs = 180_000;
  private readonly sessions = new Map<string, UssdSession>();

  get(phone: string): UssdSession | undefined {
    const s = this.sessions.get(phone);
    if (!s) return undefined;
    if (Date.now() > s.expiresAt) {
      this.sessions.delete(phone);
      return undefined;
    }
    return s;
  }

  create(phone: string, lang: 'FR' | 'AR'): UssdSession {
    const session: UssdSession = {
      phone,
      op: null,
      step: 0,
      data: {},
      lang,
      expiresAt: Date.now() + this.ttlMs,
    };
    this.sessions.set(phone, session);
    return session;
  }

  update(session: UssdSession) {
    session.expiresAt = Date.now() + this.ttlMs;
    this.sessions.set(session.phone, session);
  }

  delete(phone: string) {
    this.sessions.delete(phone);
  }
}
