import { Injectable } from '@nestjs/common';

/** Service d'OTP — génération et validation (Redis, TTL 5 min). */
@Injectable()
export class OtpService {
  private readonly ttlSeconds = 300;

  constructor(private readonly redis: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<'OK'>;
    del(key: string): Promise<number>;
  }) {}

  generate(phone: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 chiffres
    return this.redis.set(`otp:${phone}`, code, this.ttlSeconds).then(() => code);
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored) return false;
    const ok = stored === code;
    if (ok) await this.redis.del(`otp:${phone}`);
    return ok;
  }
}
