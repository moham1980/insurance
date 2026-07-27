export type PermissionKey =
  | 'product:products:create'
  | 'product:products:view'
  | 'product:products:list'
  | 'product:products:update'
  | 'product:products:archive'
  | 'product:coverages:create'
  | 'product:coverages:view'
  | 'product:coverages:list'
  | 'product:coverages:update'
  | 'product:coverages:archive'
  | 'product:deductibles:create'
  | 'product:deductibles:view'
  | 'product:deductibles:list'
  | 'product:deductibles:update'
  | 'product:deductibles:archive'
  | 'product:pricing_rules:create'
  | 'product:pricing_rules:view'
  | 'product:pricing_rules:list'
  | 'product:pricing_rules:update'
  | 'product:pricing_rules:archive'
  | 'product:quote'
  | 'product:export';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    'product:products:create',
    'product:products:view',
    'product:products:list',
    'product:products:update',
    'product:products:archive',
    'product:coverages:create',
    'product:coverages:view',
    'product:coverages:list',
    'product:coverages:update',
    'product:coverages:archive',
    'product:deductibles:create',
    'product:deductibles:view',
    'product:deductibles:list',
    'product:deductibles:update',
    'product:deductibles:archive',
    'product:pricing_rules:create',
    'product:pricing_rules:view',
    'product:pricing_rules:list',
    'product:pricing_rules:update',
    'product:pricing_rules:archive',
    'product:quote',
    'product:export',
  ],
  head_office_ops: [
    'product:products:view',
    'product:products:list',
    'product:coverages:view',
    'product:coverages:list',
    'product:deductibles:view',
    'product:deductibles:list',
    'product:pricing_rules:view',
    'product:pricing_rules:list',
    'product:quote',
    'product:export',
  ],
  uw_ops: [
    'product:products:view',
    'product:products:list',
    'product:coverages:view',
    'product:coverages:list',
    'product:deductibles:view',
    'product:deductibles:list',
    'product:pricing_rules:view',
    'product:pricing_rules:list',
    'product:quote',
  ],
  product_ops: [
    'product:products:create',
    'product:products:view',
    'product:products:list',
    'product:products:update',
    'product:products:archive',
    'product:coverages:create',
    'product:coverages:view',
    'product:coverages:list',
    'product:coverages:update',
    'product:coverages:archive',
    'product:deductibles:create',
    'product:deductibles:view',
    'product:deductibles:list',
    'product:deductibles:update',
    'product:deductibles:archive',
    'product:pricing_rules:create',
    'product:pricing_rules:view',
    'product:pricing_rules:list',
    'product:pricing_rules:update',
    'product:pricing_rules:archive',
    'product:quote',
    'product:export',
  ],
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
