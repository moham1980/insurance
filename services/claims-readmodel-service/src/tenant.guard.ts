import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // Authentication handled by other guards

    const userTenantId = user.tenantId;
    if (!userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'User tenantId is required' },
      });
    }

    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_MISMATCH', message: 'Request tenant ID does not match user tenant' },
      });
    }

    req.tenantId = userTenantId;
    return true;
  }
}
