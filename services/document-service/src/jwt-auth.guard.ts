import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

export interface EcosystemJwtPayload {
  sub: string;
  iss?: string;
  aud?: string;
  exp: number;
  iat: number;
  jti?: string;
  scope?: string;
  roles?: string[];
  tenantId?: string;
  userId?: string;
  preferred_username?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;
  private readonly jwksClient: JwksClient;
  private readonly issuer: string;
  private readonly audience: string;
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
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.issuer = process.env.IAM_ISSUER || 'http://localhost:8080';
    this.audience = process.env.JWT_AUDIENCES || 'modern-banking';
    if (typeof this.audience === 'string' && this.audience.includes(',')) { this.audience = this.audience.split(',').map((s) => s.trim()).filter(Boolean) as any; }
    this.tenantUuidMap = this.parseTenantUuidMap(process.env.TENANT_UUID_MAP);
    const jwksUri = process.env.JWKS_URI || `${this.issuer}/.well-known/jwks.json`;
    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request?.headers?.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization token required' },
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (decoded?.header?.alg === 'RS256' && decoded?.header?.kid) {
        const key = await this.jwksClient.getSigningKey(decoded.header.kid);
        const signingKey = key.getPublicKey();
        const payload = jwt.verify(token, signingKey, {
          issuer: this.issuer,
          audience: this.audience,
          algorithms: ['RS256'],
        }) as EcosystemJwtPayload;
        request.user = this.normalizeUser(payload);
        return true;
      }
    } catch (jwksErr) {
      this.logger.debug(`JWKS validation failed, falling back to local JWT: ${(jwksErr as Error).message}`);
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as EcosystemJwtPayload;
      request.user = this.normalizeUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  }

  private normalizeUser(payload: EcosystemJwtPayload): any {
    const rawTenant = (payload as any).tenantId || (payload as any).tenant_id || (payload as any).tenant;
    const tenantId = this.tenantUuidMap[rawTenant] || rawTenant;
    return {
      ...payload,
      userId: payload.userId || payload.sub,
      tenantId,
    };
  }
}
