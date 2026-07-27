import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // public endpoint, allow other guards to handle it

    const userTenantId = user.tenantId;
    if (!userTenantId) return true; // system-level user without tenant scope

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
