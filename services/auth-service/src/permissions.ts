import { getAllRolesWithInheritance } from './role-hierarchy';

export type PermissionKey =
  | 'users:list'
  | 'users:set_roles'
  | 'users:assign_org_unit'
  | 'org_units:create'
  | 'org_units:list'
  | 'org_units:get'
  | 'roles:catalog'
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
  | 'policy:changes_view'
  | 'claims:register'
  | 'claims:assign_adjuster'
  | 'claims:assess'
  | 'claims:approve'
  | 'claims:pay'
  | 'fraud:triage'
  | 'fraud:investigate'
  | 'risk:rules_manage'
  | 'complaints:create'
  | 'complaints:handle'
  | 'complaints:escalate_regulator'
  | 'aml:review'
  | 'aml:report'
  | 'reinsurance:manage_program'
  | 'reinsurance:reconcile'
  | 'reporting:view'
  | 'reporting:ingest'
  | 'reporting:projections:admin'
  | 'regulatory:view'
  | 'abac:policy:create'
  | 'abac:policy:update'
  | 'abac:policy:delete'
  | 'abac:policy:read'
  | 'federation:read'
  | 'federation:manage';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'users:list',
    'users:set_roles',
    'users:assign_org_unit',
    'org_units:create',
    'org_units:list',
    'org_units:get',
    'roles:catalog',
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
    'reporting:view',
    'reporting:ingest',
    'reporting:projections:admin',
    'federation:read',
    'federation:manage',
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
    'claims:pay',
    'reinsurance:manage_program',
    'reporting:view',
    'federation:read',
    'federation:manage',
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
    'reporting:view',
  ],
  risk_manager: ['fraud:triage', 'risk:rules_manage', 'aml:review', 'reporting:view'],
  compliance_aml: ['aml:review', 'aml:report', 'reporting:view'],
  legal_ops: ['fraud:investigate', 'complaints:handle', 'reporting:view'],
  complaints_handler: ['complaints:handle', 'complaints:escalate_regulator', 'reporting:view'],
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
    'claims:assign_adjuster',
    'claims:approve',
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
    'complaints:create',
  ],
  claims_handler: ['claims:register', 'claims:assign_adjuster', 'claims:assess', 'claims:approve', 'reporting:view'],
  loss_adjuster: ['claims:assess', 'reporting:view'],
  fraud_analyst: ['fraud:triage', 'fraud:investigate', 'reporting:view'],
  finance_ops: ['claims:pay', 'reinsurance:reconcile', 'reporting:view'],
  collections_ops: [],
  reinsurance_ops: ['reinsurance:manage_program', 'reinsurance:reconcile'],
  agency_owner: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view', 'claims:register'],
  agency_staff: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view', 'claims:register'],
  broker_owner: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view', 'claims:register'],
  broker_staff: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:list', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view', 'claims:register'],
  call_center: ['policy:quote', 'policy:submit_docs', 'policy:view', 'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view', 'policy:changes_view', 'claims:register', 'complaints:create'],
  auditor: ['reporting:view', 'policy:view', 'policy:list', 'policy:sanhab_inquiries_view', 'policy:changes_view'],
  regulatory_view: ['regulatory:view'],
};

export function permissionsForRoles(roles: string[] | undefined | null): PermissionKey[] {
  const rs = Array.isArray(roles) ? roles : [];
  const effectiveRoles = new Set<string>();
  for (const r of rs) {
    effectiveRoles.add(r);
    for (const inherited of getAllRolesWithInheritance(r)) {
      effectiveRoles.add(inherited);
    }
  }

  const out = new Set<PermissionKey>();
  for (const r of effectiveRoles) {
    const perms = ROLE_TO_PERMISSIONS[r];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}
