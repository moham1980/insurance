export { EcosystemJwtGuard, EcosystemJwtPayload } from './ecosystem-jwt.guard';
export {
  PERMISSION_REGISTRY,
  permissionsForRoles,
  hasPermission,
  hasAnyPermission,
  permissionsForDomain,
  domainsForRole,
  allRoles,
  allPermissions,
  type PermissionKey,
  type Domain,
  type Role,
} from './permission-registry';
