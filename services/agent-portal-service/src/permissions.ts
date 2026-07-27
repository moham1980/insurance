export type PermissionKey =
  | 'agent_portal:session'
  | 'agent_portal:dashboard'
  | 'agent_portal:policies'
  | 'agent_portal:claims'
  | 'agent_portal:customers'
  | 'agent_portal:commissions'
  | 'agent_portal:kpi'
  | 'agent_portal:leads';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  agent: ['agent_portal:session', 'agent_portal:dashboard', 'agent_portal:policies', 'agent_portal:claims', 'agent_portal:customers', 'agent_portal:commissions', 'agent_portal:kpi', 'agent_portal:leads'],
  branch_manager: ['agent_portal:dashboard', 'agent_portal:policies', 'agent_portal:claims', 'agent_portal:customers', 'agent_portal:commissions', 'agent_portal:kpi', 'agent_portal:leads'],
  insurer_admin: ['agent_portal:session', 'agent_portal:dashboard', 'agent_portal:policies', 'agent_portal:claims', 'agent_portal:customers', 'agent_portal:commissions', 'agent_portal:kpi', 'agent_portal:leads'],
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
