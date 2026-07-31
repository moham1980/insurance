export type PermissionKey =
  | 'billing:invoices:create'
  | 'billing:invoices:view'
  | 'billing:invoices:manage'
  | 'billing:accounting:manage'
  | 'billing:payments:initiate'
  | 'billing:payments:verify'
  | 'billing:payments:refund'
  | 'billing:settlements:manage'
  | 'billing:escrow:view'
  | 'billing:reports:view'
  | 'billing:auto-deposit:manage'
  | 'billing:create_entry'
  | 'billing:view_entry'
  | 'billing:reconcile'
  | 'billing:close_period'
  | 'billing:manage_accounts'
  | 'billing:manage_cost_centers'
  | 'billing:admin';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['billing:invoices:create', 'billing:invoices:view', 'billing:invoices:manage', 'billing:accounting:manage', 'billing:payments:initiate', 'billing:payments:verify', 'billing:auto-deposit:manage', 'billing:create_entry', 'billing:view_entry', 'billing:reconcile', 'billing:close_period', 'billing:manage_accounts', 'billing:manage_cost_centers', 'billing:admin'],
  head_office_ops: ['billing:invoices:create', 'billing:invoices:view', 'billing:invoices:manage', 'billing:accounting:manage', 'billing:payments:initiate', 'billing:payments:verify', 'billing:auto-deposit:manage', 'billing:create_entry', 'billing:view_entry', 'billing:reconcile', 'billing:manage_accounts', 'billing:manage_cost_centers'],
  underwriter: ['billing:invoices:view', 'billing:view_entry'],
  branch_manager: ['billing:invoices:create', 'billing:invoices:view', 'billing:create_entry', 'billing:view_entry'],
  branch_staff: ['billing:invoices:view', 'billing:view_entry'],
  agency_owner: ['billing:invoices:view', 'billing:view_entry'],
  agency_staff: ['billing:invoices:view', 'billing:view_entry'],
  broker_owner: ['billing:invoices:view', 'billing:view_entry'],
  broker_staff: ['billing:invoices:view', 'billing:view_entry'],
  call_center: ['billing:invoices:view', 'billing:payments:initiate', 'billing:view_entry'],
  auditor: ['billing:invoices:view', 'billing:view_entry', 'billing:reconcile'],
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
