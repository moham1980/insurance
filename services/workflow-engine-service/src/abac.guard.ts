import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionKey } from './permissions';

/**
 * ABAC guard enforcing that state-changing operations require explicit permissions.
 * It does NOT bypass RBAC: it reads @RequirePermissions metadata and ensures the
 * user has at least one of the listed permissions. The PermissionsGuard already
 * performs a similar RBAC check, so this guard is kept as a defence-in-depth layer.
 */
@Injectable()
export class AbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;

    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const perms = Array.isArray(user.permissions)
      ? user.permissions.map((x: any) => String(x || '').trim()).filter(Boolean)
      : [];

    const ok = required.some((p) => perms.includes(p));
    if (!ok) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions for this action' },
      });
    }
    return true;
  }
}
