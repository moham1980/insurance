import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  private readonly restrictedActions = ['approve', 'reject', 'pay', 'close', 'refer-to-adjuster'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) return true;

    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    if (roles.length === 0) return true;

    if (roles.includes('insurer_admin') || roles.includes('auditor')) return true;

    const method = request.method || request.raw?.method;
    if (method === 'GET') return true;

    // Works with both Express (request.url) and Fastify (request.raw.url / routerPath)
    const path = request.url || request.routerPath || request.raw?.url || '';
    const isRestricted = this.restrictedActions.some((a) => path.includes(`/${a}`));

    if (isRestricted && !roles.some((r) => ['head_office_ops', 'branch_manager', 'finance_ops'].includes(r))) {
      throw new ForbiddenException('ABAC: insufficient role for this action');
    }

    return true;
  }
}
