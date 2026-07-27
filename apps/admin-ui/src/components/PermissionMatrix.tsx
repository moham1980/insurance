/**
 * Permission Matrix Component
 * Displays and manages permissions matrix for roles and resources
 */

import React, { useState, useEffect } from 'react';

interface Permission {
  resource: string;
  action: string;
  description: string;
}

interface RolePermission {
  roleId: string;
  roleName: string;
  permissions: string[];
}

interface PermissionMatrixProps {
  onSave?: (matrix: RolePermission[]) => void;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ onSave }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Sample permissions data
  const samplePermissions: Permission[] = [
    { resource: 'policy', action: 'read', description: 'View policies' },
    { resource: 'policy', action: 'create', description: 'Create policies' },
    { resource: 'policy', action: 'update', description: 'Update policies' },
    { resource: 'policy', action: 'delete', description: 'Delete policies' },
    { resource: 'claims', action: 'read', description: 'View claims' },
    { resource: 'claims', action: 'create', description: 'Create claims' },
    { resource: 'claims', action: 'assess', description: 'Assess claims' },
    { resource: 'claims', action: 'settle', description: 'Settle claims' },
    { resource: 'payments', action: 'prepare', description: 'Prepare payments' },
    { resource: 'payments', action: 'approve', description: 'Approve payments' },
    { resource: 'payments', action: 'execute', description: 'Execute payments' },
    { resource: 'iam', action: 'manage_roles', description: 'Manage roles' },
    { resource: 'iam', action: 'manage_permissions', description: 'Manage permissions' },
    { resource: 'iam', action: 'view_audit', description: 'View audit logs' },
  ];

  // Sample roles data
  const sampleRoles: RolePermission[] = [
    {
      roleId: 'role-1',
      roleName: 'Agent',
      permissions: ['policy:read', 'claims:read', 'claims:create'],
    },
    {
      roleId: 'role-2',
      roleName: 'Claims Adjuster',
      permissions: ['policy:read', 'claims:read', 'claims:assess', 'claims:settle'],
    },
    {
      roleId: 'role-3',
      roleName: 'Finance Manager',
      permissions: ['payments:prepare', 'payments:approve', 'payments:execute'],
    },
    {
      roleId: 'role-4',
      roleName: 'Administrator',
      permissions: samplePermissions.map(p => `${p.resource}:${p.action}`),
    },
  ];

  useEffect(() => {
    setPermissions(samplePermissions);
    setRoles(sampleRoles);
    setLoading(false);
  }, []);

  const togglePermission = (permissionKey: string) => {
    if (!selectedRole) return;

    setRoles(prevRoles =>
      prevRoles.map(role => {
        if (role.roleId === selectedRole) {
          const newPermissions = role.permissions.includes(permissionKey)
            ? role.permissions.filter(p => p !== permissionKey)
            : [...role.permissions, permissionKey];
          return { ...role, permissions: newPermissions };
        }
        return role;
      }),
    );
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!selectedRole) return false;
    const role = roles.find(r => r.roleId === selectedRole);
    return role?.permissions.includes(permissionKey) || false;
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleSave = () => {
    if (onSave) {
      onSave(roles);
    }
  };

  if (loading) {
    return <div className="p-6">Loading permission matrix...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Matrix</h2>
        <p className="text-gray-600">Manage permissions for different roles</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Role
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select a role --</option>
          {roles.map(role => (
            <option key={role.roleId} value={role.roleId}>
              {role.roleName}
            </option>
          ))}
        </select>
      </div>

      {selectedRole && (
        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                {resource}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {perms.map(permission => {
                  const permissionKey = `${permission.resource}:${permission.action}`;
                  return (
                    <label
                      key={permissionKey}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={hasPermission(permissionKey)}
                        onChange={() => togglePermission(permissionKey)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 capitalize">
                          {permission.action}
                        </div>
                        <div className="text-sm text-gray-500">
                          {permission.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRole && (
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setRoles(sampleRoles)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
