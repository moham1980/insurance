import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ABAC_ATTRIBUTES_KEY = 'ABAC_ATTRIBUTES';

export interface AbacAttributesMetadata {
  attributes: string[];
  requireAll?: boolean;
}

/**
 * Mark a route or controller as requiring specific user attributes, roles or permissions.
 */
export const RequireAttributes = (attributes: string[], requireAll = true) =>
  SetMetadata(ABAC_ATTRIBUTES_KEY, { attributes, requireAll });

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

    if (!metadata || metadata.attributes.length === 0) {
      return true;
    }

    const userAttributes = new Set<string>([
      ...(Array.isArray(user.attributes) ? user.attributes : []),
      ...(Array.isArray(user.permissions) ? user.permissions : []),
      ...(Array.isArray(user.roles) ? user.roles : []),
    ]);

    const hasSystemPrivilege = userAttributes.has('system') || userAttributes.has('insurer_admin');
    if (hasSystemPrivilege) {
      return true;
    }

    const check = metadata.requireAll
      ? metadata.attributes.every((attr) => userAttributes.has(attr))
      : metadata.attributes.some((attr) => userAttributes.has(attr));

    if (!check) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ABAC_ACCESS_DENIED',
          message: `Access denied: required attributes [${metadata.attributes.join(', ')}]`,
        },
      });
    }

    return true;
  }
}
