import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const token = authHeader.substring(7);
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    const secret = process.env.JWT_SECRET;

    try {
      const decoded = jwt.verify(token, secret) as any;
      req.user = decoded;
      return true;
    } catch (err) {
      throw new UnauthorizedException({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  }
}
