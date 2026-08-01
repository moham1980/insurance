export type PermissionKey = 'copilot:claims:summary' | 'copilot:documents:summary' | 'copilot:qa' | 'copilot:next-best-action' | 'copilot:view' | 'copilot:manage';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: ['copilot:claims:summary', 'copilot:documents:summary', 'copilot:qa', 'copilot:next-best-action', 'copilot:view', 'copilot:manage'],
  head_office_ops: ['copilot:claims:summary', 'copilot:documents:summary', 'copilot:qa', 'copilot:view', 'copilot:manage'],
  claims_handler: ['copilot:claims:summary', 'copilot:documents:summary', 'copilot:qa', 'copilot:next-best-action', 'copilot:view'],
  auditor: ['copilot:claims:summary', 'copilot:documents:summary', 'copilot:view'],
  customer: ['copilot:qa'],
  policyholder: ['copilot:qa'],
  sales_agent: ['copilot:qa', 'copilot:claims:summary', 'copilot:documents:summary', 'copilot:next-best-action', 'copilot:view'],
  broker: ['copilot:qa', 'copilot:claims:summary', 'copilot:documents:summary', 'copilot:next-best-action', 'copilot:view'],
  agent: ['copilot:qa', 'copilot:claims:summary', 'copilot:documents:summary', 'copilot:next-best-action', 'copilot:view'],
  super_admin: ['copilot:claims:summary', 'copilot:documents:summary', 'copilot:qa', 'copilot:next-best-action', 'copilot:view', 'copilot:manage'],
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
