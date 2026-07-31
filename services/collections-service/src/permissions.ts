export type PermissionKey =
  | 'collections:plan_create'
  | 'collections:plan_view'
  | 'collections:plan_list'
  | 'collections:installment_pay'
  | 'collections:installment_view'
  | 'collections:installment_list'
  | 'collections:installment_link_receivable'
  | 'collections:installment_sync_receivable'
  | 'collections:receivable_reconcile'
  | 'collections:plan_publish_receivable_requests';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'collections:plan_create',
    'collections:plan_view',
    'collections:plan_list',
    'collections:installment_pay',
    'collections:installment_view',
    'collections:installment_list',
    'collections:installment_link_receivable',
    'collections:installment_sync_receivable',
    'collections:receivable_reconcile',
    'collections:plan_publish_receivable_requests',
  ],
  head_office_ops: [
    'collections:plan_create',
    'collections:plan_view',
    'collections:plan_list',
    'collections:installment_pay',
    'collections:installment_view',
    'collections:installment_list',
    'collections:installment_link_receivable',
    'collections:installment_sync_receivable',
    'collections:receivable_reconcile',
    'collections:plan_publish_receivable_requests',
  ],
  finance: [
    'collections:plan_view',
    'collections:plan_list',
    'collections:installment_pay',
    'collections:installment_view',
    'collections:installment_list',
    'collections:installment_link_receivable',
    'collections:installment_sync_receivable',
    'collections:receivable_reconcile',
  ],
  branch_manager: ['collections:plan_view', 'collections:plan_list', 'collections:installment_view', 'collections:installment_list'],
  auditor: ['collections:plan_view', 'collections:plan_list', 'collections:installment_view', 'collections:installment_list', 'collections:receivable_reconcile'],
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
