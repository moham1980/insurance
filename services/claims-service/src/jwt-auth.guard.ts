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
    // Support comma-separated audiences (jsonwebtoken accepts string[] for multi-audience validation)
    if (typeof this.audience === 'string' && this.audience.includes(',')) {
      this.audience = this.audience.split(',').map((s) => s.trim()).filter(Boolean) as any;
    }
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

  private getCorrelationId(headers: Record<string, any> | undefined): string {
    const cid = headers?.['x-correlation-id'] || headers?.['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request?.headers?.authorization as string | undefined;
    const correlationId = this.getCorrelationId(request?.headers);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authorization token required' },
        correlationId,
      });
    }

    const token = authHeader.substring(7);

    // Try JWKS-based RS256 validation first (ecosystem tokens from iam-service)
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
        const rawTenant = payload.tenantId || payload.tenant_id || payload.tenant;
        request.user.tenantId = this.tenantUuidMap[rawTenant] || rawTenant;
        request.user.userId = payload.userId || payload.sub;
        request.globalUserId = payload.userId || payload.sub;
        request.tenantId = request.user.tenantId;
        request.scopes = payload.scope?.split(' ') || [];
        return true;
      }
    } catch (jwksErr: any) {
      this.logger.debug(`JWKS validation failed, falling back to local JWT: ${jwksErr?.message || jwksErr}`);
    }

    // Fallback to local HS256 JWT
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        correlationId,
      });
    }
  }
}
