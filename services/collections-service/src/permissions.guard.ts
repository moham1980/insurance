import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from './permissions.decorator';
import type { PermissionKey } from './permissions';
import { permissionsForRoles } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user as any;
    const roles = Array.isArray(user?.roles) ? user.roles : typeof user?.role === 'string' ? [user.role] : [];
    const perms = permissionsForRoles(roles);

    const ok = required.every((p) => perms.includes(p));
    if (!ok) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    return true;
  }
}
