export type PermissionKey =
  | 'submission:submissions:create'
  | 'submission:submissions:view'
  | 'submission:submissions:list'
  | 'submission:submissions:update'
  | 'submission:submissions:submit'
  | 'submission:submissions:expire'
  | 'submission:quotes:request'
  | 'submission:quotes:view'
  | 'submission:quotes:compare'
  | 'submission:quotes:select'
  | 'submission:placement:create'
  | 'submission:placement:view'
  | 'submission:placement:retry'
  | 'submission:placement:cancel'
  | 'submission:connectors:configure'
  | 'submission:connectors:view'
  | 'submission:underwriting:refer'
  | 'submission:documents:manage'
  | 'submission:subjectivities:manage';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'submission:submissions:create',
    'submission:submissions:view',
    'submission:submissions:list',
    'submission:submissions:update',
    'submission:submissions:submit',
    'submission:submissions:expire',
    'submission:quotes:request',
    'submission:quotes:view',
    'submission:quotes:compare',
    'submission:quotes:select',
    'submission:placement:create',
    'submission:placement:view',
    'submission:placement:retry',
    'submission:placement:cancel',
    'submission:connectors:configure',
    'submission:connectors:view',
    'submission:underwriting:refer',
    'submission:documents:manage',
    'submission:subjectivities:manage',
  ],
  broker: [
    'submission:submissions:create',
    'submission:submissions:view',
    'submission:submissions:list',
    'submission:submissions:update',
    'submission:submissions:submit',
    'submission:submissions:expire',
    'submission:quotes:request',
    'submission:quotes:view',
    'submission:quotes:compare',
    'submission:quotes:select',
    'submission:placement:create',
    'submission:placement:view',
    'submission:placement:retry',
    'submission:placement:cancel',
    'submission:documents:manage',
    'submission:subjectivities:manage',
  ],
  agent: [
    'submission:submissions:create',
    'submission:submissions:view',
    'submission:submissions:list',
    'submission:quotes:view',
    'submission:quotes:compare',
    'submission:documents:manage',
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
