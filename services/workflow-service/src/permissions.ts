export type PermissionKey =
  | 'workflow:definitions:create'
  | 'workflow:definitions:view'
  | 'workflow:definitions:list'
  | 'workflow:definitions:update'
  | 'workflow:definitions:delete'
  | 'workflow:instances:create'
  | 'workflow:instances:view'
  | 'workflow:instances:list'
  | 'workflow:instances:transition'
  | 'workflow:instances:cancel'
  | 'workflow:templates:create'
  | 'workflow:templates:view'
  | 'workflow:templates:list'
  | 'workflow:profiles:view'
  | 'workflow:export';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'workflow:definitions:create',
    'workflow:definitions:view',
    'workflow:definitions:list',
    'workflow:definitions:update',
    'workflow:definitions:delete',
    'workflow:instances:create',
    'workflow:instances:view',
    'workflow:instances:list',
    'workflow:instances:transition',
    'workflow:instances:cancel',
    'workflow:templates:create',
    'workflow:templates:view',
    'workflow:templates:list',
    'workflow:profiles:view',
    'workflow:export',
  ],
  head_office_ops: [
    'workflow:definitions:view',
    'workflow:definitions:list',
    'workflow:instances:view',
    'workflow:instances:list',
    'workflow:templates:view',
    'workflow:templates:list',
    'workflow:profiles:view',
    'workflow:export',
  ],
  workflow_ops: [
    'workflow:definitions:create',
    'workflow:definitions:view',
    'workflow:definitions:list',
    'workflow:definitions:update',
    'workflow:instances:create',
    'workflow:instances:view',
    'workflow:instances:list',
    'workflow:instances:transition',
    'workflow:instances:cancel',
    'workflow:templates:create',
    'workflow:templates:view',
    'workflow:templates:list',
    'workflow:profiles:view',
    'workflow:export',
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
