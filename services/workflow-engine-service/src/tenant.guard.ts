import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

const SYSTEM_ROLES = new Set(['system', 'system_admin', 'platform_admin']);

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;

    const userTenantId = user.tenantId;
    const isSystem = Array.isArray(user.roles) && user.roles.some((r: string) => SYSTEM_ROLES.has(r));

    if (!userTenantId && !isSystem) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant identifier is required for non-system users' },
      });
    }

    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_MISMATCH', message: 'Request tenant does not match authenticated tenant' },
      });
    }

    // Allow system users to supply a target tenant via header; otherwise require tenant.
    const effectiveTenantId = (isSystem && headerTenantId) ? headerTenantId : userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant identifier is required' },
      });
    }

    req.tenantId = effectiveTenantId;
    return true;
  }
}
