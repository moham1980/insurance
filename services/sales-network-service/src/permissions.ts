export type PermissionKey =
  | 'sales_network:partners:manage'
  | 'sales_network:partners:view'
  | 'sales_network:contracts:manage'
  | 'sales_network:contracts:view'
  | 'sales_network:ledger:view'
  | 'sales_network:ledger:manage'
  | 'sales_network:kpi:view'
  | 'sales_network:agent:view'
  | 'sales_network:agents:view'
  | 'sales_network:ingest'
  | 'broker:agreements:manage'
  | 'broker:agreements:view'
  | 'insurer:agreements:approve'
  | 'sales_network:broker:sub_agents:view'
  | 'sales_network:broker:sub_agents:manage'
  | 'sales_network:broker:dashboard:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'sales_network:partners:manage',
    'sales_network:partners:view',
    'sales_network:contracts:manage',
    'sales_network:contracts:view',
    'sales_network:ledger:view',
    'sales_network:ledger:manage',
    'sales_network:kpi:view',
    'sales_network:agent:view',
    'sales_network:agents:view',
    'sales_network:ingest',
    'broker:agreements:manage',
    'broker:agreements:view',
    'insurer:agreements:approve',
    'sales_network:broker:sub_agents:view',
    'sales_network:broker:sub_agents:manage',
    'sales_network:broker:dashboard:view',
  ],
  head_office_ops: [
    'sales_network:partners:manage',
    'sales_network:partners:view',
    'sales_network:contracts:manage',
    'sales_network:contracts:view',
    'sales_network:ledger:view',
    'sales_network:ledger:manage',
    'sales_network:kpi:view',
    'sales_network:agent:view',
    'sales_network:agents:view',
    'broker:agreements:manage',
    'broker:agreements:view',
    'insurer:agreements:approve',
    'sales_network:broker:sub_agents:view',
    'sales_network:broker:sub_agents:manage',
    'sales_network:broker:dashboard:view',
  ],
  agency_owner: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view', 'sales_network:agents:view', 'broker:agreements:view'],
  agency_staff: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view', 'sales_network:agents:view', 'broker:agreements:view'],
  broker_owner: [
    'sales_network:partners:view',
    'sales_network:contracts:view',
    'sales_network:ledger:view',
    'sales_network:kpi:view',
    'sales_network:agent:view',
    'sales_network:agents:view',
    'broker:agreements:manage',
    'broker:agreements:view',
    'sales_network:broker:sub_agents:view',
    'sales_network:broker:sub_agents:manage',
    'sales_network:broker:dashboard:view',
  ],
  broker_staff: [
    'sales_network:partners:view',
    'sales_network:contracts:view',
    'sales_network:ledger:view',
    'sales_network:kpi:view',
    'sales_network:agent:view',
    'sales_network:agents:view',
    'broker:agreements:view',
    'sales_network:broker:sub_agents:view',
    'sales_network:broker:dashboard:view',
  ],
  sub_agent: [
    'sales_network:agents:view',
    'sales_network:ledger:view',
    'sales_network:kpi:view',
  ],
  auditor: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view', 'sales_network:agents:view', 'broker:agreements:view', 'sales_network:broker:sub_agents:view', 'sales_network:broker:dashboard:view'],
};

export function permissionsForRoles(roles: string[] | undefined | null): PermissionKey[] {
  const rs = Array.isArray(roles) ? roles : [];
  const out = new Set<PermissionKey>();
  for (const r of rs) {
    const perms = ROLE_TO_PERMISSIONS[String(r)];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}
