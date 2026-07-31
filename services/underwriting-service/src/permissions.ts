export type PermissionKey = 'underwriting:create' | 'underwriting:view' | 'underwriting:list' | 'underwriting:decide' | 'underwriting:appeal';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide', 'underwriting:appeal'],
  head_office_ops: ['underwriting:create', 'underwriting:view', 'underwriting:list'],
  risk_manager: ['underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide'],
  branch_manager: ['underwriting:view', 'underwriting:list'],
  auditor: ['underwriting:view', 'underwriting:list'],
  broker_owner: ['underwriting:view', 'underwriting:list', 'underwriting:appeal'],
  broker_staff: ['underwriting:view', 'underwriting:list', 'underwriting:appeal'],
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
