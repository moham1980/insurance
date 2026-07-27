import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // If no user (e.g., public endpoint), allow

    // Use tenantId from verified JWT payload
    const userTenantId = user.tenantId;
    if (!userTenantId) return true; // If user has no tenantId, allow (system-level user)

    // If request has a tenantId header, verify it matches JWT
    const headers = req.headers || {};
    const headerTenantId = headers['x-tenant-id'] || headers['X-Tenant-Id'];
    if (headerTenantId && headerTenantId !== userTenantId) {
      return false; // Tenant mismatch - reject
    }

    // Set tenantId on request for downstream use
    req.tenantId = userTenantId;
    return true;
  }
}
