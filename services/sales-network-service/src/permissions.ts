export type PermissionKey =
  | 'sales_network:partners:manage'
  | 'sales_network:partners:view'
  | 'sales_network:contracts:manage'
  | 'sales_network:contracts:view'
  | 'sales_network:ledger:view'
  | 'sales_network:ledger:manage'
  | 'sales_network:kpi:view'
  | 'sales_network:agent:view'
  | 'sales_network:ingest';

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
    'sales_network:ingest',
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
  ],
  agency_owner: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view'],
  agency_staff: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view'],
  broker_owner: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view'],
  broker_staff: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view'],
  auditor: ['sales_network:partners:view', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:kpi:view', 'sales_network:agent:view'],
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
