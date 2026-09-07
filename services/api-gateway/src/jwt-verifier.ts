import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import {
  ALLOWED_ALGORITHMS,
  JWT_AUDIENCES,
  JWT_ISSUERS,
  JWKS_URI,
} from './gateway.config';

export interface VerifiedToken {
  userId?: string;
  sub?: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
  scopes?: string[];
  tokenType?: string;
}

export interface JwtVerificationError {
  code: 'GATEWAY_MISCONFIGURED' | 'UNAUTHORIZED';
  message: string;
}

class JwtVerifier {
  private readonly jwtSecret: string | undefined;
  private readonly jwksClient: JwksClient | null;
  private readonly tenantUuidMap: Record<string, string>;

  private parseTenantUuidMap(raw?: string): Record<string, string> {
    const map: Record<string, string> = {};
    if (!raw) return map;
    for (const pair of raw.split(',')) {
      const [key, value] = pair.split(':');
      if (key && value) map[key.trim()] = value.trim();
    }
    return map;
  }

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.tenantUuidMap = this.parseTenantUuidMap(process.env.TENANT_UUID_MAP);
    this.jwksClient = new JwksClient({
      jwksUri: JWKS_URI,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Verify a JWT token with issuer/audience/algorithm policy.
   *
   * - RS256 tokens are validated against the configured JWKS endpoint.
   * - HS256 tokens are validated against the local JWT_SECRET.
   * - Issuer and audience are always validated.
   * - Algorithm is selected from the token header, never from the token claims.
   */
  async verify(token: string): Promise<{ verified: VerifiedToken } | { error: JwtVerificationError }> {
    const decoded = jwt.decode(token, { complete: true }) as { header?: { alg?: string; kid?: string }; payload?: any } | null;
    if (!decoded?.header?.alg) {
      return { error: { code: 'UNAUTHORIZED', message: 'Invalid token format' } };
    }

    const alg = decoded.header.alg;
    if (!ALLOWED_ALGORITHMS.includes(alg)) {
      return { error: { code: 'UNAUTHORIZED', message: 'Token algorithm not allowed' } };
    }

    if (alg === 'RS256') {
      return this.verifyRs256(token, decoded.header.kid);
    }

    return this.verifyHs256(token);
  }

  private async verifyRs256(token: string, kid: string | undefined): Promise<{ verified: VerifiedToken } | { error: JwtVerificationError }> {
    if (!kid) {
      return { error: { code: 'UNAUTHORIZED', message: 'RS256 token missing key id' } };
    }

    let signingKey: string;
    try {
      const key = await this.jwksClient!.getSigningKey(kid);
      signingKey = key.getPublicKey();
    } catch (err: any) {
      return { error: { code: 'UNAUTHORIZED', message: `Unable to retrieve signing key: ${err?.message || err}` } };
    }

    return this.verifyWithSecret(token, signingKey, 'RS256');
  }

  private verifyHs256(token: string): Promise<{ verified: VerifiedToken } | { error: JwtVerificationError }> {
    if (!this.jwtSecret) {
      return Promise.resolve({ error: { code: 'GATEWAY_MISCONFIGURED', message: 'JWT_SECRET is not configured' } });
    }
    return Promise.resolve(this.verifyWithSecret(token, this.jwtSecret, 'HS256'));
  }

  private verifyWithSecret(
    token: string,
    secretOrKey: string,
    algorithm: string,
  ): { verified: VerifiedToken } | { error: JwtVerificationError } {
    const lastErrors: string[] = [];

    for (const issuer of JWT_ISSUERS) {
      for (const audience of JWT_AUDIENCES) {
        try {
          const payload = jwt.verify(token, secretOrKey, {
            issuer,
            audience,
            algorithms: [algorithm as jwt.Algorithm],
          }) as any;

          const scopes = payload.scope ? String(payload.scope).split(' ') : [];
          const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
          const roles = Array.isArray(payload.roles) ? payload.roles : [];

          return {
            verified: {
              userId: payload.userId || payload.sub,
              sub: payload.sub,
              tenantId: this.tenantUuidMap[payload.tenantId || payload.tenant] || payload.tenantId || payload.tenant,
              roles,
              permissions: [...permissions, ...scopes],
              scopes,
              tokenType: payload.tokenType,
            },
          };
        } catch (err: any) {
          lastErrors.push(`iss=${issuer}, aud=${audience}: ${err?.message || 'verify failed'}`);
        }
      }
    }

    return { error: { code: 'UNAUTHORIZED', message: lastErrors[lastErrors.length - 1] || 'Invalid or expired token' } };
  }
}

export const jwtVerifier = new JwtVerifier();
