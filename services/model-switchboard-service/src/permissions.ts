export type PermissionKey =
  | 'switchboard:manage'
  | 'switchboard:view'
  | 'switchboard:manage_models'
  | 'switchboard:manage_policies'
  | 'switchboard:route'
  | 'switchboard:record_usage'
  | 'switchboard:view_usage'
  | 'switchboard:admin';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['switchboard:manage', 'switchboard:view', 'switchboard:manage_models', 'switchboard:manage_policies', 'switchboard:route', 'switchboard:record_usage', 'switchboard:view_usage', 'switchboard:admin'],
  head_office_ops: ['switchboard:manage', 'switchboard:view', 'switchboard:manage_models', 'switchboard:manage_policies', 'switchboard:route', 'switchboard:view_usage'],
  underwriter: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  branch_manager: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  branch_staff: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  agency_owner: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  agency_staff: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  broker_owner: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  broker_staff: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  call_center: ['switchboard:view', 'switchboard:route', 'switchboard:view_usage'],
  auditor: ['switchboard:view', 'switchboard:view_usage'],
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
