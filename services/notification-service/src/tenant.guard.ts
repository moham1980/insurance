import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // If no user (e.g., public endpoint), allow

    const userTenantId = user.tenantId;
    const isSystem = user.system === true || user.sub?.startsWith('system:');

    if (!userTenantId && !isSystem) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tenant required' },
      });
    }

    // If request has a tenantId header or body, verify it matches JWT
    const headerTenantId = req.headers['x-tenant-id'];
    const bodyTenantId = req.body?.tenantId;
    const requestedTenantId = headerTenantId || bodyTenantId;

    if (requestedTenantId && requestedTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tenant mismatch' },
      });
    }

    // Set tenantId on request for downstream use
    if (userTenantId) {
      req.tenantId = userTenantId;
    }
    return true;
  }
}
