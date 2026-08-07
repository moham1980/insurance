import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

/**
 * Local JWT auth guard — validates Bearer token before forwarding to downstream services.
 * Supports both JWKS-based RS256 (ecosystem tokens) and local HS256 JWT.
 * Downstream services enforce full ABAC/tenant isolation.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;
  private readonly jwksClient: JwksClient | null;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    if (!process.env.JWT_SECRET && !process.env.JWKS_URI) throw new Error('JWT_SECRET or JWKS_URI is required');
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.issuer = process.env.IAM_ISSUER || 'http://localhost:18001';
    this.audience = process.env.JWT_AUDIENCES || 'insurance-platform';
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
        const key = await this.jwksClient!.getSigningKey(decoded.header.kid);
        const signingKey = key.getPublicKey();
        const payload = jwt.verify(token, signingKey, {
          issuer: this.issuer,
          audience: this.audience,
          algorithms: ['RS256'],
        }) as any;
        request.user = payload;
        request.globalUserId = payload.sub;
        request.scopes = payload.scope?.split(' ') || [];
        return true;
      }
    } catch (jwksErr) {
      this.logger.debug(`JWKS validation failed, falling back to local JWT: ${jwksErr?.message || jwksErr}`);
    }

    // Fallback to local HS256 JWT
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      request.user = payload;
      request.globalUserId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  }
}
