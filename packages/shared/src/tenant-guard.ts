import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const SYSTEM_ROLES = new Set(['system', 'system_admin', 'insurer_admin']);

function isServiceOrSystemUser(user: any): boolean {
  if (!user) return false;

  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.some((role: string) => SYSTEM_ROLES.has(role))) return true;

  if (user.system === true || user.sub === 'system' || user.clientId === 'system') return true;

  if (user.tokenType === 'service' || user.token_type === 'service') return true;

  // Machine-to-machine clients may carry scopes without a userId
  if (Array.isArray(user.scopes) && user.scopes.length > 0 && !user.userId) return true;

  return false;
}

/**
 * Tenant Guard
 * Ensures that the authenticated user can only access resources belonging to their tenant.
 * Authentication is handled by other guards; this guard only validates the tenant claim.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const headerTenantId = request.headers?.['x-tenant-id'] || request.headers?.['X-Tenant-Id'];

    // Public / unauthenticated endpoints are allowed through; auth is enforced elsewhere.
    if (!user) {
      return true;
    }

    // System and service accounts may be cross-tenant but should still attach a tenantId when present.
    if (isServiceOrSystemUser(user)) {
      const tenantId = user.tenantId || user.tenant_id || headerTenantId || request.tenantId;
      if (tenantId) {
        request.tenantId = tenantId;
      }
      return true;
    }

    const userTenantId = user.tenantId || user.tenant_id;
    if (!userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'Tenant identifier required',
        },
      });
    }

    if (headerTenantId && headerTenantId !== userTenantId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'x-tenant-id header does not match the authenticated tenant',
        },
      });
    }

    request.tenantId = userTenantId;
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
