import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;

    const userTenantId = user.tenantId;
    if (!userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'User token must contain a tenantId' },
      });
    }

    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_MISMATCH', message: 'x-tenant-id header does not match token tenantId' },
      });
    }

    req.tenantId = userTenantId;
    return true;
  }
}
