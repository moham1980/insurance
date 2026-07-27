import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // Public/unauthenticated endpoints bypass tenant guard

    // Service tokens are not tenant-scoped
    if (user.tokenType === 'service' || (Array.isArray(user.scopes) && user.scopes.length > 0 && !user.userId)) {
      return true;
    }

    // All authenticated user tokens must contain a tenantId
    const userTenantId = user.tenantId;
    if (!userTenantId) {
      return false;
    }

    // If request has a tenantId header, verify it matches the JWT claim
    const headerTenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      return false; // Tenant mismatch - reject
    }

    // Set tenantId on request for downstream use
    req.tenantId = userTenantId;
    return true;
  }
}
