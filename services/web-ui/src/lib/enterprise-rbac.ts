'use client';

import { getAuthUser } from '@/lib/api';

export type EnterprisePermissionKey =
  // Operational mutations (write operations)
  | 'claims:register'
  | 'claims:view'
  | 'claims:assess'
  | 'underwriting:view'
  | 'payments:list'
  | 'payments:view'
  | 'payments:prepare'
  | 'payments:approve'
  | 'payments:execute'
  | 'payments:fail'
  | 'payments:notify'
  | 'collections:plan_create'
  | 'collections:plan_view'
  | 'collections:plan_list'
  | 'collections:installment_pay'
  | 'collections:installment_view'
  | 'collections:installment_list'
  | 'aml:consents:create'
  | 'aml:consents:view'
  | 'aml:consents:list'
  | 'aml:consents:revoke'
  | 'aml:rules:manage'
  | 'aml:rules:view'
  | 'aml:rules:list'
  | 'aml:alerts:create'
  | 'aml:alerts:view'
  | 'aml:alerts:list'
  | 'aml:alerts:update_status'
  | 'aml:alerts:assign'
  | 'aml:dashboard'
  | 'aml:export'
  | 'fraud:triage'
  | 'fraud:investigate'
  | 'fraud:escalate'
  | 'complaints:create'
  | 'complaints:view'
  | 'complaints:update_status'
  | 'complaints:attach_document'
  | 'complaints:otp_request'
  | 'complaints:otp_verify'
  | 'complaints:export'
  | 'sales_network:partners:manage'
  | 'sales_network:partners:view'
  | 'sales_network:contracts:manage'
  | 'sales_network:contracts:view'
  | 'sales_network:ledger:view'
  | 'sales_network:ledger:manage'
  | 'sales_network:kpi:view'
  | 'documents:list'
  | 'documents:view'
  | 'documents:upload'
  | 'work_items:list'
  | 'work_items:view'
  | 'work_items:assign'
  | 'work_items:complete'
  | 'party:list'
  | 'party:view'
  | 'party:create'
  | 'kyc:review'
  | 'reporting:view'
  | 'monitoring:metrics:view'
  | 'monitoring:slos:list'
  | 'monitoring:slos:create'
  | 'monitoring:alerts:list'
  | 'monitoring:alerts:ack'
  | 'monitoring:dashboard:view'
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
  | 'document_ai:eval:runs:view'
  | 'settings:manage'
  | 'dlq:stats'
  | 'dlq:list'
  | 'dlq:resolve'
  // Admin permissions
  | 'admin:users:list'
  | 'admin:users:view'
  | 'admin:users:create'
  | 'admin:users:update'
  | 'admin:users:deactivate'
  | 'admin:roles:view'
  | 'admin:roles:create'
  | 'admin:roles:update'
  // Read Model queries (aligned with /rm/* namespace per Enterprise Blueprint)
  | 'rm:claims:view'
  | 'rm:claims:summary'
  | 'rm:fraud:view'
  | 'rm:complaints:view';

const ROLE_TO_PERMISSIONS: Record<string, EnterprisePermissionKey[]> = {
  super_admin: [
    // All permissions including admin
    'claims:register','claims:view',
    'payments:list','payments:view','payments:prepare','payments:approve','payments:execute','payments:fail','payments:notify',
    'collections:plan_create','collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list',
    'aml:consents:create','aml:consents:view','aml:consents:list','aml:consents:revoke',
    'aml:rules:manage','aml:rules:view','aml:rules:list',
    'aml:alerts:create','aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign',
    'aml:dashboard','aml:export',
    'fraud:triage','fraud:investigate','fraud:escalate',
    'complaints:create','complaints:view','complaints:update_status','complaints:attach_document','complaints:otp_request','complaints:otp_verify','complaints:export',
    'sales_network:partners:manage','sales_network:partners:view','sales_network:contracts:manage','sales_network:contracts:view','sales_network:ledger:view','sales_network:ledger:manage','sales_network:kpi:view',
    'documents:list','documents:view','documents:upload',
    'work_items:list','work_items:view','work_items:assign','work_items:complete',
    'party:list','party:view','party:create','kyc:review',
    'reporting:view',
    'monitoring:metrics:view','monitoring:slos:list','monitoring:slos:create','monitoring:alerts:list','monitoring:alerts:ack','monitoring:dashboard:view',
    'document_ai:jobs:list','document_ai:jobs:view','document_ai:jobs:retry','document_ai:jobs:dlq','document_ai:audit:list','document_ai:usage:view',
    'document_ai:eval:cases:list','document_ai:eval:cases:manage','document_ai:eval:runs:list','document_ai:eval:runs:start','document_ai:eval:runs:view',
    'dlq:stats','dlq:list','dlq:resolve',
    // Admin permissions
    'admin:users:list','admin:users:view','admin:users:create','admin:users:update','admin:users:deactivate',
    'admin:roles:view','admin:roles:create','admin:roles:update',
    // Read Models (/rm/*)
    'rm:claims:view','rm:claims:summary','rm:fraud:view','rm:complaints:view',
  ],
  insurer_admin: [
    // Operational
    'claims:register','claims:view',
    'payments:list','payments:view','payments:prepare','payments:approve','payments:execute','payments:fail','payments:notify',
    'collections:plan_create','collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list',
    'aml:consents:create','aml:consents:view','aml:consents:list','aml:consents:revoke',
    'aml:rules:manage','aml:rules:view','aml:rules:list',
    'aml:alerts:create','aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign',
    'aml:dashboard','aml:export',
    'fraud:triage','fraud:investigate','fraud:escalate',
    'complaints:create','complaints:view','complaints:update_status','complaints:attach_document','complaints:otp_request','complaints:otp_verify','complaints:export',
    'sales_network:partners:manage','sales_network:partners:view','sales_network:contracts:manage','sales_network:contracts:view','sales_network:ledger:view','sales_network:ledger:manage','sales_network:kpi:view',
    'documents:list','documents:view','documents:upload',
    'work_items:list','work_items:view','work_items:assign','work_items:complete',
    'party:list','party:view','party:create','kyc:review',
    'reporting:view',
    'monitoring:metrics:view','monitoring:slos:list','monitoring:slos:create','monitoring:alerts:list','monitoring:alerts:ack','monitoring:dashboard:view',
    'document_ai:jobs:list','document_ai:jobs:view','document_ai:jobs:retry','document_ai:jobs:dlq','document_ai:audit:list','document_ai:usage:view',
    'document_ai:eval:cases:list','document_ai:eval:cases:manage','document_ai:eval:runs:list','document_ai:eval:runs:start','document_ai:eval:runs:view',
    'dlq:stats','dlq:list','dlq:resolve',
    // Read Models (/rm/*)
    'rm:claims:view','rm:claims:summary','rm:fraud:view','rm:complaints:view',
  ],
  head_office_ops: [
    'claims:view',
    'payments:list','payments:view','payments:approve','payments:execute','payments:notify',
    'collections:plan_create','collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list',
    'aml:consents:view','aml:consents:list',
    'aml:rules:view','aml:rules:list',
    'aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign',
    'aml:dashboard','aml:export',
    'fraud:triage',
    'complaints:view','complaints:update_status','complaints:attach_document','complaints:otp_request','complaints:otp_verify','complaints:export',
    'sales_network:partners:manage','sales_network:partners:view','sales_network:contracts:manage','sales_network:contracts:view','sales_network:ledger:view','sales_network:kpi:view',
    'documents:list','documents:view',
    'work_items:list','work_items:view',
    'party:list','party:view','party:create',
    'reporting:view',
    'monitoring:slos:list','monitoring:alerts:list','monitoring:dashboard:view',
    'document_ai:jobs:list','document_ai:jobs:view','document_ai:audit:list','document_ai:usage:view',
    'document_ai:eval:cases:list','document_ai:eval:runs:list','document_ai:eval:runs:start','document_ai:eval:runs:view',
    'dlq:stats','dlq:list','dlq:resolve',
    // Read Models
    'rm:claims:view','rm:claims:summary','rm:fraud:view','rm:complaints:view',
  ],
  claims_handler: [
    'claims:register','claims:view','documents:list','documents:view','documents:upload','work_items:list','work_items:view','work_items:complete','reporting:view',
    // Read Models
    'rm:claims:view','rm:claims:summary','rm:fraud:view',
  ],
  finance_ops: ['payments:list','payments:view','payments:approve','payments:execute','payments:fail','payments:notify','reporting:view'],
  finance: ['collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list','reporting:view'],
  fraud_analyst: [
    'fraud:triage','fraud:investigate','fraud:escalate','work_items:list','work_items:view','work_items:complete','reporting:view',
    // Read Models
    'rm:claims:view','rm:fraud:view',
  ],
  risk_manager: ['fraud:triage','reporting:view','party:list','party:view'],
  complaints_handler: [
    'complaints:create','complaints:view','complaints:update_status','complaints:attach_document','complaints:otp_request','complaints:otp_verify','complaints:export','reporting:view',
    // Read Models
    'rm:complaints:view',
  ],
  legal_ops: [
    'fraud:investigate','fraud:escalate','complaints:view','complaints:update_status','complaints:attach_document','complaints:otp_request','complaints:otp_verify','complaints:export','reporting:view',
    // Read Models
    'rm:fraud:view','rm:complaints:view',
  ],
  branch_staff: [
    'claims:view','complaints:create','complaints:view','documents:upload','documents:list','documents:view','party:create','party:view','party:list',
    // Read Models
    'rm:claims:view','rm:complaints:view',
  ],
  call_center: ['claims:register','complaints:create','party:create','party:view'],
  agency_owner: ['sales_network:partners:view','sales_network:contracts:view','sales_network:ledger:view','sales_network:kpi:view'],
  agency_staff: ['sales_network:partners:view','sales_network:contracts:view','sales_network:ledger:view','sales_network:kpi:view'],
  broker_owner: ['sales_network:partners:view','sales_network:contracts:view','sales_network:ledger:view','sales_network:kpi:view'],
  broker_staff: ['sales_network:partners:view','sales_network:contracts:view','sales_network:ledger:view','sales_network:kpi:view'],
  auditor: [
    'claims:view','payments:list','payments:view','complaints:view','complaints:export','documents:list','documents:view','party:list','party:view','reporting:view',
    'sales_network:partners:view','sales_network:contracts:view','sales_network:ledger:view','sales_network:kpi:view',
    // Read Models
    'rm:claims:view','rm:claims:summary','rm:fraud:view','rm:complaints:view',
    'monitoring:metrics:view','monitoring:slos:list','monitoring:alerts:list','monitoring:dashboard:view',
    'document_ai:jobs:list','document_ai:jobs:view','document_ai:audit:list','document_ai:usage:view',
    'document_ai:eval:cases:list','document_ai:eval:runs:list','document_ai:eval:runs:view',
    'dlq:stats','dlq:list',
  ],
  compliance_aml: ['party:list','party:view','kyc:review','reporting:view','aml:consents:view','aml:consents:list','aml:rules:view','aml:rules:list','aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign','aml:dashboard','aml:export'],
  aml_officer: ['aml:consents:view','aml:consents:list','aml:consents:revoke','aml:rules:manage','aml:rules:view','aml:rules:list','aml:alerts:create','aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign','aml:dashboard','aml:export'],
  branch_manager: ['aml:consents:view','aml:consents:list','aml:alerts:view','aml:alerts:list'],
};

export function enterprisePermissionsForRoles(roles: string[] | undefined | null): EnterprisePermissionKey[] {
  const rs = Array.isArray(roles) ? roles : [];
  const out = new Set<EnterprisePermissionKey>();
  for (const r of rs) {
    const perms = ROLE_TO_PERMISSIONS[String(r)];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}

export function hasEnterprisePermission(perms: EnterprisePermissionKey[], perm: EnterprisePermissionKey): boolean {
  return perms.includes(perm);
}

export function getUserRoles(): string[] {
  return (getAuthUser()?.roles || []).map((r) => String(r));
}
