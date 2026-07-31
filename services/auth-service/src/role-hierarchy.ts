/**
 * Role Hierarchy with Inheritance
 * Child roles inherit all permissions from parent roles
 */

export interface RoleHierarchyNode {
  role: string;
  parents: string[];
  children: string[];
}

/**
 * Role hierarchy definition
 * Higher-level roles inherit permissions from lower-level roles
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  // insurer_admin inherits from all other roles
  insurer_admin: ['head_office_ops', 'risk_manager', 'compliance_aml', 'legal_ops'],
  
  // head_office_ops inherits from branch management
  head_office_ops: ['branch_manager', 'underwriter', 'claims_handler'],
  
  // branch_manager inherits from branch staff
  branch_manager: ['branch_staff', 'underwriter', 'claims_handler'],
  
  // underwriter is a specialized role
  underwriter: [],
  
  // claims_handler inherits from loss_adjuster
  claims_handler: ['loss_adjuster'],
  
  // loss_adjuster is a specialized role
  loss_adjuster: [],
  
  // risk_manager is a specialized role
  risk_manager: [],
  
  // compliance_aml is a specialized role
  compliance_aml: [],
  
  // legal_ops is a specialized role
  legal_ops: [],
  
  // complaints_handler is a specialized role
  complaints_handler: [],
  
  // fraud_analyst is a specialized role
  fraud_analyst: [],
  
  // branch_staff is a base role
  branch_staff: [],
  
  // finance_ops is a specialized role
  finance_ops: [],
  
  // collections_ops is a specialized role
  collections_ops: [],
  
  // reinsurance_ops is a specialized role
  reinsurance_ops: [],
  
  // agency_owner inherits from agency_staff
  agency_owner: ['agency_staff'],
  
  // agency_staff is a base role
  agency_staff: [],
  
  // broker_admin inherits from broker_ops and broker_finance
  broker_admin: ['broker_ops', 'broker_finance', 'broker_staff'],

  // broker_ops inherits from broker_sales
  broker_ops: ['broker_sales', 'broker_staff'],

  // broker_sales inherits from broker_staff
  broker_sales: ['broker_staff'],

  // broker_finance is a specialized role
  broker_finance: [],

  // broker_owner inherits from broker_admin (full broker management)
  broker_owner: ['broker_admin'],

  // broker_staff is a base role
  broker_staff: [],

  // sub_agent inherits from broker_sales (limited scope)
  sub_agent: ['broker_sales'],

  // mga_underwriter is a specialized role with underwriting authority
  mga_underwriter: ['broker_staff'],

  // carrier_relationship_manager is a specialized role
  carrier_relationship_manager: ['broker_staff'],

  // call_center is a base role
  call_center: [],
  
  // auditor is a specialized role
  auditor: [],
  
  // regulatory_view is a specialized role
  regulatory_view: [],
};

/**
 * Get all parent roles for a given role (transitive closure)
 */
export function getParentRoles(role: string, visited = new Set<string>()): string[] {
  if (visited.has(role)) return []; // Prevent cycles
  visited.add(role);

  const parents = ROLE_HIERARCHY[role] || [];
  const allParents = [...parents];

  for (const parent of parents) {
    allParents.push(...getParentRoles(parent, visited));
  }

  return [...new Set(allParents)]; // Remove duplicates
}

/**
 * Get all child roles for a given role (transitive closure)
 */
export function getChildRoles(role: string, visited = new Set<string>()): string[] {
  if (visited.has(role)) return []; // Prevent cycles
  visited.add(role);

  const children: string[] = [];

  for (const [r, parents] of Object.entries(ROLE_HIERARCHY)) {
    if (parents.includes(role)) {
      children.push(r);
      children.push(...getChildRoles(r, visited));
    }
  }

  return [...new Set(children)]; // Remove duplicates
}

/**
 * Get all roles in the hierarchy (role + all parents)
 */
export function getAllRolesWithInheritance(role: string): string[] {
  const parents = getParentRoles(role);
  return [...new Set([role, ...parents])];
}

/**
 * Check if role1 is ancestor of role2 (higher in hierarchy)
 */
export function isAncestor(role1: string, role2: string): boolean {
  const parents = getParentRoles(role2);
  return parents.includes(role1);
}

/**
 * Check if role1 is descendant of role2 (lower in hierarchy)
 */
export function isDescendant(role1: string, role2: string): boolean {
  return isAncestor(role2, role1);
}
