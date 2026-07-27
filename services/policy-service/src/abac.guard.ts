import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) return true;

    const roles: string[] = user.roles || [];
    if (roles.length === 0) return true;

    if (roles.includes('insurer_admin') || roles.includes('auditor')) return true;

    const method = request.method;
    if (method === 'GET') return true;

    const path = request.url || '';
    const restrictedActions = ['cancel', 'endorse', 'renew', 'delete'];
    const isRestricted = restrictedActions.some(a => path.includes(`/${a}`));

    if (isRestricted && !roles.some(r => ['head_office_ops', 'branch_manager', 'underwriter'].includes(r))) {
      throw new ForbiddenException('ABAC: insufficient role for this action');
    }

    return true;
  }
}
