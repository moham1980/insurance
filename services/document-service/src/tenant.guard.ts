import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tenant verification requires an authenticated user' },
      });
    }

    const userTenantId = user.tenantId;
    const roles: string[] = user.roles || [];
    const isSystem = roles.includes('system') || user.system === true;

    if (!userTenantId && !isSystem) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'User must belong to a tenant' },
      });
    }

    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_MISMATCH', message: 'Request tenant ID does not match user tenant' },
      });
    }

    req.tenantId = userTenantId;
    return true;
  }
}
