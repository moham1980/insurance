import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request?.headers?.['x-tenant-id'] || request?.user?.tenantId;
    if (tenantId) {
      request.tenantId = tenantId;
    }
    return true;
  }
}
