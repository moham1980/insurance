export type PermissionKey = 'reporting:view' | 'reporting:ingest' | 'reporting:projections:admin' | 'reporting:manage';

export const permissionsForRoles = (roles: string[] | undefined | null): PermissionKey[] => {
  const rs = Array.isArray(roles) ? roles : [];

  const perms = new Set<PermissionKey>();
  for (const r of rs) {
    const role = String(r);
    if (role === 'insurer_admin') {
      perms.add('reporting:view');
      perms.add('reporting:ingest');
      perms.add('reporting:projections:admin');
      perms.add('reporting:manage');
    }
    if (
      role === 'head_office_ops' ||
      role === 'risk_manager' ||
      role === 'auditor' ||
      role === 'finance_ops' ||
      role === 'underwriter' ||
      role === 'claims_handler' ||
      role === 'loss_adjuster' ||
      role === 'fraud_analyst' ||
      role === 'compliance_aml' ||
      role === 'legal_ops' ||
      role === 'complaints_handler'
    ) {
      perms.add('reporting:view');
    }
  }

  return Array.from(perms);
};
