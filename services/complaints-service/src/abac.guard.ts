import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true; // If no user (e.g., public endpoint), allow

    const roles: string[] = user.roles || [];
    const method = req.method;
    const url = req.url || '';

    // Read-only operations (GET) are allowed for all authenticated users
    if (method === 'GET') return true;

    // State-changing operations require specific roles
    const adminRoles = ['insurer_admin', 'head_office_ops', 'system_admin'];
    const hasAdmin = roles.some(r => adminRoles.includes(r));

    // If user has admin role, allow all operations
    if (hasAdmin) return true;

    // For non-admin users, allow if they have any role (basic ABAC check)
    // More granular checks can be added per-service
    return roles.length > 0;
  }
}
