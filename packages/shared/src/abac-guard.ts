import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ABAC_ATTRIBUTES_KEY = 'ABAC_ATTRIBUTES';

export interface AbacAttributesMetadata {
  attributes: string[];
  requireAll?: boolean;
  requireTenantMatch?: boolean;
  requireOrganizationMatch?: boolean;
  requireCapability?: string[];
}

/**
 * Mark a route or controller as requiring specific user attributes, roles or permissions.
 */
export const RequireAttributes = (attributes: string[], requireAll = true) =>
  SetMetadata(ABAC_ATTRIBUTES_KEY, { attributes, requireAll });

/**
 * Mark a route or controller as requiring organization capability and tenant/org alignment.
 */
export const RequirePolicyAccess = (opts: { capability?: string[]; organizationMatch?: boolean; tenantMatch?: boolean }) =>
  SetMetadata(ABAC_ATTRIBUTES_KEY, { attributes: opts.capability || [], requireAll: true, requireTenantMatch: opts.tenantMatch !== false, requireOrganizationMatch: opts.organizationMatch, requireCapability: opts.capability });

/**
 * Attribute-Based Access Control (ABAC) Guard
 * Checks if the user has the required attributes/permissions for the resource
 */
@Injectable()
export class AbacGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      return true;
    }

    const metadata = this.reflector?.getAllAndOverride<AbacAttributesMetadata>(ABAC_ATTRIBUTES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const tenantId = request?.tenantId || request?.body?.tenantId || request?.query?.tenantId;
    if (tenantId && user.tenantId && user.tenantId !== tenantId && !['system', 'insurer_admin'].some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'ABAC_TENANT_MISMATCH', message: 'Tenant mismatch' },
      });
    }

    const organizationId = request?.params?.organizationId || request?.body?.organizationId || request?.query?.organizationId;
    if (metadata?.requireOrganizationMatch && organizationId && user.organizationId && user.organizationId !== organizationId && !['system', 'insurer_admin'].some((r) => user.roles?.includes(r))) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'ABAC_ORGANIZATION_MISMATCH', message: 'Organization mismatch' },
      });
    }

    const userAttributes = new Set<string>([
      ...(Array.isArray(user.attributes) ? user.attributes : []),
      ...(Array.isArray(user.permissions) ? user.permissions : []),
      ...(Array.isArray(user.roles) ? user.roles : []),
      ...(Array.isArray(user.capabilities) ? user.capabilities.map((c: string) => `capability:${c}`) : []),
    ]);

    const hasSystemPrivilege = userAttributes.has('system') || userAttributes.has('insurer_admin');
    if (hasSystemPrivilege) {
      return true;
    }

    const attributesToCheck = metadata?.attributes || [];
    if (attributesToCheck.length > 0) {
      const check = metadata?.requireAll
        ? attributesToCheck.every((attr) => userAttributes.has(attr))
        : attributesToCheck.some((attr) => userAttributes.has(attr));
      if (!check) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ABAC_ACCESS_DENIED',
            message: `Access denied: required attributes [${attributesToCheck.join(', ')}]`,
          },
        });
      }
    }

    const requiredCapabilities = metadata?.requireCapability || [];
    if (requiredCapabilities.length > 0) {
      const userCaps = new Set<string>(Array.isArray(user.capabilities) ? user.capabilities : []);
      const hasAllCapabilities = requiredCapabilities.every((cap) => userCaps.has(cap));
      if (!hasAllCapabilities) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'ABAC_CAPABILITY_MISSING', message: `Missing capabilities: [${requiredCapabilities.join(', ')}]` },
        });
      }
    }

    return true;
  }
}
