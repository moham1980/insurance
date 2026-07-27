import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      throw new UnauthorizedException('ABAC: user context required');
    }

    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const tenantId = user.tenantId || user.tenant_id;
    if (!tenantId) {
      throw new ForbiddenException('ABAC: tenant context required');
    }

    // Global admins bypass ABAC checks but still need tenant matching (handled by TenantGuard)
    if (roles.includes('insurer_admin') || roles.includes('superadmin')) return true;

    const method = request.method;
    const path = request.url || '';

    // Map HTTP method to action
    const action = method === 'GET' ? 'read' : 'write';

    // Resource-specific checks based on path
    const isKycAction = path.includes('/kyc/') || path.includes('/aml-consent') || path.includes('/document-trust-chain') || path.includes('/identity-proofing') || path.includes('/external-verification');
    const isSensitiveAction = ['review', 'approve', 'reject', 'escalate', 'verify', 'assign', 'resolve'].some(a => path.includes(`/${a}`));

    if (action === 'write' && isKycAction && isSensitiveAction) {
      if (!roles.some(r => ['head_office_ops', 'compliance_officer', 'branch_manager', 'kyc_reviewer'].includes(r))) {
        throw new ForbiddenException('ABAC: insufficient role for sensitive KYC action');
      }
    }

    if (action === 'write' && path.includes('/kyc-exception')) {
      if (!roles.some(r => ['head_office_ops', 'compliance_officer', 'branch_manager', 'kyc_reviewer'].includes(r))) {
        throw new ForbiddenException('ABAC: insufficient role for exception management');
      }
    }

    return true;
  }
}
