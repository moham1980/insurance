import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  private getCorrelationId(headers: Record<string, any> | undefined): string {
    const cid = headers?.['x-correlation-id'] || headers?.['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  constructor() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    this.jwtSecret = process.env.JWT_SECRET;
  }

  canActivate(context: ExecutionContext): boolean {
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
