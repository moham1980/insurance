export type PermissionKey =
  | 'regulatory:inquiry'
  | 'regulatory:events:view'
  | 'regulatory:events:list'
  | 'regulatory:failures:view'
  | 'regulatory:retry'
  | 'regulatory:submit'
  | 'regulatory:status'
  | 'regulatory:export';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'regulatory:inquiry',
    'regulatory:events:view',
    'regulatory:events:list',
    'regulatory:failures:view',
    'regulatory:retry',
    'regulatory:submit',
    'regulatory:status',
    'regulatory:export',
  ],
  head_office_ops: [
    'regulatory:inquiry',
    'regulatory:events:view',
    'regulatory:events:list',
    'regulatory:failures:view',
    'regulatory:submit',
    'regulatory:status',
    'regulatory:export',
  ],
  regulatory_ops: [
    'regulatory:inquiry',
    'regulatory:events:view',
    'regulatory:events:list',
    'regulatory:failures:view',
    'regulatory:retry',
    'regulatory:submit',
    'regulatory:status',
    'regulatory:export',
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
