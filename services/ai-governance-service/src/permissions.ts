export type PermissionKey =
  | 'ai:model:register'
  | 'ai:model:view'
  | 'ai:model:list'
  | 'ai:model:update'
  | 'ai:model:delete'
  | 'ai:model:transition'
  | 'ai:model:retire'
  | 'ai:model:admin'
  // P1 #5 (SoD): submit and approve are separate permissions.
  // A user with :submit cannot self-approve; a different user with :approve must review.
  | 'ai:model:submit'
  | 'ai:model:approve'
  | 'ai:governance:incidents:view'
  | 'ai:governance:incidents:manage';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['ai:model:register', 'ai:model:view', 'ai:model:list', 'ai:model:update', 'ai:model:delete', 'ai:model:transition', 'ai:model:retire', 'ai:model:admin', 'ai:model:submit', 'ai:model:approve', 'ai:governance:incidents:view', 'ai:governance:incidents:manage'],
  head_office_ops: ['ai:model:register', 'ai:model:view', 'ai:model:list', 'ai:model:update', 'ai:model:transition', 'ai:model:retire', 'ai:model:submit', 'ai:governance:incidents:view'],
  system_admin: ['ai:model:register', 'ai:model:view', 'ai:model:list', 'ai:model:update', 'ai:model:delete', 'ai:model:transition', 'ai:model:retire', 'ai:model:admin', 'ai:model:submit', 'ai:model:approve', 'ai:governance:incidents:view', 'ai:governance:incidents:manage'],
  auditor: ['ai:model:view', 'ai:model:list', 'ai:governance:incidents:view'],
  ops_admin: ['ai:model:admin', 'ai:model:approve', 'ai:model:delete', 'ai:model:list', 'ai:model:register', 'ai:model:retire', 'ai:model:submit', 'ai:model:transition', 'ai:model:update', 'ai:model:view', 'ai:governance:incidents:view', 'ai:governance:incidents:manage'],
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
