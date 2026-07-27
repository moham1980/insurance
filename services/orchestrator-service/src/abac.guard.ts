import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      return true; // public / unguarded endpoint
    }

    const scopes: string[] = req.scopes || user.scope?.split(' ') || [];
    const roles: string[] = user.roles || [];
    const method = req.method;

    const hasAdmin = scopes.includes('orchestrator:admin') || roles.includes('system_admin');
    if (hasAdmin) return true;

    if (method === 'GET') {
      if (!(scopes.includes('orchestrator:read') || scopes.includes('orchestrator:write'))) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Missing orchestrator:read scope' },
        });
      }
      return true;
    }

    if (!scopes.includes('orchestrator:write')) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Missing orchestrator:write scope' },
      });
    }

    return true;
  }
}
