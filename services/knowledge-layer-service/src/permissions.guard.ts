import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { permissionsForRoles, type PermissionKey } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private getCorrelationId(headers: Record<string, any> | undefined): string {
    const cid = headers?.['x-correlation-id'] || headers?.['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const correlationId = this.getCorrelationId(request?.headers);
    const user = request?.user as any;
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
        correlationId,
      });
    }

    const perms = Array.isArray(user.permissions)
      ? user.permissions.map((x: any) => String(x || '').trim()).filter(Boolean)
      : permissionsForRoles(user.roles);
    const ok = required.every((p) => perms.includes(p));
    if (!ok) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Forbidden' },
        correlationId,
      });
    }

    return true;
  }
}
