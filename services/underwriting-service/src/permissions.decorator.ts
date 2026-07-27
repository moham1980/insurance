import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from './permissions';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

export function RequirePermissions(...permissions: PermissionKey[]) {
  return SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
}
