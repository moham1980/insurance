export type PermissionKey =
  | 'knowledge:articles:create'
  | 'knowledge:articles:view'
  | 'knowledge:articles:list'
  | 'knowledge:articles:update'
  | 'knowledge:articles:delete'
  | 'knowledge:graph:view'
  | 'knowledge:graph:list'
  | 'knowledge:nba:create'
  | 'knowledge:nba:view'
  | 'knowledge:nba:list'
  | 'knowledge:export';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'knowledge:articles:create',
    'knowledge:articles:view',
    'knowledge:articles:list',
    'knowledge:articles:update',
    'knowledge:articles:delete',
    'knowledge:graph:view',
    'knowledge:graph:list',
    'knowledge:nba:view',
    'knowledge:nba:list',
    'knowledge:export',
  ],
  head_office_ops: [
    'knowledge:articles:view',
    'knowledge:articles:list',
    'knowledge:graph:view',
    'knowledge:graph:list',
    'knowledge:nba:view',
    'knowledge:nba:list',
    'knowledge:export',
  ],
  knowledge_ops: [
    'knowledge:articles:create',
    'knowledge:articles:view',
    'knowledge:articles:list',
    'knowledge:articles:update',
    'knowledge:graph:view',
    'knowledge:graph:list',
    'knowledge:nba:view',
    'knowledge:nba:list',
    'knowledge:export',
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
