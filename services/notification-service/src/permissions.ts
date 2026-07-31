export type PermissionKey =
  | 'notification:send'
  | 'notification:retry'
  | 'notification:otp:send'
  | 'notification:otp:verify'
  | 'notification:view'
  | 'notification:list'
  | 'notification:templates:manage'
  | 'notification:export'
  | 'notification:credentials:manage'
  | 'notification:credentials:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'notification:send',
    'notification:retry',
    'notification:otp:send',
    'notification:otp:verify',
    'notification:view',
    'notification:list',
    'notification:templates:manage',
    'notification:export',
    'notification:credentials:manage',
    'notification:credentials:view',
  ],
  head_office_ops: ['notification:view', 'notification:list', 'notification:export', 'notification:credentials:view'],
  notification_ops: [
    'notification:send',
    'notification:retry',
    'notification:otp:send',
    'notification:otp:verify',
    'notification:view',
    'notification:list',
    'notification:templates:manage',
    'notification:export',
    'notification:credentials:manage',
    'notification:credentials:view',
  ],
  customer_service: [
    'notification:send',
    'notification:view',
    'notification:list',
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
