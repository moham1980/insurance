export type PermissionKey = 'documents:upload' | 'documents:link' | 'documents:view' | 'documents:list';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['documents:upload', 'documents:link', 'documents:view', 'documents:list'],
  head_office_ops: ['documents:view', 'documents:list'],
  branch_manager: ['documents:view', 'documents:list'],
  branch_staff: ['documents:upload', 'documents:link', 'documents:view', 'documents:list'],
  claims_handler: ['documents:upload', 'documents:link', 'documents:view', 'documents:list'],
  loss_adjuster: ['documents:view', 'documents:list'],
  call_center: ['documents:upload', 'documents:link'],
  agency_owner: ['documents:upload', 'documents:link'],
  agency_staff: ['documents:upload', 'documents:link'],
  broker_owner: ['documents:upload', 'documents:link'],
  broker_staff: ['documents:upload', 'documents:link'],
  auditor: ['documents:view', 'documents:list'],
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
