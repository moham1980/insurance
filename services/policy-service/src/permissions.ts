export type PermissionKey =
  | 'policy:quote'
  | 'policy:submit_docs'
  | 'policy:risk_assess'
  | 'policy:underwriting_decide'
  | 'policy:issue'
  | 'policy:endorse'
  | 'policy:cancel'
  | 'policy:renew'
  | 'policy:view'
  | 'policy:list'
  | 'policy:set_unique_code'
  | 'policy:sanhab_inquiry'
  | 'policy:sanhab_inquiries_view'
  | 'policy:quality_gate_override'
  | 'policy:changes_view';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'policy:quote',
    'policy:submit_docs',
    'policy:risk_assess',
    'policy:underwriting_decide',
    'policy:issue',
    'policy:endorse',
    'policy:cancel',
    'policy:renew',
    'policy:view',
    'policy:list',
    'policy:set_unique_code',
    'policy:sanhab_inquiry',
    'policy:sanhab_inquiries_view',
    'policy:quality_gate_override',
    'policy:changes_view',
  ],
  head_office_ops: [
    'policy:issue',
    'policy:endorse',
    'policy:cancel',
    'policy:renew',
    'policy:view',
    'policy:list',
    'policy:set_unique_code',
    'policy:sanhab_inquiry',
    'policy:sanhab_inquiries_view',
    'policy:quality_gate_override',
    'policy:changes_view',
  ],
  underwriter: [
    'policy:quote',
    'policy:submit_docs',
    'policy:risk_assess',
    'policy:underwriting_decide',
    'policy:issue',
    'policy:endorse',
    'policy:view',
    'policy:list',
    'policy:sanhab_inquiry',
    'policy:sanhab_inquiries_view',
    'policy:changes_view',
  ],
  branch_manager: [
    'policy:quote',
    'policy:issue',
    'policy:endorse',
    'policy:cancel',
    'policy:renew',
    'policy:view',
    'policy:list',
    'policy:sanhab_inquiry',
    'policy:sanhab_inquiries_view',
    'policy:changes_view',
  ],
  branch_staff: [
    'policy:quote',
    'policy:submit_docs',
    'policy:endorse',
    'policy:renew',
    'policy:view',
    'policy:list',
    'policy:sanhab_inquiry',
    'policy:sanhab_inquiries_view',
    'policy:changes_view',
  ],
  agency_owner: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
  agency_staff: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
  broker_owner: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
  broker_staff: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
  call_center: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
  auditor: ['policy:view', 'policy:list', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
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
