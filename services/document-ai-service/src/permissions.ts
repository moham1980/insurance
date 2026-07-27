export type PermissionKey =
  | 'document_ai:jobs:list'
  | 'document_ai:jobs:view'
  | 'document_ai:jobs:retry'
  | 'document_ai:jobs:dlq'
  | 'document_ai:audit:list'
  | 'document_ai:usage:view'
  | 'document_ai:eval:cases:list'
  | 'document_ai:eval:cases:manage'
  | 'document_ai:eval:runs:list'
  | 'document_ai:eval:runs:start'
  | 'document_ai:eval:runs:view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'document_ai:jobs:list',
    'document_ai:jobs:view',
    'document_ai:jobs:retry',
    'document_ai:jobs:dlq',
    'document_ai:audit:list',
    'document_ai:usage:view',
    'document_ai:eval:cases:list',
    'document_ai:eval:cases:manage',
    'document_ai:eval:runs:list',
    'document_ai:eval:runs:start',
    'document_ai:eval:runs:view',
  ],
  head_office_ops: [
    'document_ai:jobs:list',
    'document_ai:jobs:view',
    'document_ai:audit:list',
    'document_ai:usage:view',
    'document_ai:eval:cases:list',
    'document_ai:eval:runs:list',
    'document_ai:eval:runs:start',
    'document_ai:eval:runs:view',
  ],
  claims_handler: ['document_ai:jobs:list', 'document_ai:jobs:view', 'document_ai:audit:list'],
  auditor: [
    'document_ai:jobs:list',
    'document_ai:jobs:view',
    'document_ai:audit:list',
    'document_ai:usage:view',
    'document_ai:eval:cases:list',
    'document_ai:eval:runs:list',
    'document_ai:eval:runs:view',
  ],
  compliance_aml: ['document_ai:audit:list', 'document_ai:usage:view'],
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
