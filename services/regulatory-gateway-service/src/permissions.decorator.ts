import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './permissions';

export const PERMISSIONS_KEY = 'required_permissions';

export const RequirePermissions = (...permissions: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, permissions);
