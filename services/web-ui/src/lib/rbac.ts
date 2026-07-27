'use client';

import { getAuthUser } from '@/lib/api';

export type ReportingPermissionKey = 'reporting:view' | 'reporting:ingest' | 'reporting:projections:admin';

const REPORTING_ROLE_TO_PERMISSIONS: Record<string, ReportingPermissionKey[]> = {
  insurer_admin: ['reporting:view', 'reporting:ingest', 'reporting:projections:admin'],
  head_office_ops: ['reporting:view'],
  risk_manager: ['reporting:view'],
  auditor: ['reporting:view'],
  finance_ops: ['reporting:view'],
  underwriter: ['reporting:view'],
  claims_handler: ['reporting:view'],
  loss_adjuster: ['reporting:view'],
  fraud_analyst: ['reporting:view'],
  compliance_aml: ['reporting:view'],
  legal_ops: ['reporting:view'],
  complaints_handler: ['reporting:view'],
};

export function getUserRoles(): string[] {
  return (getAuthUser()?.roles || []).map((r) => String(r));
}

export function isInsurerAdmin(roles?: string[] | null): boolean {
  const rs = Array.isArray(roles) ? roles : getUserRoles();
  return rs.includes('insurer_admin');
}

export function reportingPermissionsForRoles(roles?: string[] | null): ReportingPermissionKey[] {
  const rs = Array.isArray(roles) ? roles : getUserRoles();
  const out = new Set<ReportingPermissionKey>();
  for (const r of rs) {
    const perms = REPORTING_ROLE_TO_PERMISSIONS[String(r)];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}

export function hasReportingPermission(perms: ReportingPermissionKey[], perm: ReportingPermissionKey): boolean {
  return perms.includes(perm);
}
