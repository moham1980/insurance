export type PermissionKey =
  | 'portal:policies:view'
  | 'portal:claims:view'
  | 'portal:payments:view'
  | 'portal:complaints:view'
  | 'portal:endorsement:request'
  | 'portal:renewal:request'
  | 'portal:fnol:submit';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  customer: [
    'portal:policies:view',
    'portal:claims:view',
    'portal:payments:view',
    'portal:complaints:view',
    'portal:endorsement:request',
    'portal:renewal:request',
    'portal:fnol:submit',
  ],
  insurer_admin: [
    'portal:policies:view',
    'portal:claims:view',
    'portal:payments:view',
    'portal:complaints:view',
    'portal:endorsement:request',
    'portal:renewal:request',
    'portal:fnol:submit',
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
