'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Shield, Search, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@insurance/design-system';

const ALL_ROLES = [
  'super_admin', 'insurer_admin', 'head_office_ops', 'claims_adjuster',
  'complaints_officer', 'fraud_analyst', 'aml_officer', 'product_manager',
  'collections_ops', 'ops', 'bi_analyst', 'sales_agent', 'underwriter',
  'loss_adjuster', 'agency_admin', 'broker', 'reinsurance_ops', 'regulatory_view',
];

const PERMISSION_CATEGORIES = [
  { key: 'claims', label: 'خسارت', permissions: ['claims:register', 'claims:view', 'claims:assess'] },
  { key: 'underwriting', label: 'بیمه‌نامه‌گذاری', permissions: ['underwriting:view'] },
  { key: 'payments', label: 'پرداخت', permissions: ['payments:list', 'payments:view', 'payments:prepare', 'payments:approve', 'payments:execute', 'payments:fail', 'payments:notify'] },
  { key: 'collections', label: 'وصول', permissions: ['collections:plan_create', 'collections:plan_view', 'collections:plan_list', 'collections:installment_pay', 'collections:installment_view', 'collections:installment_list'] },
  { key: 'aml', label: 'AML', permissions: ['aml:consents:create', 'aml:consents:view', 'aml:consents:list', 'aml:consents:revoke', 'aml:rules:manage', 'aml:rules:view', 'aml:rules:list', 'aml:alerts:create', 'aml:alerts:view', 'aml:alerts:list', 'aml:alerts:update_status', 'aml:alerts:assign', 'aml:dashboard', 'aml:export'] },
  { key: 'fraud', label: 'تقلب', permissions: ['fraud:triage', 'fraud:investigate', 'fraud:escalate'] },
  { key: 'complaints', label: 'شکایات', permissions: ['complaints:create', 'complaints:view', 'complaints:update_status', 'complaints:attach_document', 'complaints:otp_request', 'complaints:otp_verify', 'complaints:export'] },
  { key: 'sales_network', label: 'شبکه فروش', permissions: ['sales_network:partners:manage', 'sales_network:partners:view', 'sales_network:contracts:manage', 'sales_network:contracts:view', 'sales_network:ledger:view', 'sales_network:ledger:manage', 'sales_network:kpi:view'] },
  { key: 'documents', label: 'اسناد', permissions: ['documents:list', 'documents:view', 'documents:upload'] },
  { key: 'work_items', label: 'آیتم‌های کاری', permissions: ['work_items:list', 'work_items:view', 'work_items:assign', 'work_items:complete'] },
  { key: 'party', label: 'اشخاص', permissions: ['party:list', 'party:view', 'party:create', 'kyc:review'] },
  { key: 'reporting', label: 'گزارش', permissions: ['reporting:view'] },
  { key: 'monitoring', label: 'مانیتورینگ', permissions: ['monitoring:metrics:view', 'monitoring:slos:list', 'monitoring:slos:create', 'monitoring:alerts:list', 'monitoring:alerts:ack', 'monitoring:dashboard:view'] },
  { key: 'document_ai', label: 'هوش مصنوعی اسناد', permissions: ['document_ai:jobs:list', 'document_ai:jobs:view', 'document_ai:jobs:retry', 'document_ai:jobs:dlq', 'document_ai:audit:list', 'document_ai:usage:view', 'document_ai:eval:cases:list', 'document_ai:eval:cases:manage', 'document_ai:eval:runs:list', 'document_ai:eval:runs:start', 'document_ai:eval:runs:view'] },
  { key: 'admin', label: 'مدیریت', permissions: ['admin:users:list', 'admin:users:view', 'admin:users:create', 'admin:users:update', 'admin:users:deactivate', 'admin:roles:view', 'admin:roles:create', 'admin:roles:update'] },
  { key: 'dlq', label: 'DLQ', permissions: ['dlq:stats', 'dlq:list', 'dlq:resolve'] },
  { key: 'rm', label: 'Read Models', permissions: ['rm:claims:view', 'rm:claims:summary', 'rm:fraud:view', 'rm:complaints:view'] },
  { key: 'settings', label: 'تنظیمات', permissions: ['settings:manage'] },
];

export default function RBACMatrixPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['claims', 'payments', 'admin']));
  const [selectedRoles, setSelectedRoles] = useState<string[]>(ALL_ROLES);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'admin:roles:view')) { router.push('/forbidden'); return; }
  }, [router]);

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const roleHasPermission = (role: string, permission: string): boolean => {
    const perms = enterprisePermissionsForRoles([role]);
    return perms.includes(permission as any);
  };

  const filteredCategories = PERMISSION_CATEGORIES.filter(cat => {
    if (!search) return true;
    const s = search.toLowerCase();
    return cat.label.includes(s) || cat.permissions.some(p => p.includes(s));
  });

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      {/* Header */}
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary">
              <Shield className="h-5 w-5 text-text-on-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">ماتریس دسترسی (RBAC)</h1>
              <p className="text-xs text-text-muted">نقش‌ها و مجوزهای دسترسی</p>
            </div>
          </div>
          <button onClick={() => router.push('/admin/users')} className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-muted hover:bg-bg-base">
            بازگشت
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-6 space-y-4">
        {/* Role Filter */}
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium text-text-secondary">نقش‌ها:</p>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map(role => (
              <button
                key={role}
                onClick={() => toggleRole(role)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  selectedRoles.includes(role)
                    ? 'border-brand-primary bg-brand-primary-subtle text-brand-primary'
                    : 'border-border-default text-text-muted hover:bg-bg-base'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجوی مجوز یا دسته..."
            className="w-full rounded-lg border border-border-default pr-9 pl-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </div>

        {/* Matrix */}
        <div className="space-y-3">
          {filteredCategories.map(cat => {
            const isExpanded = expandedCategories.has(cat.key);
            const permCount = cat.permissions.length;
            const roleCount = selectedRoles.length;
            const totalCells = permCount * roleCount;
            const grantedCells = cat.permissions.reduce((sum, p) =>
              sum + selectedRoles.filter(r => roleHasPermission(r, p)).length, 0
            );

            return (
              <Card key={cat.key} className="overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="flex w-full items-center justify-between p-4 hover:bg-bg-base"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                    <span className="text-sm font-semibold text-text-primary">{cat.label}</span>
                    <span className="rounded-full bg-bg-base px-2 py-0.5 text-[10px] text-text-muted">{permCount} مجوز</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">{grantedCells}/{totalCells} دسترسی فعال</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-base">
                      <div
                        className="h-full rounded-full bg-brand-primary"
                        style={{ width: `${totalCells > 0 ? (grantedCells / totalCells) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Matrix Table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-border-default">
                    <table className="min-w-full">
                      <thead className="bg-bg-base">
                        <tr>
                          <th className="sticky right-0 bg-bg-base px-4 py-2 text-right text-xs font-medium text-text-muted border-l border-border-default">
                            مجوز
                          </th>
                          {selectedRoles.map(role => (
                            <th key={role} className="px-3 py-2 text-center text-[10px] font-medium text-text-muted whitespace-nowrap" style={{ minWidth: '80px' }}>
                              {role.length > 12 ? role.slice(0, 10) + '…' : role}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {cat.permissions.map(perm => (
                          <tr key={perm} className="hover:bg-bg-base/50">
                            <td className="sticky right-0 bg-bg-raised px-4 py-2 text-xs font-mono text-text-secondary border-l border-border-default">
                              {perm}
                            </td>
                            {selectedRoles.map(role => {
                              const has = roleHasPermission(role, perm);
                              return (
                                <td key={role} className="px-3 py-2 text-center">
                                  {has ? (
                                    <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-feedback-success-subtle">
                                      <Check className="h-3 w-3 text-feedback-success" />
                                    </div>
                                  ) : (
                                    <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-base">
                                      <X className="h-3 w-3 text-text-muted" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">خلاصه دسترسی‌ها</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
            {selectedRoles.slice(0, 8).map(role => {
              const allPerms = enterprisePermissionsForRoles([role]);
              return (
                <div key={role} className="rounded-lg border border-border-default p-3">
                  <p className="text-xs font-medium text-text-secondary">{role}</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">{allPerms.length}</p>
                  <p className="text-[10px] text-text-muted">مجوز فعال</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
