export type PermissionKey =
  | 'claims:register'
  | 'claims:view'
  | 'claims:assess'
  | 'claims:approve'
  | 'claims:reject'
  | 'claims:pay'
  | 'claims:close'
  | 'claims:list'
  | 'claims:refer_adjuster'
  | 'claims:advocacy:manage'
  | 'claims:advocacy:view'
  | 'claims:adjuster:refer'
  | 'claims:adjuster:respond'
  | 'claims:adjuster:submit_report'
  | 'claims:projection:view'
  | 'claims:projection:write'
  | 'claims:recovery:manage'
  | 'claims:document:attach'
  | 'claims:document:view'
  | 'claims:document:download';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'claims:register', 'claims:view', 'claims:assess', 'claims:approve', 'claims:reject', 'claims:pay',
    'claims:close', 'claims:list', 'claims:refer_adjuster',
    'claims:advocacy:manage', 'claims:advocacy:view', 'claims:adjuster:refer', 'claims:adjuster:respond',
    'claims:adjuster:submit_report', 'claims:projection:view', 'claims:projection:write', 'claims:recovery:manage',
    'claims:document:attach', 'claims:document:view', 'claims:document:download',
  ],
  head_office_ops: ['claims:view', 'claims:list', 'claims:pay', 'claims:advocacy:view', 'claims:projection:view'],
  branch_manager: ['claims:view', 'claims:list', 'claims:approve', 'claims:refer_adjuster', 'claims:advocacy:manage', 'claims:adjuster:refer', 'claims:projection:view', 'claims:document:view', 'claims:document:download'],
  branch_staff: ['claims:view', 'claims:list', 'claims:advocacy:view'],
  claims_handler: [
    'claims:register', 'claims:view', 'claims:list', 'claims:assess', 'claims:approve', 'claims:reject',
    'claims:close', 'claims:refer_adjuster', 'claims:advocacy:manage', 'claims:adjuster:refer',
    'claims:projection:view', 'claims:projection:write', 'claims:document:attach', 'claims:document:view', 'claims:document:download',
  ],
  loss_adjuster: ['claims:view', 'claims:list', 'claims:assess', 'claims:refer_adjuster', 'claims:adjuster:respond', 'claims:adjuster:submit_report'],
  finance_ops: ['claims:view', 'claims:list', 'claims:pay', 'claims:recovery:manage'],
  call_center: ['claims:register', 'claims:advocacy:view'],
  agency_owner: ['claims:register', 'claims:advocacy:view'],
  agency_staff: ['claims:register', 'claims:advocacy:view'],
  broker_owner: ['claims:register', 'claims:view', 'claims:list', 'claims:advocacy:manage', 'claims:advocacy:view', 'claims:adjuster:refer', 'claims:projection:view', 'claims:document:attach', 'claims:document:view', 'claims:document:download'],
  broker_staff: ['claims:register', 'claims:view', 'claims:list', 'claims:advocacy:view'],
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
