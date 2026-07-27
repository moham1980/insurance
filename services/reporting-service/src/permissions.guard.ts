import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { permissionsForRoles, type PermissionKey } from './permissions';
import { REQUIRE_PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as any;
    const roles = user?.roles as string[] | undefined;
    const perms = permissionsForRoles(roles);

    const missing = required.filter((p) => !perms.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: `Missing permissions: ${missing.join(', ')}` },
      });
    }

    return true;
  }
}
