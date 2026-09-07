import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;
  private readonly jwksClient: JwksClient;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly tenantUuidMap: Record<string, string>;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.issuer = process.env.IAM_ISSUER || 'http://localhost:8080';
    this.audience = process.env.JWT_AUDIENCES || 'modern-banking';
    if (typeof this.audience === 'string' && this.audience.includes(',')) { this.audience = this.audience.split(',').map((s) => s.trim()).filter(Boolean) as any; }
    const jwksUri = process.env.JWKS_URI || `${this.issuer}/.well-known/jwks.json`;
    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
    this.tenantUuidMap = this.parseTenantUuidMap(process.env.TENANT_UUID_MAP);
  }

  private parseTenantUuidMap(raw?: string): Record<string, string> {
    const map: Record<string, string> = {};
    if (!raw) return map;
    for (const pair of raw.split(',')) {
      const [key, value] = pair.split(':');
      if (key && value) map[key.trim()] = value.trim();
    }
    return map;
  }

  private resolveTenantId(payload: any, request: any): string | undefined {
    const rawTenant = payload.tenantId || payload.tenant;
    if (!rawTenant) return undefined;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTenant)) {
      return rawTenant;
    }
    if (this.tenantUuidMap[rawTenant]) {
      return this.tenantUuidMap[rawTenant];
    }
    const headerTenant = request?.headers?.['x-tenant-id'] || request?.headers?.['X-Tenant-Id'];
    if (headerTenant && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerTenant)) {
      return headerTenant;
    }
    return rawTenant;
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
        }) as any;
        request.user = payload;
        request.user.tenantId = this.resolveTenantId(payload, request);
        request.user.permissions = payload.scope?.split(' ') || [];
        request.globalUserId = payload.sub;
        request.scopes = payload.scope?.split(' ') || [];
        return true;
      }
    } catch (jwksErr: any) {
      this.logger.debug(`JWKS validation failed, falling back to local JWT: ${jwksErr.message}`);
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] }) as any;
      request.user = payload;
      request.user.tenantId = this.resolveTenantId(payload, request);
      request.user.permissions = payload.scope?.split(' ') || [];
      request.globalUserId = payload.sub;
      request.scopes = payload.scope?.split(' ') || [];
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  }
}
