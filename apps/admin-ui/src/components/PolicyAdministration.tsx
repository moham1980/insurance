/**
 * Policy Administration Component
 * Manages ABAC policies, rules, and conditions
 */

import React, { useState, useEffect } from 'react';

interface Policy {
  policyId: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions: Condition[];
  priority: number;
  status: 'active' | 'inactive';
}

interface Condition {
  type: 'role' | 'attribute' | 'context';
  key: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

interface PolicyAdministrationProps {
  onSave?: (policy: Policy) => void;
}

export const PolicyAdministration: React.FC<PolicyAdministrationProps> = ({ onSave }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sample policies data
  const samplePolicies: Policy[] = [
    {
      policyId: 'policy-1',
      name: 'Agent Policy Read Access',
      description: 'Allow agents to read policies for their assigned customers',
      resource: 'policy',
      action: 'read',
      effect: 'allow',
      conditions: [
        { type: 'role', key: 'role', operator: 'equals', value: 'agent' },
        { type: 'attribute', key: 'customer.agentId', operator: 'equals', value: '${userId}' },
      ],
      priority: 100,
      status: 'active',
    },
    {
      policyId: 'policy-2',
      name: 'Claims Adjuster Assessment',
      description: 'Allow claims adjusters to assess claims',
      resource: 'claims',
      action: 'assess',
      effect: 'allow',
      conditions: [
        { type: 'role', key: 'role', operator: 'equals', value: 'claims_adjuster' },
        { type: 'context', key: 'claim.status', operator: 'equals', value: 'submitted' },
      ],
      priority: 100,
      status: 'active',
    },
    {
      policyId: 'policy-3',
      name: 'Finance Manager Payment Approval',
      description: 'Allow finance managers to approve payments above certain threshold',
      resource: 'payments',
      action: 'approve',
      effect: 'allow',
      conditions: [
        { type: 'role', key: 'role', operator: 'equals', value: 'finance_manager' },
        { type: 'context', key: 'payment.amount', operator: 'less_than', value: '1000000' },
      ],
      priority: 100,
      status: 'active',
    },
    {
      policyId: 'policy-4',
      name: 'Deny Cross-Tenant Access',
      description: 'Deny access to resources from other tenants',
      resource: '*',
      action: '*',
      effect: 'deny',
      conditions: [
        { type: 'context', key: 'resource.tenantId', operator: 'not_equals', value: '${user.tenantId}' },
      ],
      priority: 1,
      status: 'active',
    },
  ];

  useEffect(() => {
    setPolicies(samplePolicies);
    setLoading(false);
  }, []);

  const handleCreatePolicy = () => {
    const newPolicy: Policy = {
      policyId: `policy-${Date.now()}`,
      name: '',
      description: '',
      resource: '',
      action: '',
      effect: 'allow',
      conditions: [],
      priority: 100,
      status: 'active',
    };
    setSelectedPolicy(newPolicy);
    setIsEditing(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsEditing(true);
  };

  const handleSavePolicy = () => {
    if (!selectedPolicy) return;

    if (isEditing) {
      setPolicies(prevPolicies =>
        prevPolicies.map(p => (p.policyId === selectedPolicy.policyId ? selectedPolicy : p)),
      );
    } else {
      setPolicies(prevPolicies => [...prevPolicies, selectedPolicy]);
    }

    if (onSave) {
      onSave(selectedPolicy);
    }

    setIsEditing(false);
    setSelectedPolicy(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedPolicy(null);
  };

  const handleDeletePolicy = (policyId: string) => {
    setPolicies(prevPolicies => prevPolicies.filter(p => p.policyId !== policyId));
  };

  const handleToggleStatus = (policyId: string) => {
    setPolicies(prevPolicies =>
      prevPolicies.map(p =>
        p.policyId === policyId
          ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
          : p,
      ),
    );
  };

  const addCondition = () => {
    if (!selectedPolicy) return;

    setSelectedPolicy({
      ...selectedPolicy,
      conditions: [
        ...selectedPolicy.conditions,
        { type: 'attribute', key: '', operator: 'equals', value: '' },
      ],
    });
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    if (!selectedPolicy) return;

    setSelectedPolicy({
      ...selectedPolicy,
      conditions: selectedPolicy.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    });
  };

  const removeCondition = (index: number) => {
    if (!selectedPolicy) return;

    setSelectedPolicy({
      ...selectedPolicy,
      conditions: selectedPolicy.conditions.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return <div className="p-6">Loading policy administration...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Policy Administration</h2>
          <p className="text-gray-600">Manage ABAC policies and access control rules</p>
        </div>
        <button
          onClick={handleCreatePolicy}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Policy
        </button>
      </div>

      {!isEditing ? (
        <div className="space-y-4">
          {policies.map(policy => (
            <div
              key={policy.policyId}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                  <p className="text-sm text-gray-500">{policy.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleStatus(policy.policyId)}
                    className={`px-3 py-1 text-sm rounded ${
                      policy.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {policy.status}
                  </button>
                  <button
                    onClick={() => handleEditPolicy(policy)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePolicy(policy.policyId)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Resource:</span>{' '}
                  <span className="text-gray-900">{policy.resource}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Action:</span>{' '}
                  <span className="text-gray-900">{policy.action}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Effect:</span>{' '}
                  <span
                    className={`${
                      policy.effect === 'allow' ? 'text-green-600' : 'text-red-600'
                    } font-semibold`}
                  >
                    {policy.effect}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <span className="font-medium text-gray-700 text-sm">Priority:</span>{' '}
                <span className="text-gray-900 text-sm">{policy.priority}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="font-medium text-gray-700 text-sm">Conditions:</span>{' '}
                <span className="text-gray-900 text-sm">{policy.conditions.length}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedPolicy?.name ? 'Edit Policy' : 'Create Policy'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  value={selectedPolicy?.name || ''}
                  onChange={(e) =>
                    setSelectedPolicy({ ...selectedPolicy!, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <input
                  type="text"
                  value={selectedPolicy?.resource || ''}
                  onChange={(e) =>
                    setSelectedPolicy({ ...selectedPolicy!, resource: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., policy, claims, *"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <input
                  type="text"
                  value={selectedPolicy?.action || ''}
                  onChange={(e) =>
                    setSelectedPolicy({ ...selectedPolicy!, action: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., read, create, *"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effect
                </label>
                <select
                  value={selectedPolicy?.effect || 'allow'}
                  onChange={(e) =>
                    setSelectedPolicy({
                      ...selectedPolicy!,
                      effect: e.target.value as 'allow' | 'deny',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedPolicy?.description || ''}
                  onChange={(e) =>
                    setSelectedPolicy({ ...selectedPolicy!, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={selectedPolicy?.priority || 100}
                  onChange={(e) =>
                    setSelectedPolicy({
                      ...selectedPolicy!,
                      priority: parseInt(e.target.value) || 100,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Conditions</h4>
                <button
                  onClick={addCondition}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Condition
                </button>
              </div>
              {selectedPolicy?.conditions.map((condition, index) => (
                <div key={index} className="grid grid-cols-4 gap-3 mb-3">
                  <select
                    value={condition.type}
                    onChange={(e) => updateCondition(index, 'type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="role">Role</option>
                    <option value="attribute">Attribute</option>
                    <option value="context">Context</option>
                  </select>
                  <input
                    type="text"
                    value={condition.key}
                    onChange={(e) => updateCondition(index, 'key', e.target.value)}
                    placeholder="Key"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                  </select>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeCondition(index)}
                      className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePolicy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Policy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyAdministration;
