export type PermissionKey =
  | 'orchestrations:saga_start'
  | 'orchestrations:saga_view'
  | 'orchestrations:saga_compensate'
  | 'work_items:list'
  | 'work_items:view'
  | 'work_items:assign'
  | 'work_items:complete'
  | 'work_items:create_sanhab'
  | 'work_items:create_underwriting'
  | 'work_items:create_override'
  | 'work_items:create_suspicious_case'
  | 'work_items:sla_view'
  | 'work_items:sla_manage'
  // P1 #5 (SoD): submit and approve are separate permissions.
  // A user with :submit cannot self-approve; a different user with :approve must review.
  | 'work_items:submit'
  | 'work_items:approve'
  | 'dlq:list'
  | 'dlq:stats'
  | 'dlq:resolve';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'orchestrations:saga_start',
    'orchestrations:saga_view',
    'orchestrations:saga_compensate',
    'work_items:list',
    'work_items:view',
    'work_items:assign',
    'work_items:complete',
    'work_items:create_sanhab',
    'work_items:create_underwriting',
    'work_items:create_override',
    'work_items:create_suspicious_case',
    'work_items:sla_view',
    'work_items:sla_manage',
    'work_items:submit',
    'work_items:approve',
    'dlq:list',
    'dlq:stats',
    'dlq:resolve',
  ],
  head_office_ops: [
    'orchestrations:saga_start',
    'orchestrations:saga_view',
    'orchestrations:saga_compensate',
    'work_items:list',
    'work_items:view',
    'work_items:create_sanhab',
    'work_items:create_underwriting',
    'work_items:create_override',
    'work_items:create_suspicious_case',
    'work_items:sla_view',
    'work_items:sla_manage',
    'work_items:submit',
    'work_items:approve',
    'dlq:list',
    'dlq:stats',
    'dlq:resolve',
  ],
  claims_handler: ['orchestrations:saga_start', 'orchestrations:saga_view', 'work_items:list', 'work_items:view', 'work_items:complete', 'work_items:submit'],
  finance_ops: ['orchestrations:saga_view', 'work_items:list', 'work_items:view', 'work_items:complete', 'work_items:approve'],
  fraud_analyst: ['orchestrations:saga_view', 'work_items:list', 'work_items:view', 'work_items:complete', 'work_items:create_suspicious_case', 'work_items:submit'],
  risk_manager: ['orchestrations:saga_view', 'work_items:list', 'work_items:view', 'work_items:create_underwriting', 'work_items:create_suspicious_case', 'work_items:submit'],
  legal_ops: ['orchestrations:saga_view', 'work_items:list', 'work_items:view', 'work_items:complete', 'work_items:create_suspicious_case', 'work_items:submit'],
  branch_manager: ['work_items:list', 'work_items:view', 'work_items:assign', 'work_items:complete', 'work_items:approve'],
  auditor: ['orchestrations:saga_view', 'work_items:list', 'work_items:view', 'dlq:list', 'dlq:stats'],
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
