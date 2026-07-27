export type PermissionKey =
  | 'rm:claims:view'
  | 'rm:claims:summary'
  | 'rm:fraud:view'
  | 'rm:complaints:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
  head_office_ops: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
  claims_handler: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
  fraud_analyst: ['rm:claims:view', 'rm:fraud:view'],
  complaints_handler: ['rm:complaints:view'],
  legal_ops: ['rm:fraud:view', 'rm:complaints:view'],
  compliance_aml: ['rm:complaints:view'],
  auditor: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'],
  branch_manager: ['rm:claims:view', 'rm:claims:summary', 'rm:complaints:view'],
  branch_staff: ['rm:claims:view', 'rm:claims:summary'],
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
