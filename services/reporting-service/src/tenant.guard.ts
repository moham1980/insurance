import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // If no user (e.g., public endpoint), allow

    // Use tenantId from verified JWT payload
    const userTenantId = user.tenantId;
    if (!userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant identifier is required' },
      });
    }

    // If request has a tenantId header, verify it matches JWT
    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'TENANT_MISMATCH', message: 'Tenant header does not match authenticated tenant' },
      });
    }

    // Set tenantId on request for downstream use
    req.tenantId = userTenantId;
    return true;
  }
}