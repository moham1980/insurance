import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { permissionsForRoles, type PermissionKey } from './permissions';
import { checkActionSodViolation } from './sod.rules';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user as any;
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });
    }

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const servicePermissions: string[] = user.tokenType === 'service' && Array.isArray(user?.permissions) ? user.permissions : [];

    // Action-level SoD check: if the first required permission triggers a conflict, deny.
    const sodViolation = checkActionSodViolation(roles, required[0]);
    if (sodViolation && sodViolation.severity === 'error') {
      throw new ForbiddenException({
        success: false,
        error: { code: 'SOD_VIOLATION', message: `SoD violation: ${sodViolation.name}` },
      });
    }

    const rolePerms = permissionsForRoles(roles);
    const ok = required.every((p) => rolePerms.includes(p) || servicePermissions.includes(p));
    if (!ok) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Forbidden' },
      });
    }

    return true;
  }
}
