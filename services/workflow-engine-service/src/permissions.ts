export type PermissionKey =
  | 'workflow:define'
  | 'workflow:start'
  | 'workflow:signal'
  | 'workflow:cancel'
  | 'workflow:view'
  | 'workflow:list'
  | 'workflow:history'
  | 'workflow:admin';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['workflow:define', 'workflow:start', 'workflow:signal', 'workflow:cancel', 'workflow:view', 'workflow:list', 'workflow:history', 'workflow:admin'],
  head_office_ops: ['workflow:start', 'workflow:signal', 'workflow:cancel', 'workflow:view', 'workflow:list', 'workflow:history'],
  underwriter: ['workflow:start', 'workflow:signal', 'workflow:view', 'workflow:list', 'workflow:history'],
  branch_manager: ['workflow:start', 'workflow:signal', 'workflow:view', 'workflow:list', 'workflow:history'],
  branch_staff: ['workflow:start', 'workflow:view', 'workflow:list'],
  agency_owner: ['workflow:start', 'workflow:view', 'workflow:list'],
  agency_staff: ['workflow:start', 'workflow:view', 'workflow:list'],
  broker_owner: ['workflow:start', 'workflow:view', 'workflow:list'],
  broker_staff: ['workflow:start', 'workflow:view', 'workflow:list'],
  call_center: ['workflow:start', 'workflow:view', 'workflow:list'],
  auditor: ['workflow:view', 'workflow:list', 'workflow:history'],
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
