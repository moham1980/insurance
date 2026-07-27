import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class EcosystemJwtGuard implements CanActivate {
  private readonly logger = new Logger(EcosystemJwtGuard.name);
  private readonly jwtSecret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwksClient: JwksClient;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.issuer = process.env.IAM_ISSUER || 'http://localhost:8080';
    const audienceEnv = process.env.JWT_AUDIENCES || process.env.JWT_AUDIENCE || 'insurance-platform';
    this.audience = audienceEnv.split(',')[0].trim();
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
        request.user = this.normalizeUser(payload);
        return true;
      }
    } catch (jwksErr: any) {
      this.logger.debug(`JWKS validation failed, falling back to local JWT: ${jwksErr.message}`);
    }

    // Fallback to local HS256 JWT
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      request.user = this.normalizeUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  }

  private normalizeUser(payload: any): any {
    const roles = Array.isArray(payload?.roles)
      ? payload.roles
      : payload?.role
        ? [payload.role]
        : payload?.roles?.split?.(' ') || [];
    return {
      ...payload,
      userId: payload?.userId || payload?.sub || payload?.preferred_username,
      tenantId: payload?.tenantId || payload?.tenant_id,
      roles,
    };
  }
}
