/**
 * Centralized permission mapping for the legacy insurance platform.
 *
 * <p>This module aggregates the role-to-permission mappings from all domain
 * services (claims, policy, fraud, underwriting, product, complaints,
 * reinsurance, ...) into a single source of truth. Individual services can
 * import from here instead of maintaining their own {@code permissions.ts}.</p>
 *
 * <p><b>Phase 9 — Risk 12.5 mitigation</b>: the recommendation in
 * {@code docs/insurance-frontend-endpoints/12_integration_roadmap.md} was to
 * create a mapping table in {@code old/insurance/services/common}. This file
 * fulfils that recommendation.</p>
 *
 * <h2>Usage</h2>
 * <pre>
 * import { permissionsForRoles, hasPermission, PERMISSION_REGISTRY } from '@insurance/common/permissions';
 *
 * const perms = permissionsForRoles(['insurer_admin', 'claims_handler']);
 * if (hasPermission(perms, 'claims:approve')) { ... }
 *
 * // Or query the registry directly:
 * const domains = PERMISSION_REGISTRY.domainsForRole('insurer_admin');
 * </pre>
 */

// ---------------------------------------------------------------------------
// Permission keys (union of all domain permission keys)
// ---------------------------------------------------------------------------

export type PermissionKey =
  // claims
  | 'claims:register' | 'claims:view' | 'claims:assess' | 'claims:approve'
  | 'claims:reject' | 'claims:pay' | 'claims:close' | 'claims:list'
  | 'claims:refer_adjuster' | 'claims:advocacy:manage' | 'claims:advocacy:view'
  | 'claims:adjuster:refer' | 'claims:adjuster:respond' | 'claims:adjuster:submit_report'
  | 'claims:projection:view' | 'claims:projection:write' | 'claims:recovery:manage'
  | 'claims:document:attach' | 'claims:document:view' | 'claims:document:download' | 'claims:edit'
  // policy
  | 'policy:quote' | 'policy:submit_docs' | 'policy:risk_assess' | 'policy:underwriting_decide'
  | 'policy:issue' | 'policy:endorse' | 'policy:cancel' | 'policy:renew'
  | 'policy:view' | 'policy:list' | 'policy:set_unique_code'
  | 'policy:sanhab_inquiry' | 'policy:sanhab_inquiries_view'
  | 'policy:quality_gate_override' | 'policy:changes_view' | 'policy:project'
  | 'policy:broker_change' | 'policy:commission_view'
  // fraud
  | 'fraud:triage' | 'fraud:investigate' | 'fraud:escalate'
  | 'fraud:cases:list' | 'fraud:cases:view' | 'fraud:cases:create' | 'fraud:score'
  | 'fraud:ml:view' | 'fraud:ml:train' | 'fraud:ml:deploy' | 'fraud:ml:explain'
  | 'fraud:ml:drift' | 'fraud:ml:predict' | 'fraud:ml:delete'
  | 'fraud:graph:view' | 'fraud:graph:create' | 'fraud:graph:update' | 'fraud:graph:delete'
  | 'fraud:alert:view' | 'fraud:alert:create' | 'fraud:alert:update'
  | 'fraud:document:view' | 'fraud:document:upload'
  // underwriting
  | 'underwriting:create' | 'underwriting:view' | 'underwriting:list'
  | 'underwriting:decide' | 'underwriting:appeal'
  // product
  | 'product:products:create' | 'product:products:view' | 'product:products:list'
  | 'product:products:update' | 'product:products:archive'
  | 'product:coverages:create' | 'product:coverages:view' | 'product:coverages:list'
  | 'product:coverages:update' | 'product:coverages:archive'
  | 'product:deductibles:create' | 'product:deductibles:view' | 'product:deductibles:list'
  | 'product:deductibles:update' | 'product:deductibles:archive'
  | 'product:pricing_rules:create' | 'product:pricing_rules:view' | 'product:pricing_rules:list'
  | 'product:pricing_rules:update' | 'product:pricing_rules:archive'
  | 'product:quote' | 'product:export'
  | 'product:versions:create' | 'product:versions:activate' | 'product:versions:retire'
  | 'product:visibility:create' | 'product:visibility:view' | 'product:visibility:revoke'
  | 'product:offerings:create' | 'product:offerings:view' | 'product:offerings:activate'
  | 'insurer:products:publish'
  // complaints
  | 'complaints:create' | 'complaints:view' | 'complaints:list' | 'complaints:dashboard'
  | 'complaints:escalate' | 'complaints:update_status' | 'complaints:attach_document'
  | 'complaints:otp_request' | 'complaints:otp_verify' | 'complaints:export' | 'complaints:manage'
  // reinsurance
  | 're:treaties:create' | 're:treaties:view' | 're:treaties:list' | 're:treaties:update'
  | 're:treaties:close' | 're:treaties:submit' | 're:treaties:approve'
  | 're:cessions:create' | 're:cessions:view' | 're:cessions:list' | 're:cessions:update' | 're:cessions:approve'
  | 're:statements:create' | 're:statements:view' | 're:statements:list' | 're:statements:update'
  | 're:reconciliations:create' | 're:reconciliations:view' | 're:reconciliations:list' | 're:reconciliations:update'
  | 're:recoveries:create' | 're:recoveries:view' | 're:recoveries:list' | 're:recoveries:update'
  | 're:tickets:create' | 're:tickets:view' | 're:tickets:list' | 're:tickets:update'
  | 're:tickets:assign' | 're:tickets:add_message' | 're:tickets:add_attachment'
  | 're:periods:close' | 're:export';

// ---------------------------------------------------------------------------
// Domain registry — maps each domain prefix to its permission keys
// ---------------------------------------------------------------------------

export type Domain = 'claims' | 'policy' | 'fraud' | 'underwriting' | 'product' | 'complaints' | 'reinsurance';

const DOMAIN_PREFIXES: Record<Domain, string> = {
  claims: 'claims:',
  policy: 'policy:',
  fraud: 'fraud:',
  underwriting: 'underwriting:',
  product: 'product:',
  complaints: 'complaints:',
  reinsurance: 're:',
};

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

export type Role =
  | 'ops_admin' | 'insurer_admin' | 'head_office_ops' | 'branch_manager' | 'branch_staff'
  | 'claims_handler' | 'loss_adjuster' | 'finance_ops' | 'call_center'
  | 'agency_owner' | 'agency_staff' | 'broker_owner' | 'broker_staff'
  | 'underwriter' | 'risk_manager' | 'fraud_analyst' | 'legal_ops' | 'compliance_aml'
  | 'auditor' | 'complaints_handler' | 'reinsurance_ops' | 're_ops'
  | 'uw_ops' | 'product_ops' | 'customer';

// ---------------------------------------------------------------------------
// Centralized role-to-permission mapping
// ---------------------------------------------------------------------------

const ROLE_TO_PERMISSIONS: Record<Role, PermissionKey[]> = {
  // Ecosystem admin (demo-admin) — full access to all domains
  ops_admin: [
    // claims (all)
    'claims:register', 'claims:view', 'claims:assess', 'claims:approve', 'claims:reject', 'claims:pay',
    'claims:close', 'claims:list', 'claims:refer_adjuster',
    'claims:advocacy:manage', 'claims:advocacy:view', 'claims:adjuster:refer', 'claims:adjuster:respond',
    'claims:adjuster:submit_report', 'claims:projection:view', 'claims:projection:write', 'claims:recovery:manage',
    'claims:document:attach', 'claims:document:view', 'claims:document:download', 'claims:edit',
    // policy (all)
    'policy:quote', 'policy:submit_docs', 'policy:risk_assess', 'policy:underwriting_decide',
    'policy:issue', 'policy:endorse', 'policy:cancel', 'policy:renew',
    'policy:view', 'policy:list', 'policy:set_unique_code',
    'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view',
    'policy:quality_gate_override', 'policy:changes_view', 'policy:project',
    'policy:broker_change', 'policy:commission_view',
    // fraud (all)
    'fraud:triage', 'fraud:investigate', 'fraud:escalate', 'fraud:cases:list', 'fraud:cases:view',
    'fraud:cases:create', 'fraud:score', 'fraud:ml:view', 'fraud:ml:train', 'fraud:ml:deploy',
    'fraud:ml:explain', 'fraud:ml:drift', 'fraud:ml:predict', 'fraud:ml:delete',
    'fraud:graph:view', 'fraud:graph:create', 'fraud:graph:update', 'fraud:graph:delete',
    'fraud:alert:view', 'fraud:alert:create', 'fraud:alert:update',
    'fraud:document:view', 'fraud:document:upload',
    // underwriting (all)
    'underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide', 'underwriting:appeal',
    // product (all)
    'product:products:create', 'product:products:view', 'product:products:list', 'product:products:update', 'product:products:archive',
    'product:coverages:create', 'product:coverages:view', 'product:coverages:list', 'product:coverages:update', 'product:coverages:archive',
    'product:deductibles:create', 'product:deductibles:view', 'product:deductibles:list', 'product:deductibles:update', 'product:deductibles:archive',
    'product:pricing_rules:create', 'product:pricing_rules:view', 'product:pricing_rules:list', 'product:pricing_rules:update', 'product:pricing_rules:archive',
    'product:quote', 'product:export', 'product:versions:create', 'product:versions:activate', 'product:versions:retire',
    'product:visibility:create', 'product:visibility:view', 'product:visibility:revoke',
    'product:offerings:create', 'product:offerings:view', 'product:offerings:activate', 'insurer:products:publish',
    // complaints (all)
    'complaints:create', 'complaints:view', 'complaints:list', 'complaints:dashboard',
    'complaints:escalate', 'complaints:update_status', 'complaints:attach_document',
    'complaints:otp_request', 'complaints:otp_verify', 'complaints:export', 'complaints:manage',
    // reinsurance (all)
    're:treaties:create', 're:treaties:view', 're:treaties:list', 're:treaties:update',
    're:treaties:close', 're:treaties:submit', 're:treaties:approve',
    're:cessions:create', 're:cessions:view', 're:cessions:list', 're:cessions:update', 're:cessions:approve',
    're:statements:create', 're:statements:view', 're:statements:list', 're:statements:update',
    're:reconciliations:create', 're:reconciliations:view', 're:reconciliations:list', 're:reconciliations:update',
    're:recoveries:create', 're:recoveries:view', 're:recoveries:list', 're:recoveries:update',
    're:tickets:create', 're:tickets:view', 're:tickets:list', 're:tickets:update',
    're:tickets:assign', 're:tickets:add_message', 're:tickets:add_attachment',
    're:periods:close', 're:export',
  ],

  // Insurer admin — full access to all insurance domains (no ops_admin product extras)
  insurer_admin: [
    // claims (all except projection:write)
    'claims:register', 'claims:view', 'claims:assess', 'claims:approve', 'claims:reject', 'claims:pay',
    'claims:close', 'claims:list', 'claims:refer_adjuster',
    'claims:advocacy:manage', 'claims:advocacy:view', 'claims:adjuster:refer', 'claims:adjuster:respond',
    'claims:adjuster:submit_report', 'claims:projection:view', 'claims:recovery:manage',
    'claims:document:attach', 'claims:document:view', 'claims:document:download',
    // policy (all)
    'policy:quote', 'policy:submit_docs', 'policy:risk_assess', 'policy:underwriting_decide',
    'policy:issue', 'policy:endorse', 'policy:cancel', 'policy:renew',
    'policy:view', 'policy:list', 'policy:set_unique_code',
    'policy:sanhab_inquiry', 'policy:sanhab_inquiries_view',
    'policy:quality_gate_override', 'policy:changes_view', 'policy:project',
    'policy:broker_change', 'policy:commission_view',
    // fraud (triage/investigate/escalate/cases)
    'fraud:triage', 'fraud:investigate', 'fraud:escalate', 'fraud:cases:list',
    // underwriting (all)
    'underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide', 'underwriting:appeal',
    // product (all)
    'product:products:create', 'product:products:view', 'product:products:list', 'product:products:update', 'product:products:archive',
    'product:coverages:create', 'product:coverages:view', 'product:coverages:list', 'product:coverages:update', 'product:coverages:archive',
    'product:deductibles:create', 'product:deductibles:view', 'product:deductibles:list', 'product:deductibles:update', 'product:deductibles:archive',
    'product:pricing_rules:create', 'product:pricing_rules:view', 'product:pricing_rules:list', 'product:pricing_rules:update', 'product:pricing_rules:archive',
    'product:quote', 'product:export', 'product:versions:create', 'product:versions:activate', 'product:versions:retire',
    'product:visibility:create', 'product:visibility:view', 'product:visibility:revoke',
    'product:offerings:create', 'product:offerings:view', 'product:offerings:activate', 'insurer:products:publish',
    // complaints (all)
    'complaints:create', 'complaints:view', 'complaints:list', 'complaints:dashboard',
    'complaints:escalate', 'complaints:update_status', 'complaints:attach_document',
    'complaints:otp_request', 'complaints:otp_verify', 'complaints:export', 'complaints:manage',
    // reinsurance (all)
    're:treaties:create', 're:treaties:view', 're:treaties:list', 're:treaties:update',
    're:treaties:close', 're:treaties:submit', 're:treaties:approve',
    're:cessions:create', 're:cessions:view', 're:cessions:list', 're:cessions:update', 're:cessions:approve',
    're:statements:create', 're:statements:view', 're:statements:list', 're:statements:update',
    're:reconciliations:create', 're:reconciliations:view', 're:reconciliations:list', 're:reconciliations:update',
    're:recoveries:create', 're:recoveries:view', 're:recoveries:list', 're:recoveries:update',
    're:tickets:create', 're:tickets:view', 're:tickets:list', 're:tickets:update',
    're:tickets:assign', 're:tickets:add_message', 're:tickets:add_attachment',
    're:periods:close', 're:export',
  ],

  // Head office operations — view + operational actions across domains
  head_office_ops: [
    // claims
    'claims:view', 'claims:list', 'claims:pay', 'claims:advocacy:view', 'claims:projection:view',
    // policy
    'policy:quote', 'policy:submit_docs', 'policy:risk_assess', 'policy:underwriting_decide',
    'policy:issue', 'policy:view', 'policy:list', 'policy:sanhab_inquiries_view', 'policy:changes_view',
    // fraud
    'fraud:cases:list',
    // underwriting
    'underwriting:create', 'underwriting:view', 'underwriting:list',
    // product
    'product:products:view', 'product:products:list', 'product:coverages:view', 'product:coverages:list',
    'product:deductibles:view', 'product:deductibles:list', 'product:pricing_rules:view', 'product:pricing_rules:list',
    'product:quote', 'product:export',
    // complaints
    'complaints:view', 'complaints:list', 'complaints:dashboard',
    'complaints:escalate', 'complaints:update_status', 'complaints:attach_document',
    'complaints:otp_request', 'complaints:otp_verify', 'complaints:export', 'complaints:manage',
    // reinsurance
    're:treaties:view', 're:treaties:list', 're:cessions:view', 're:cessions:list',
    're:statements:view', 're:statements:list', 're:reconciliations:view', 're:reconciliations:list',
    're:recoveries:view', 're:recoveries:list', 're:tickets:view', 're:tickets:list', 're:export',
  ],

  // Branch manager — view + approve + refer
  branch_manager: [
    // claims
    'claims:view', 'claims:list', 'claims:approve', 'claims:refer_adjuster',
    'claims:advocacy:manage', 'claims:adjuster:refer', 'claims:projection:view',
    'claims:document:view', 'claims:document:download',
    // policy
    'policy:view', 'policy:list', 'policy:quote', 'policy:submit_docs',
    // underwriting
    'underwriting:view', 'underwriting:list',
    // complaints
    'complaints:view', 'complaints:list', 'complaints:dashboard', 'complaints:escalate', 'complaints:update_status',
  ],

  // Branch staff — view only
  branch_staff: [
    'claims:view', 'claims:list', 'claims:advocacy:view',
    'complaints:view', 'complaints:list',
  ],

  // Claims handler — full claims lifecycle
  claims_handler: [
    'claims:register', 'claims:view', 'claims:list', 'claims:assess', 'claims:approve', 'claims:reject',
    'claims:close', 'claims:refer_adjuster', 'claims:advocacy:manage', 'claims:adjuster:refer',
    'claims:projection:view', 'claims:projection:write', 'claims:document:attach', 'claims:document:view', 'claims:document:download',
  ],

  // Loss adjuster — assess + respond + submit report
  loss_adjuster: [
    'claims:view', 'claims:list', 'claims:assess', 'claims:refer_adjuster',
    'claims:adjuster:respond', 'claims:adjuster:submit_report',
  ],

  // Finance ops — pay + recovery
  finance_ops: [
    'claims:view', 'claims:list', 'claims:pay', 'claims:recovery:manage',
  ],

  // Call center — register + advocacy view
  call_center: [
    'claims:register', 'claims:advocacy:view',
    'complaints:create', 'complaints:view', 'complaints:list', 'complaints:dashboard',
    'complaints:otp_request', 'complaints:otp_verify',
  ],

  // Agency owner/staff — register + advocacy
  agency_owner: ['claims:register', 'claims:advocacy:view'],
  agency_staff: ['claims:register', 'claims:advocacy:view'],

  // Broker owner — register + view + advocacy + adjuster + docs
  broker_owner: [
    'claims:register', 'claims:view', 'claims:list', 'claims:advocacy:manage', 'claims:advocacy:view',
    'claims:adjuster:refer', 'claims:projection:view',
    'claims:document:attach', 'claims:document:view', 'claims:document:download',
    'policy:quote', 'policy:view', 'policy:list',
    'underwriting:view', 'underwriting:list', 'underwriting:appeal',
    'product:products:view', 'product:products:list', 'product:coverages:view', 'product:coverages:list',
    'product:deductibles:view', 'product:deductibles:list', 'product:pricing_rules:view', 'product:pricing_rules:list',
    'product:quote', 'product:offerings:view',
  ],

  // Broker staff — register + view + advocacy
  broker_staff: [
    'claims:register', 'claims:view', 'claims:list', 'claims:advocacy:view',
    'underwriting:view', 'underwriting:list', 'underwriting:appeal',
    'product:products:view', 'product:products:list', 'product:quote',
  ],

  // Underwriter — policy underwriting
  underwriter: [
    'policy:quote', 'policy:submit_docs', 'policy:risk_assess', 'policy:underwriting_decide',
    'policy:issue', 'policy:view', 'policy:list',
  ],

  // Risk manager — fraud triage + underwriting decide
  risk_manager: [
    'fraud:triage', 'fraud:cases:list',
    'underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide',
  ],

  // Fraud analyst — fraud investigation
  fraud_analyst: [
    'fraud:triage', 'fraud:investigate', 'fraud:escalate', 'fraud:cases:list',
  ],

  // Legal ops — fraud investigate + complaints
  legal_ops: [
    'fraud:investigate', 'fraud:escalate', 'fraud:cases:list',
    'complaints:view', 'complaints:list',
  ],

  // Compliance/AML — view across domains
  compliance_aml: [
    'claims:view', 'claims:list',
    'complaints:view', 'complaints:list',
  ],

  // Auditor — view only across domains
  auditor: [
    'claims:view', 'claims:list',
    'policy:view', 'policy:list',
    'fraud:cases:list',
    'underwriting:view', 'underwriting:list',
    'product:products:view', 'product:products:list',
    'complaints:view', 'complaints:list',
    're:treaties:view', 're:treaties:list', 're:cessions:view', 're:cessions:list',
    're:statements:view', 're:statements:list', 're:reconciliations:view', 're:reconciliations:list',
    're:recoveries:view', 're:recoveries:list', 're:tickets:view', 're:tickets:list', 're:export',
  ],

  // Complaints handler — complaints management
  complaints_handler: [
    'complaints:create', 'complaints:view', 'complaints:list', 'complaints:dashboard',
    'complaints:escalate', 'complaints:update_status', 'complaints:attach_document',
    'complaints:otp_request', 'complaints:otp_verify', 'complaints:export', 'complaints:manage',
  ],

  // Reinsurance ops — full reinsurance
  reinsurance_ops: [
    're:treaties:create', 're:treaties:view', 're:treaties:list', 're:treaties:update',
    're:treaties:close', 're:treaties:submit', 're:treaties:approve',
    're:cessions:create', 're:cessions:view', 're:cessions:list', 're:cessions:update', 're:cessions:approve',
    're:statements:create', 're:statements:view', 're:statements:list', 're:statements:update',
    're:reconciliations:create', 're:reconciliations:view', 're:reconciliations:list', 're:reconciliations:update',
    're:recoveries:create', 're:recoveries:view', 're:recoveries:list', 're:recoveries:update',
    're:tickets:create', 're:tickets:view', 're:tickets:list', 're:tickets:update',
    're:tickets:assign', 're:tickets:add_message', 're:tickets:add_attachment',
    're:periods:close', 're:export',
  ],

  // Alias for reinsurance_ops (some services use re_ops)
  re_ops: [
    're:treaties:create', 're:treaties:view', 're:treaties:list', 're:treaties:update',
    're:treaties:close', 're:treaties:submit', 're:treaties:approve',
    're:cessions:create', 're:cessions:view', 're:cessions:list', 're:cessions:update', 're:cessions:approve',
    're:statements:create', 're:statements:view', 're:statements:list', 're:statements:update',
    're:reconciliations:create', 're:reconciliations:view', 're:reconciliations:list', 're:reconciliations:update',
    're:recoveries:create', 're:recoveries:view', 're:recoveries:list', 're:recoveries:update',
    're:tickets:create', 're:tickets:view', 're:tickets:list', 're:tickets:update',
    're:tickets:assign', 're:tickets:add_message', 're:tickets:add_attachment',
    're:periods:close', 're:export',
  ],

  // UW ops — product + underwriting
  uw_ops: [
    'product:products:create', 'product:products:view', 'product:products:list', 'product:products:update',
    'product:coverages:create', 'product:coverages:view', 'product:coverages:list', 'product:coverages:update',
    'product:deductibles:create', 'product:deductibles:view', 'product:deductibles:list', 'product:deductibles:update',
    'product:pricing_rules:create', 'product:pricing_rules:view', 'product:pricing_rules:list', 'product:pricing_rules:update',
    'product:quote', 'product:export',
    'underwriting:create', 'underwriting:view', 'underwriting:list',
  ],

  // Product ops — product management
  product_ops: [
    'product:products:create', 'product:products:view', 'product:products:list', 'product:products:update',
    'product:coverages:create', 'product:coverages:view', 'product:coverages:list', 'product:coverages:update',
    'product:deductibles:create', 'product:deductibles:view', 'product:deductibles:list', 'product:deductibles:update',
    'product:pricing_rules:create', 'product:pricing_rules:view', 'product:pricing_rules:list', 'product:pricing_rules:update',
    'product:quote', 'product:export',
  ],

  // Customer — view own policies/claims (customer portal)
  customer: [
    'policy:view', 'policy:list',
    'claims:view', 'claims:list', 'claims:register',
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the set of permission keys granted to the given roles.
 * Unknown roles are silently ignored.
 */
export function permissionsForRoles(roles: string[] | undefined | null): PermissionKey[] {
  const rs = Array.isArray(roles) ? roles : [];
  const out = new Set<PermissionKey>();
  for (const r of rs) {
    const perms = ROLE_TO_PERMISSIONS[r as Role];
    if (!perms) continue;
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}

/**
 * Check if a permission is granted.
 */
export function hasPermission(permissions: PermissionKey[], required: PermissionKey): boolean {
  return permissions.includes(required);
}

/**
 * Check if any of the required permissions is granted.
 */
export function hasAnyPermission(permissions: PermissionKey[], required: PermissionKey[]): boolean {
  return required.some((p) => permissions.includes(p));
}

/**
 * Filter permissions by domain prefix.
 */
export function permissionsForDomain(permissions: PermissionKey[], domain: Domain): PermissionKey[] {
  const prefix = DOMAIN_PREFIXES[domain];
  return permissions.filter((p) => p.startsWith(prefix));
}

/**
 * List all known roles.
 */
export function allRoles(): Role[] {
  return Object.keys(ROLE_TO_PERMISSIONS) as Role[];
}

/**
 * List all known permission keys.
 */
export function allPermissions(): PermissionKey[] {
  const out = new Set<PermissionKey>();
  for (const perms of Object.values(ROLE_TO_PERMISSIONS)) {
    for (const p of perms) out.add(p);
  }
  return Array.from(out);
}

/**
 * Get the domains that a role has access to.
 */
export function domainsForRole(role: string): Domain[] {
  const perms = ROLE_TO_PERMISSIONS[role as Role];
  if (!perms) return [];
  const domains = new Set<Domain>();
  for (const [domain, prefix] of Object.entries(DOMAIN_PREFIXES) as [Domain, string][]) {
    if (perms.some((p) => p.startsWith(prefix))) {
      domains.add(domain);
    }
  }
  return Array.from(domains);
}

/**
 * Permission registry — provides introspection APIs.
 */
export const PERMISSION_REGISTRY = {
  roles: allRoles(),
  permissions: allPermissions(),
  domains: Object.keys(DOMAIN_PREFIXES) as Domain[],
  permissionsForRoles,
  hasPermission,
  hasAnyPermission,
  permissionsForDomain,
  domainsForRole,
  rolePermissions: (role: string) => ROLE_TO_PERMISSIONS[role as Role] || [],
};
