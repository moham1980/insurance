export type PermissionKey =
  | 'knowledge:index'
  | 'knowledge:search'
  | 'knowledge:view'
  | 'knowledge:delete'
  | 'knowledge:reindex'
  | 'knowledge:admin';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['knowledge:index', 'knowledge:search', 'knowledge:view', 'knowledge:delete', 'knowledge:reindex', 'knowledge:admin'],
  head_office_ops: ['knowledge:index', 'knowledge:search', 'knowledge:view', 'knowledge:reindex'],
  underwriter: ['knowledge:search', 'knowledge:view'],
  branch_manager: ['knowledge:search', 'knowledge:view'],
  branch_staff: ['knowledge:search', 'knowledge:view'],
  agency_owner: ['knowledge:search', 'knowledge:view'],
  agency_staff: ['knowledge:search', 'knowledge:view'],
  broker_owner: ['knowledge:search', 'knowledge:view'],
  broker_staff: ['knowledge:search', 'knowledge:view'],
  call_center: ['knowledge:search', 'knowledge:view'],
  auditor: ['knowledge:search', 'knowledge:view'],
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
