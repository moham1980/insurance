import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Tenant Guard
 * Ensures that the authenticated user can only access resources belonging to their tenant
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const resourceTenantId = request.resourceTenantId;

    // If no user is present, allow (authentication is handled by other guards)
    if (!user) {
      return true;
    }

    // Get user's tenant ID
    const userTenantId = user.tenantId;

    // If resource has a tenant ID, verify it matches user's tenant
    if (resourceTenantId && userTenantId !== resourceTenantId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'CROSS_TENANT_ACCESS_DENIED',
          message: 'Access denied: Resource belongs to a different tenant',
        },
      });
    }

    // Verify request tenant ID matches user's tenant
    const requestTenantId = request.tenantId || request.headers['x-tenant-id'];
    if (requestTenantId && userTenantId !== requestTenantId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'Request tenant ID does not match user tenant',
        },
      });
    }

    return true;
  }
}

/**
 * Decorator to mark a parameter as the resource tenant ID
 * Used by TenantGuard to verify tenant isolation
 */
export const ResourceTenantId = () => (target: any, propertyKey: string, parameterIndex: number) => {
  Reflect.defineMetadata('resourceTenantId', parameterIndex, target, propertyKey);
};
