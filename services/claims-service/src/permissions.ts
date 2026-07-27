export type PermissionKey =
  | 'claims:register'
  | 'claims:view'
  | 'claims:assess'
  | 'claims:approve'
  | 'claims:reject'
  | 'claims:pay'
  | 'claims:close'
  | 'claims:list'
  | 'claims:refer_adjuster';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['claims:register', 'claims:view', 'claims:assess', 'claims:approve', 'claims:reject', 'claims:pay', 'claims:close', 'claims:list', 'claims:refer_adjuster'],
  head_office_ops: ['claims:view', 'claims:list', 'claims:pay'],
  branch_manager: ['claims:view', 'claims:list', 'claims:approve', 'claims:refer_adjuster'],
  branch_staff: ['claims:view', 'claims:list'],
  claims_handler: ['claims:register', 'claims:view', 'claims:list', 'claims:assess', 'claims:approve', 'claims:reject', 'claims:close', 'claims:refer_adjuster'],
  loss_adjuster: ['claims:view', 'claims:list', 'claims:assess', 'claims:refer_adjuster'],
  finance_ops: ['claims:view', 'claims:list', 'claims:pay'],
  call_center: ['claims:register'],
  agency_owner: ['claims:register'],
  agency_staff: ['claims:register'],
  broker_owner: ['claims:register'],
  broker_staff: ['claims:register'],
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
