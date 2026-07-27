import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    this.jwtSecret = process.env.JWT_SECRET;
  }

  canActivate(context: ExecutionContext): boolean {
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
      const payload = jwt.verify(token, this.jwtSecret) as any;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  }
}
