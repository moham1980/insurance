import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

const RESOURCE_PERMISSIONS: Record<string, string[]> = {
  '/rm/claims': ['rm:claims:view'],
  '/rm/claims/': ['rm:claims:view'],
  '/rm/claims/summary': ['rm:claims:summary'],
  '/rm/fraud/cases': ['rm:fraud:view'],
  '/rm/complaints': ['rm:complaints:view'],
  '/rm/admin/rebuild': ['rm:claims:summary'],
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;

    const roles: string[] = user.roles || [];
    const tenantId: string | undefined = req.tenantId;
    const userTenantId: string | undefined = user.tenantId;

    // Cross-tenant hard block (second line of defense after TenantGuard)
    if (tenantId && userTenantId && tenantId !== userTenantId && !roles.includes('system_admin')) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'CROSS_TENANT_ACCESS_DENIED', message: 'Access denied: resource belongs to another tenant' },
      });
    }

    // Rebuild/admin endpoints restricted to admin/auditor
    const url: string = req.url || '';
    if (url.includes('/admin/')) {
      const allowed = ['insurer_admin', 'head_office_ops', 'system_admin', 'auditor'];
      if (!roles.some((r) => allowed.includes(r))) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin operation not allowed for this role' },
        });
      }
    }

    // Write methods require admin role in read-model service
    if (WRITE_METHODS.has(req.method) && !roles.some((r) => ['insurer_admin', 'head_office_ops', 'system_admin'].includes(r))) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Write operations require admin role' },
      });
    }

    const required = this.resolvePermissions(url);
    if (!required || required.length === 0) return true;

    const userPerms = this.permissionsForRoles(roles);
    const ok = required.every((p) => userPerms.includes(p));
    if (!ok) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions for this resource' },
      });
    }

    return true;
  }

  private resolvePermissions(url: string): string[] | null {
    for (const [prefix, perms] of Object.entries(RESOURCE_PERMISSIONS)) {
      if (url.startsWith(prefix)) return perms;
    }
    return null;
  }

  private permissionsForRoles(roles: string[]): string[] {
    const map: Record<string, string[]> = {
      insurer_admin: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
      head_office_ops: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
      claims_handler: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
      fraud_analyst: ['rm:claims:view', 'rm:fraud:view'],
      complaints_handler: ['rm:complaints:view'],
      legal_ops: ['rm:fraud:view', 'rm:complaints:view'],
      compliance_aml: ['rm:complaints:view'],
      auditor: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
      branch_manager: ['rm:claims:view', 'rm:claims:summary', 'rm:complaints:view'],
      branch_staff: ['rm:claims:view', 'rm:claims:summary'],
    };
    const out = new Set<string>();
    for (const r of roles) {
      const perms = map[r];
      if (!perms) continue;
      for (const p of perms) out.add(p);
    }
    return Array.from(out);
  }
}
