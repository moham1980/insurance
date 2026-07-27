export type PermissionKey =
  | 'aml:consents:create'
  | 'aml:consents:view'
  | 'aml:consents:list'
  | 'aml:consents:revoke'
  | 'aml:rules:manage'
  | 'aml:rules:view'
  | 'aml:rules:list'
  | 'aml:alerts:create'
  | 'aml:alerts:view'
  | 'aml:alerts:list'
  | 'aml:alerts:update_status'
  | 'aml:alerts:assign'
  | 'aml:dashboard'
  | 'aml:export'
  | 'aml:manage'
  | 'aml:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'aml:consents:create',
    'aml:consents:view',
    'aml:consents:list',
    'aml:consents:revoke',
    'aml:rules:manage',
    'aml:rules:view',
    'aml:rules:list',
    'aml:alerts:create',
    'aml:alerts:view',
    'aml:alerts:list',
    'aml:alerts:update_status',
    'aml:alerts:assign',
    'aml:dashboard',
    'aml:export',
    'aml:manage',
    'aml:view',
  ],
  head_office_ops: [
    'aml:consents:view',
    'aml:consents:list',
    'aml:rules:view',
    'aml:rules:list',
    'aml:alerts:view',
    'aml:alerts:list',
    'aml:alerts:update_status',
    'aml:alerts:assign',
    'aml:dashboard',
    'aml:export',
    'aml:manage',
    'aml:view',
  ],
  branch_manager: ['aml:consents:view', 'aml:consents:list', 'aml:alerts:view', 'aml:alerts:list'],
  branch_staff: ['aml:consents:create', 'aml:consents:view', 'aml:consents:list'],
  aml_officer: [
    'aml:consents:view',
    'aml:consents:list',
    'aml:consents:revoke',
    'aml:rules:manage',
    'aml:rules:view',
    'aml:rules:list',
    'aml:alerts:create',
    'aml:alerts:view',
    'aml:alerts:list',
    'aml:alerts:update_status',
    'aml:alerts:assign',
    'aml:dashboard',
    'aml:export',
    'aml:manage',
    'aml:view',
  ],
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
