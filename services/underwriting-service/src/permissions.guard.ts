import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from './permissions.decorator';
import { permissionsForRoles, PermissionKey } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) || [];

    const user = request.user as any;
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (required.length === 0) return true;

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const perms = permissionsForRoles(roles);

    for (const r of required) {
      if (perms.includes(r)) return true;
    }

    throw new ForbiddenException({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Missing required permission' },
    });
  }
}
