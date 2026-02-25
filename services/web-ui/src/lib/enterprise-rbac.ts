'use client';

import { getAuthUser } from '@/lib/api';

export type EnterprisePermissionKey =
  | 'claims:register'
  | 'claims:list'
  | 'claims:view'
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
  | 'fraud:cases:list'
  | 'fraud:triage'
  | 'fraud:investigate'
  | 'complaints:create'
  | 'complaints:list'
  | 'complaints:view'
  | 'complaints:update_status'
  | 'complaints:attach_document'
  | 'complaints:export'
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
  | 'reporting:view';

const ROLE_TO_PERMISSIONS: Record<string, EnterprisePermissionKey[]> = {
  insurer_admin: [
    'claims:register','claims:list','claims:view',
    'payments:list','payments:view','payments:prepare','payments:approve','payments:execute','payments:fail','payments:notify',
    'collections:plan_create','collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list',
    'aml:consents:create','aml:consents:view','aml:consents:list','aml:consents:revoke',
    'aml:rules:manage','aml:rules:view','aml:rules:list',
    'aml:alerts:create','aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign',
    'aml:dashboard','aml:export',
    'fraud:cases:list','fraud:triage','fraud:investigate',
    'complaints:create','complaints:list','complaints:view','complaints:update_status','complaints:attach_document','complaints:export',
    'documents:list','documents:view','documents:upload',
    'work_items:list','work_items:view','work_items:assign','work_items:complete',
    'party:list','party:view','party:create','kyc:review',
    'reporting:view',
  ],
  head_office_ops: [
    'claims:list','claims:view',
    'payments:list','payments:view','payments:approve','payments:execute','payments:notify',
    'collections:plan_create','collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list',
    'aml:consents:view','aml:consents:list',
    'aml:rules:view','aml:rules:list',
    'aml:alerts:view','aml:alerts:list','aml:alerts:update_status','aml:alerts:assign',
    'aml:dashboard','aml:export',
    'fraud:cases:list',
    'complaints:list','complaints:view','complaints:update_status','complaints:attach_document','complaints:export',
    'documents:list','documents:view',
    'work_items:list','work_items:view',
    'party:list','party:view','party:create',
    'reporting:view',
  ],
  claims_handler: ['claims:register','claims:list','claims:view','documents:list','documents:view','documents:upload','work_items:list','work_items:view','work_items:complete','reporting:view'],
  finance_ops: ['payments:list','payments:view','payments:approve','payments:execute','payments:fail','payments:notify','reporting:view'],
  finance: ['collections:plan_view','collections:plan_list','collections:installment_pay','collections:installment_view','collections:installment_list','reporting:view'],
  fraud_analyst: ['fraud:cases:list','fraud:triage','fraud:investigate','work_items:list','work_items:view','work_items:complete','reporting:view'],
  risk_manager: ['fraud:cases:list','fraud:triage','reporting:view','party:list','party:view'],
  complaints_handler: ['complaints:create','complaints:list','complaints:view','complaints:update_status','complaints:attach_document','complaints:export','reporting:view'],
  legal_ops: ['fraud:cases:list','fraud:investigate','complaints:list','complaints:view','complaints:update_status','complaints:attach_document','complaints:export','reporting:view'],
  branch_staff: ['claims:list','claims:view','complaints:create','complaints:list','complaints:view','documents:upload','documents:list','documents:view','party:create','party:view','party:list'],
  call_center: ['claims:register','complaints:create','party:create','party:view'],
  auditor: ['claims:list','claims:view','payments:list','payments:view','fraud:cases:list','complaints:list','complaints:view','complaints:export','documents:list','documents:view','party:list','party:view','reporting:view'],
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
