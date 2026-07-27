export type PermissionKey = 'party:create' | 'party:view' | 'party:list' | 'kyc:review' | 'kyc:submit' | 'kyc:verify' | 'kyc:screen' | 'kyc:escalate' | 'kyc:list' | 'kyc:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['party:create', 'party:view', 'party:list', 'kyc:review', 'kyc:submit', 'kyc:verify', 'kyc:screen', 'kyc:escalate', 'kyc:list', 'kyc:view'],
  compliance_aml: ['party:view', 'party:list', 'kyc:review', 'kyc:verify', 'kyc:screen', 'kyc:list', 'kyc:view'],
  risk_manager: ['party:view', 'party:list', 'kyc:verify', 'kyc:screen', 'kyc:escalate', 'kyc:list', 'kyc:view'],
  head_office_ops: ['party:create', 'party:view', 'party:list', 'kyc:submit', 'kyc:verify', 'kyc:list', 'kyc:view'],
  branch_manager: ['party:create', 'party:view', 'party:list', 'kyc:submit', 'kyc:verify', 'kyc:list', 'kyc:view'],
  branch_staff: ['party:create', 'party:view', 'party:list', 'kyc:submit'],
  call_center: ['party:create', 'party:view', 'kyc:submit'],
  auditor: ['party:view', 'party:list', 'kyc:list', 'kyc:view'],
};

export function permissionsForRoles(roles: string[] | undefined | null): PermissionKey[] {
  const rs = Array.isArray(roles) ? roles : [];
  const out = new Set<PermissionKey>();
  for (const r of rs) {
    const perms = ROLE_TO_PERMISSIONS[r];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}
