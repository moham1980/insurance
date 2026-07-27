import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // Unauthenticated / public endpoints

    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const method = req.method;

    // Read-only operations allowed for any authenticated user within tenant
    if (method === 'GET') return true;

    const adminRoles = ['insurer_admin', 'head_office_ops', 'system_admin'];
    const hasAdmin = roles.some((r) => adminRoles.includes(r));
    if (hasAdmin) return true;

    if (roles.length === 0) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No roles assigned' },
      });
    }

    // Non-admin state-changing operations restricted; granular permission guard handles resources
    return true;
  }
}
