import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      // Fail-closed: unauthenticated requests are rejected (EcosystemJwtGuard should run first)
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });
    }

    const roles: string[] = user.roles || [];
    const tenantId: string | undefined = user.tenantId;
    const method = req.method;

    // P0: Validate tenantId for ALL methods (including GET) — fail-closed if missing
    if (!tenantId) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Missing tenantId in user context' },
      });
    }

    // State-changing operations require specific roles
    if (method !== 'GET') {
      const adminRoles = ['insurer_admin', 'head_office_ops', 'system_admin'];
      const hasAdmin = roles.some(r => adminRoles.includes(r));

      // If user has admin role, allow all operations
      if (hasAdmin) return true;

      // For non-admin users, allow if they have any role (basic ABAC check)
      // More granular checks can be added per-service
      if (roles.length === 0) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions for state-changing operation' },
        });
      }
    }

    return true;
  }
}
