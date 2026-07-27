import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const headerTenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];

    if (!user) {
      throw new UnauthorizedException('User context required');
    }

    const userTenantId = user.tenantId || user.tenant_id;
    if (!userTenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    if (headerTenantId && userTenantId !== headerTenantId) {
      throw new ForbiddenException('Tenant mismatch: user does not belong to the requested tenant');
    }

    // Enforce tenant in request for downstream use
    user.tenantId = userTenantId;
    request.tenantId = userTenantId;

    return true;
  }
}
