export type PermissionKey =
  | 'ai:model:register'
  | 'ai:model:view'
  | 'ai:model:list'
  | 'ai:model:update'
  | 'ai:model:delete'
  | 'ai:model:transition'
  | 'ai:model:retire'
  | 'ai:model:admin';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['ai:model:register', 'ai:model:view', 'ai:model:list', 'ai:model:update', 'ai:model:delete', 'ai:model:transition', 'ai:model:retire', 'ai:model:admin'],
  head_office_ops: ['ai:model:register', 'ai:model:view', 'ai:model:list', 'ai:model:update', 'ai:model:transition', 'ai:model:retire'],
  system_admin: ['ai:model:register', 'ai:model:view', 'ai:model:list', 'ai:model:update', 'ai:model:delete', 'ai:model:transition', 'ai:model:retire', 'ai:model:admin'],
  auditor: ['ai:model:view', 'ai:model:list'],
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
