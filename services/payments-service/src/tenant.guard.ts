import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';

function isSystemUser(user: any): boolean {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return roles.includes('system') || user.system === true || user.sub === 'system' || user.clientId === 'system';
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const headerTenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const userTenantId = user.tenantId ?? user.tenant_id ?? null;

    if (userTenantId && headerTenantId && userTenantId !== headerTenantId) {
      throw new ForbiddenException('Tenant mismatch: user does not belong to the requested tenant');
    }

    const tenantId = userTenantId || headerTenantId;

    if (!tenantId && !isSystemUser(user)) {
      throw new ForbiddenException('Tenant identifier required');
    }

    request.tenantId = tenantId;
    if (userTenantId) {
      user.tenantId = userTenantId;
    }

    return true;
  }
}
