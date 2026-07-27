export type PermissionKey =
  | 'collections:plan_create'
  | 'collections:plan_view'
  | 'collections:plan_list'
  | 'collections:installment_pay'
  | 'collections:installment_view'
  | 'collections:installment_list';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'collections:plan_create',
    'collections:plan_view',
    'collections:plan_list',
    'collections:installment_pay',
    'collections:installment_view',
    'collections:installment_list',
  ],
  head_office_ops: [
    'collections:plan_create',
    'collections:plan_view',
    'collections:plan_list',
    'collections:installment_pay',
    'collections:installment_view',
    'collections:installment_list',
  ],
  finance: [
    'collections:plan_view',
    'collections:plan_list',
    'collections:installment_pay',
    'collections:installment_view',
    'collections:installment_list',
  ],
  branch_manager: ['collections:plan_view', 'collections:plan_list', 'collections:installment_view', 'collections:installment_list'],
  auditor: ['collections:plan_view', 'collections:plan_list', 'collections:installment_view', 'collections:installment_list'],
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
