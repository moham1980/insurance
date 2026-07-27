export type PermissionKey =
  | 'complaints:create'
  | 'complaints:view'
  | 'complaints:list'
  | 'complaints:dashboard'
  | 'complaints:escalate'
  | 'complaints:update_status'
  | 'complaints:attach_document'
  | 'complaints:otp_request'
  | 'complaints:otp_verify'
  | 'complaints:export'
  | 'complaints:manage';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'complaints:create',
    'complaints:view',
    'complaints:list',
    'complaints:dashboard',
    'complaints:escalate',
    'complaints:update_status',
    'complaints:attach_document',
    'complaints:otp_request',
    'complaints:otp_verify',
    'complaints:export',
    'complaints:manage',
  ],
  head_office_ops: [
    'complaints:view',
    'complaints:list',
    'complaints:dashboard',
    'complaints:escalate',
    'complaints:update_status',
    'complaints:attach_document',
    'complaints:otp_request',
    'complaints:otp_verify',
    'complaints:export',
    'complaints:manage',
  ],
  branch_manager: ['complaints:view', 'complaints:list', 'complaints:dashboard', 'complaints:escalate', 'complaints:update_status'],
  branch_staff: ['complaints:create', 'complaints:view', 'complaints:list'],
  legal_ops: [
    'complaints:view',
    'complaints:list',
    'complaints:dashboard',
    'complaints:escalate',
    'complaints:update_status',
    'complaints:attach_document',
    'complaints:otp_request',
    'complaints:otp_verify',
    'complaints:export',
    'complaints:manage',
  ],
  call_center: ['complaints:create'],
  complaints_handler: [
    'complaints:create',
    'complaints:view',
    'complaints:list',
    'complaints:dashboard',
    'complaints:escalate',
    'complaints:update_status',
    'complaints:attach_document',
    'complaints:otp_request',
    'complaints:otp_verify',
    'complaints:export',
    'complaints:manage',
  ],
  auditor: ['complaints:view', 'complaints:list', 'complaints:dashboard', 'complaints:export'],
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
