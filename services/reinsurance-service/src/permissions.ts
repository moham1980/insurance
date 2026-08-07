export type PermissionKey =
  | 're:treaties:create'
  | 're:treaties:view'
  | 're:treaties:list'
  | 're:treaties:update'
  | 're:treaties:close'
  // P1 #5 (SoD): submit and approve are separate permissions.
  // A user with :submit cannot self-approve; a different user with :approve must review.
  | 're:treaties:submit'
  | 're:treaties:approve'
  | 're:cessions:create'
  | 're:cessions:view'
  | 're:cessions:list'
  | 're:cessions:update'
  | 're:cessions:approve'
  | 're:statements:create'
  | 're:statements:view'
  | 're:statements:list'
  | 're:statements:update'
  | 're:reconciliations:create'
  | 're:reconciliations:view'
  | 're:reconciliations:list'
  | 're:reconciliations:update'
  | 're:recoveries:create'
  | 're:recoveries:view'
  | 're:recoveries:list'
  | 're:recoveries:update'
  | 're:tickets:create'
  | 're:tickets:view'
  | 're:tickets:list'
  | 're:tickets:update'
  | 're:tickets:assign'
  | 're:tickets:add_message'
  | 're:tickets:add_attachment'
  | 're:periods:close'
  | 're:export';

const ROLE_TO_PERMISSIONS: Record<string, PermissionKey[]> = {
  insurer_admin: [
    're:treaties:create',
    're:treaties:view',
    're:treaties:list',
    're:treaties:update',
    're:treaties:close',
    're:treaties:submit',
    're:treaties:approve',
    're:cessions:create',
    're:cessions:view',
    're:cessions:list',
    're:cessions:update',
    're:cessions:approve',
    're:statements:create',
    're:statements:view',
    're:statements:list',
    're:statements:update',
    're:reconciliations:create',
    're:reconciliations:view',
    're:reconciliations:list',
    're:reconciliations:update',
    're:recoveries:create',
    're:recoveries:view',
    're:recoveries:list',
    're:recoveries:update',
    're:tickets:create',
    're:tickets:view',
    're:tickets:list',
    're:tickets:update',
    're:tickets:assign',
    're:tickets:add_message',
    're:tickets:add_attachment',
    're:periods:close',
    're:export',
  ],
  head_office_ops: [
    're:treaties:view',
    're:treaties:list',
    're:treaties:update',
    're:treaties:approve',
    're:cessions:view',
    're:cessions:list',
    're:cessions:update',
    're:cessions:approve',
    're:statements:view',
    're:statements:list',
    're:statements:update',
    're:reconciliations:view',
    're:reconciliations:list',
    're:reconciliations:update',
    're:recoveries:view',
    're:recoveries:list',
    're:recoveries:update',
    're:tickets:view',
    're:tickets:list',
    're:tickets:update',
    're:tickets:assign',
    're:tickets:add_message',
    're:tickets:add_attachment',
    're:periods:close',
    're:export',
  ],
  re_ops: [
    're:treaties:create',
    're:treaties:view',
    're:treaties:list',
    're:treaties:update',
    're:treaties:close',
    're:treaties:submit',
    're:cessions:create',
    're:cessions:view',
    're:cessions:list',
    're:cessions:update',
    're:cessions:approve',
    're:statements:create',
    're:statements:view',
    're:statements:list',
    're:statements:update',
    're:reconciliations:create',
    're:reconciliations:view',
    're:reconciliations:list',
    're:reconciliations:update',
    're:recoveries:create',
    're:recoveries:view',
    're:recoveries:list',
    're:recoveries:update',
    're:tickets:create',
    're:tickets:view',
    're:tickets:list',
    're:tickets:update',
    're:tickets:assign',
    're:tickets:add_message',
    're:tickets:add_attachment',
    're:periods:close',
    're:export',
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
