import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;

    const roles: string[] = user.roles || [];
    const method = req.method;

    // Read-only operations are allowed for all authenticated users
    if (method === 'GET') return true;

    // State-changing operations require an admin or regulatory ops role
    const privilegedRoles = ['insurer_admin', 'head_office_ops', 'system_admin', 'regulatory_ops'];
    const isPrivileged = roles.some(r => privilegedRoles.includes(r));
    if (!isPrivileged) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'State-changing operation requires elevated privileges' },
      });
    }

    return true;
  }
}
