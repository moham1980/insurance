import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Unauthenticated / public endpoints are not tenant-scoped here
    if (!user) return true;

    const userTenantId = user.tenantId;
    if (!userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
      });
    }

    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && String(headerTenantId) !== String(userTenantId)) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_MISMATCH', message: 'Tenant header does not match authenticated tenant' },
      });
    }

    req.tenantId = userTenantId;
    return true;
  }
}
