import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const headerTenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];

    if (!user) return true;

    const userTenantId = user.tenantId || user.tenant_id;

    if (userTenantId && headerTenantId && userTenantId !== headerTenantId) {
      throw new ForbiddenException('Tenant mismatch: user does not belong to the requested tenant');
    }

    return true;
  }
}
