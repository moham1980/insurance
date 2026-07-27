import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // If no user (e.g., public endpoint), allow

    const userTenantId = user.tenantId;
    const roles: string[] = user.roles || [];
    const isSystemUser = roles.includes('system_admin') || roles.includes('service') || user.clientId === 'system';

    if (!userTenantId && !isSystemUser) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tenant identifier is required' },
      });
    }

    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (userTenantId && headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tenant header does not match token' },
      });
    }

    const effectiveTenantId = headerTenantId || userTenantId;
    if (effectiveTenantId) {
      req.tenantId = effectiveTenantId;
    }
    return true;
  }
}
