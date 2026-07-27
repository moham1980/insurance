import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) return true;

    const userTenantId = user.tenantId || user.tenant_id;
    const headerTenantId = request.headers?.['x-tenant-id'] || request.headers?.['X-Tenant-Id'];

    if (headerTenantId && userTenantId && userTenantId !== headerTenantId) {
      throw new ForbiddenException('Tenant mismatch: user does not belong to the requested tenant');
    }

    const tenantId = userTenantId || headerTenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    user.tenantId = tenantId;
    request.tenantId = tenantId;
    return true;
  }
}
