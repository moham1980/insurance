import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';

/**
 * Admin guard for partner-gateway management endpoints.
 * Requires a verified JWT (set by JwtAuthGuard) with either admin role or admin permission.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required for admin endpoint' },
      });
    }

    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    const scopes: string[] = Array.isArray(user.scopes) ? user.scopes : (user.scope ? user.scope.split(' ') : []);

    const hasAdminRole = roles.some((r) => String(r).toLowerCase() === 'admin' || String(r).toLowerCase() === 'platform-admin');
    const hasAdminPermission = permissions.some((p) => String(p).toLowerCase() === 'admin' || String(p).toLowerCase() === 'partner:manage');
    const hasAdminScope = scopes.some((s) => String(s).toLowerCase() === 'admin' || String(s).toLowerCase() === 'partner:manage');

    if (hasAdminRole || hasAdminPermission || hasAdminScope) {
      return true;
    }

    throw new ForbiddenException({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin permission required' },
    });
  }
}
