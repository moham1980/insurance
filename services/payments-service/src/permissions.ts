export type PermissionKey =
  | 'payments:prepare'
  | 'payments:approve'
  | 'payments:execute'
  | 'payments:notify'
  | 'payments:fail'
  | 'payments:view'
  | 'payments:list'
  | 'payments:reconcile'
  | 'payments:refund'
  | 'payments:dispute'
  | 'payments:gateway_callback';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['payments:prepare', 'payments:approve', 'payments:execute', 'payments:notify', 'payments:fail', 'payments:view', 'payments:list', 'payments:reconcile', 'payments:refund', 'payments:dispute', 'payments:gateway_callback'],
  head_office_ops: ['payments:approve', 'payments:execute', 'payments:notify', 'payments:fail', 'payments:view', 'payments:list', 'payments:reconcile', 'payments:refund', 'payments:gateway_callback'],
  finance_ops: ['payments:approve', 'payments:execute', 'payments:notify', 'payments:fail', 'payments:view', 'payments:list', 'payments:reconcile', 'payments:refund', 'payments:gateway_callback'],
  loss_adjuster: ['payments:prepare', 'payments:view', 'payments:list'],
  branch_manager: ['payments:prepare', 'payments:view', 'payments:list'],
  auditor: ['payments:view', 'payments:list', 'payments:reconcile', 'payments:dispute'],
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
