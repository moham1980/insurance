export type PermissionKey =
  | 'rule_engine:rules:create'
  | 'rule_engine:rules:view'
  | 'rule_engine:rules:list'
  | 'rule_engine:rules:update'
  | 'rule_engine:rules:delete'
  | 'rule_engine:rules:activate'
  | 'rule_engine:rules:deactivate'
  | 'rule_engine:evaluate'
  | 'rule_engine:templates:create'
  | 'rule_engine:templates:view'
  | 'rule_engine:templates:list'
  | 'rule_engine:executions:view'
  | 'rule_engine:executions:list'
  | 'rule_engine:export';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'rule_engine:rules:create',
    'rule_engine:rules:view',
    'rule_engine:rules:list',
    'rule_engine:rules:update',
    'rule_engine:rules:delete',
    'rule_engine:rules:activate',
    'rule_engine:rules:deactivate',
    'rule_engine:evaluate',
    'rule_engine:templates:create',
    'rule_engine:templates:view',
    'rule_engine:templates:list',
    'rule_engine:executions:view',
    'rule_engine:executions:list',
    'rule_engine:export',
  ],
  head_office_ops: [
    'rule_engine:rules:view',
    'rule_engine:rules:list',
    'rule_engine:evaluate',
    'rule_engine:templates:view',
    'rule_engine:templates:list',
    'rule_engine:executions:view',
    'rule_engine:executions:list',
    'rule_engine:export',
  ],
  rule_engine_ops: [
    'rule_engine:rules:create',
    'rule_engine:rules:view',
    'rule_engine:rules:list',
    'rule_engine:rules:update',
    'rule_engine:rules:activate',
    'rule_engine:rules:deactivate',
    'rule_engine:evaluate',
    'rule_engine:templates:create',
    'rule_engine:templates:view',
    'rule_engine:templates:list',
    'rule_engine:executions:view',
    'rule_engine:executions:list',
    'rule_engine:export',
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
