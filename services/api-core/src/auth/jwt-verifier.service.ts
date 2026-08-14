import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type GetPublicKeyOrSecret } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

/**
 * Vérification des JWT Keycloak (RS256) via JWKS (GOURSI-020b).
 * - la clé publique est résolue dynamiquement par le kid du token (jwks-rsa) ;
 * - issuer contrôlé (= JWT_ISSUER) — aucun token étranger n'est accepté ;
 * - rôles extraits de realm_access.roles (convention Keycloak).
 */
@Injectable()
export class JwtVerifierService {
  private readonly jwksClient: JwksClient;
  private readonly issuer: string;

  constructor(config: ConfigService) {
    this.issuer = config.get<string>('JWT_ISSUER') ?? '';
    if (!this.issuer) {
      throw new Error('JWT_ISSUER manquant — refus de démarrer (GOURSI-020b)');
    }
    const jwksUrl = config.get<string>('JWKS_URL') ?? '';
    if (!jwksUrl) {
      throw new Error('JWKS_URL manquant — refus de démarrer (GOURSI-020b)');
    }
    this.jwksClient = new JwksClient({ jwksUri: jwksUrl, cache: true, rateLimit: true });
  }

  /**
   * Valide un token Bearer et retourne { sub, roles }.
   * @throws Error si le token est invalide, expiré, mal signé ou d'un autre issuer.
   */
  async verify(bearerToken: string): Promise<{ sub: string; roles: string[] }> {
    const getKey: GetPublicKeyOrSecret = (header, callback) => {
      if (!header.kid) {
        callback(new Error('JWT sans kid'));
        return;
      }
      this.jwksClient
        .getSigningKey(header.kid)
        .then((key) => callback(null, key.getPublicKey()))
        .catch((err: unknown) => callback(err as Error));
    };

    return new Promise((resolve, reject) => {
      jwt.verify(
        bearerToken,
        getKey,
        { issuer: this.issuer, algorithms: ['RS256'] },
        (err, decoded) => {
          if (err || !decoded || typeof decoded === 'string') {
            reject(err ?? new Error('Token non décodable'));
            return;
          }
          const payload = decoded as jwt.JwtPayload;
          const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
          resolve({ sub: payload.sub ?? '', roles: realmAccess?.roles ?? [] });
        },
      );
    });
  }
}
