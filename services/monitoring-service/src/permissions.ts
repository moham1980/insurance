export type PermissionKey =
  | 'monitoring:metrics:view'
  | 'monitoring:slos:list'
  | 'monitoring:slos:create'
  | 'monitoring:alerts:list'
  | 'monitoring:alerts:ack'
  | 'monitoring:alerts:silence' // P2 #8: alert silencing
  | 'monitoring:dashboard:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'monitoring:metrics:view',
    'monitoring:slos:list',
    'monitoring:slos:create',
    'monitoring:alerts:list',
    'monitoring:alerts:ack',
    'monitoring:alerts:silence',
    'monitoring:dashboard:view',
  ],
  head_office_ops: ['monitoring:slos:list', 'monitoring:alerts:list', 'monitoring:dashboard:view'],
  auditor: ['monitoring:metrics:view', 'monitoring:slos:list', 'monitoring:alerts:list', 'monitoring:dashboard:view'],
  compliance_aml: ['monitoring:dashboard:view'],
  risk_manager: ['monitoring:dashboard:view'],
};

export function permissionsForRoles(roles: string[] | undefined | null): PermissionKey[] {
  const rs = Array.isArray(roles) ? roles : [];
  const out = new Set<PermissionKey>();
  for (const r of rs) {
    const perms = ROLE_TO_PERMISSIONS[String(r)];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}
