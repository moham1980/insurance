import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { createPublicKey } from 'crypto';

interface CachedKey {
  publicKey: string;
  cachedAt: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksUri?: string;
  private readonly jwtSecret?: string;
  private readonly issuer?: string;
  private readonly audience?: string;
  private jwksCache: Map<string, CachedKey> = new Map();
  private jwksCacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  private getCorrelationId(headers: Record<string, any> | undefined): string {
    const cid = headers?.['x-correlation-id'] || headers?.['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  constructor() {
    this.jwksUri = process.env.IAM_JWKS_URI || process.env.JWKS_URI;
    this.jwtSecret = process.env.JWT_SECRET;
    this.issuer = process.env.JWT_ISSUER || process.env.IAM_ISSUER;
    this.audience = process.env.JWT_AUDIENCE || process.env.IAM_AUDIENCE;
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

    try {
      const decodedHeader = jwt.decode(token, { complete: true, json: true });
      if (!decodedHeader || typeof decodedHeader !== 'object') {
        throw new UnauthorizedException({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token format' },
          correlationId,
        });
      }

      const header = decodedHeader.header as { kid?: string; alg?: string };
      const algorithm = header?.alg || 'HS256';
      let payload: any;

      if (algorithm === 'RS256' || algorithm === 'RS384' || algorithm === 'RS512') {
        if (!this.jwksUri) {
          throw new UnauthorizedException({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'JWKS URI not configured for RS256 token' },
            correlationId,
          });
        }
        const kid = header?.kid;
        if (!kid) {
          throw new UnauthorizedException({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Token kid header missing' },
            correlationId,
          });
        }
        const publicKey = await this.getPublicKeyFromJwks(kid, correlationId);
        payload = jwt.verify(token, publicKey, {
          algorithms: [algorithm as any],
          issuer: this.issuer,
          audience: this.audience,
        });
      } else {
        if (!this.jwtSecret) {
          throw new UnauthorizedException({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'JWT secret not configured' },
            correlationId,
          });
        }
        payload = jwt.verify(token, this.jwtSecret, {
          algorithms: ['HS256'],
          issuer: this.issuer,
          audience: this.audience,
        });
      }

      request.user = payload;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        correlationId,
      });
    }
  }

  private async getPublicKeyFromJwks(kid: string, correlationId: string): Promise<string> {
    const cached = this.jwksCache.get(kid);
    if (cached && Date.now() - cached.cachedAt < this.jwksCacheExpiryMs) {
      return cached.publicKey;
    }

    if (!this.jwksUri) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'JWKS URI not configured' },
        correlationId,
      });
    }

    const response = await fetch(this.jwksUri);
    if (!response.ok) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Failed to fetch JWKS' },
        correlationId,
      });
    }

    const jwks = (await response.json()) as { keys?: any[] };
    if (!jwks.keys || jwks.keys.length === 0) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'JWKS keys empty' },
        correlationId,
      });
    }

    const key = jwks.keys.find((k: any) => k.kid === kid);
    if (!key) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Signing key not found' },
        correlationId,
      });
    }

    const publicKey = createPublicKey({ key: key, format: 'jwk' }).export({ format: 'pem', type: 'spki' }) as string;
    this.jwksCache.set(kid, { publicKey, cachedAt: Date.now() });
    return publicKey;
  }
}
