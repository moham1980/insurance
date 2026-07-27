import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user as any;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];

    const hasRole = requiredRoles.some((r) => roles.includes(r));
    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: required role not present' },
      });
    }

    return true;
  }
}
