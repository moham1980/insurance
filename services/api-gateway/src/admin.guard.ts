import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ADMIN_PERMISSION, ADMIN_ROLE } from './gateway.config';

export interface GatewayUser {
  userId?: string;
  sub?: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
  scopes?: string[];
  tokenType?: string;
}

/**
 * Admin guard for gateway operational endpoints such as circuit breaker reset.
 *
 * Requires a verified JWT with either the configured admin role or admin permission.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: GatewayUser | undefined = request.user;

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required for admin endpoint' },
      });
    }

    const hasAdminRole = user.roles?.some((r) => String(r).toLowerCase() === ADMIN_ROLE.toLowerCase());
    const hasAdminPermission = user.permissions?.some((p) => String(p).toLowerCase() === ADMIN_PERMISSION.toLowerCase());
    const hasAdminScope = user.scopes?.some((s) => String(s).toLowerCase() === ADMIN_PERMISSION.toLowerCase());

    if (hasAdminRole || hasAdminPermission || hasAdminScope) {
      return true;
    }

    throw new ForbiddenException({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin permission required' },
    });
  }
}
