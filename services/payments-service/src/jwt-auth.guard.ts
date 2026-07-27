import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';

interface JwkKey {
  kid: string;
  kty: string;
  n?: string;
  e?: string;
  [key: string]: any;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwksUri: string;
  private readonly jwksCache = new Map<string, string>();
  private jwksExpiry = 0;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.issuer = process.env.IAM_ISSUER || 'http://localhost:8080';
    this.audience = process.env.JWT_AUDIENCES || 'insurance-platform';
    this.jwksUri = process.env.JWKS_URI || `${this.issuer}/.well-known/jwks.json`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request?.headers?.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authorization token required',
      });
    }

    const token = authHeader.substring(7);

    // Try JWKS-based RS256 validation first (ecosystem tokens from iam-service)
    try {
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (decoded?.header?.alg === 'RS256' && decoded?.header?.kid) {
        const signingKey = await this.getSigningKey(decoded.header.kid);
        const payload = jwt.verify(token, signingKey, {
          issuer: this.issuer,
          audience: this.audience,
          algorithms: ['RS256'],
        }) as any;
        request.user = this.normalizePayload(payload);
        return true;
      }
    } catch (jwksErr: any) {
      this.logger.debug(`JWKS validation failed, falling back to local JWT: ${jwksErr?.message || jwksErr}`);
    }

    // Fallback to local HS256 JWT
    if (!this.jwtSecret) {
      throw new UnauthorizedException({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'JWT_SECRET not configured for HS256 fallback',
      });
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256'],
      }) as any;
      request.user = this.normalizePayload(payload);
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }
  }

  private async getSigningKey(kid: string): Promise<string> {
    const cached = this.jwksCache.get(kid);
    if (cached && Date.now() < this.jwksExpiry) {
      return cached;
    }

    const response = await fetch(this.jwksUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`);
    }

    const jwks = (await response.json()) as any;
    const keys: JwkKey[] = Array.isArray(jwks?.keys) ? jwks.keys : [];

    for (const key of keys) {
      if (key.kty !== 'RSA' || !key.n || !key.e || !key.kid) continue;
      const publicKey = createPublicKey({
        key: { kty: 'RSA', n: key.n, e: key.e },
        format: 'jwk',
      });
      const pem = publicKey.export({ format: 'pem', type: 'spki' }).toString('utf8');
      this.jwksCache.set(key.kid, pem);
    }

    this.jwksExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes cache

    const resolved = this.jwksCache.get(kid);
    if (!resolved) {
      throw new Error(`Signing key ${kid} not found in JWKS`);
    }
    return resolved;
  }

  private normalizePayload(payload: any): any {
    if (payload.tenant_id && !payload.tenantId) {
      payload.tenantId = payload.tenant_id;
    }
    if (payload.sub && !payload.userId) {
      payload.userId = payload.sub;
    }
    if (Array.isArray(payload.scope)) {
      payload.permissions = payload.scope;
    } else if (typeof payload.scope === 'string') {
      payload.permissions = payload.scope.split(' ');
    }
    if (!payload.roles) {
      payload.roles = payload.authorities || payload.permission || [];
    }
    return payload;
  }
}
