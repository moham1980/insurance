export type PermissionKey = 'feature_flags:manage' | 'ai_toggles:manage' | 'feature_flags:view' | 'ai_toggles:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['feature_flags:manage', 'ai_toggles:manage', 'feature_flags:view', 'ai_toggles:view'],
  auditor: ['feature_flags:view', 'ai_toggles:view'],
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
