export type PermissionKey = 'fraud:triage' | 'fraud:investigate' | 'fraud:escalate' | 'fraud:cases:list' | 'fraud:cases:view' | 'fraud:cases:create' | 'fraud:score' | 'fraud:ml:view' | 'fraud:ml:train' | 'fraud:ml:deploy' | 'fraud:ml:explain' | 'fraud:ml:drift' | 'fraud:ml:predict' | 'fraud:ml:delete' | 'fraud:graph:view' | 'fraud:graph:create' | 'fraud:graph:update' | 'fraud:graph:delete' | 'fraud:alert:view' | 'fraud:alert:create' | 'fraud:alert:update' | 'fraud:document:view' | 'fraud:document:upload';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['fraud:triage', 'fraud:investigate', 'fraud:escalate', 'fraud:cases:list'],
  risk_manager: ['fraud:triage', 'fraud:cases:list'],
  fraud_analyst: ['fraud:triage', 'fraud:investigate', 'fraud:escalate', 'fraud:cases:list'],
  legal_ops: ['fraud:investigate', 'fraud:escalate', 'fraud:cases:list'],
  auditor: ['fraud:cases:list'],
  head_office_ops: ['fraud:cases:list'],
  ops_admin: ['fraud:alert:create', 'fraud:alert:update', 'fraud:alert:view', 'fraud:cases:create', 'fraud:cases:list', 'fraud:cases:view', 'fraud:document:upload', 'fraud:document:view', 'fraud:escalate', 'fraud:graph:create', 'fraud:graph:delete', 'fraud:graph:update', 'fraud:graph:view', 'fraud:investigate', 'fraud:ml:delete', 'fraud:ml:deploy', 'fraud:ml:drift', 'fraud:ml:explain', 'fraud:ml:predict', 'fraud:ml:train', 'fraud:ml:view', 'fraud:score', 'fraud:triage'],
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
