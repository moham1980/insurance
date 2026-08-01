'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, RefreshCw, Search, UserPlus, Building2, User } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_PARTIES } from '@/lib/mock-data';

type PartyRow = {
  partyId: string;
  type: 'natural' | 'legal';
  fullName: string;
  nationalId: string;
  mobile: string | null;
  status: string;
  createdAt: string;
};

export default function PartyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PartyRow[]>([]);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'party:list');
  const canCreate = hasEnterprisePermission(perms, 'party:create');

  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState<'natural' | 'legal'>('natural');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mobile, setMobile] = useState('');

  const [filterNationalId, setFilterNationalId] = useState('');

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterNationalId) qs.set('nationalId', filterNationalId);

    try {
      const res = await apiFetch<PartyRow[]>(`/party${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (res.success) setRows(res.data);
      else setRows(MOCK_PARTIES.map(p => ({ ...p, partyId: p.partyId, type: p.partyType === 'individual' ? 'natural' : 'legal', fullName: `${p.firstName} ${p.lastName}`, nationalId: p.nationalId, mobile: p.phone, status: p.status, createdAt: p.createdAt })) as PartyRow[]);
    } catch {
      setRows(MOCK_PARTIES.map(p => ({ ...p, partyId: p.partyId, type: p.partyType === 'individual' ? 'natural' : 'legal', fullName: `${p.firstName} ${p.lastName}`, nationalId: p.nationalId, mobile: p.phone, status: p.status, createdAt: p.createdAt })) as PartyRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    setCreating(true);
    await apiFetch('/party', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: createType,
        fullName,
        nationalId,
        mobile: mobile || undefined,
      }),
    });
    setCreating(false);
    setFullName('');
    setNationalId('');
    setMobile('');
    await load();
  }

  const stats = {
    total: rows.length,
    natural: rows.filter(r => r.type === 'natural').length,
    legal: rows.filter(r => r.type === 'legal').length,
    verified: rows.filter(r => r.status === 'verified' || r.status === 'active').length,
  };

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string }> = {
      verified: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success' },
      active: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success' },
      pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning' },
      rejected: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error' },
    };
    const c = cfg[s] || { bg: 'bg-bg-base', text: 'text-text-secondary' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{s}</span>;
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">اشخاص / KYC</h1>
          <p className="mt-1 text-sm text-text-muted">ثبت و جستجوی اشخاص حقیقی/حقوقی و وضعیت KYC</p>
        </div>

        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> بروزرسانی
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل اشخاص" value={stats.total} icon={Users} changeType="neutral" />
        <StatCard title="حقیقی" value={stats.natural} icon={User} changeType="neutral" />
        <StatCard title="حقوقی" value={stats.legal} icon={Building2} changeType="neutral" />
        <StatCard title="تأیید شده" value={stats.verified} icon={UserPlus} changeType="positive" />
      </div>

      {/* Create Form */}
      <Card className="mt-6 p-4" elevation={2}>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-text-muted">نوع</span>
            <select className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={createType} onChange={(e) => setCreateType(e.target.value as any)}>
              <option value="natural">حقیقی</option>
              <option value="legal">حقوقی</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-text-muted">نام/عنوان</span>
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs text-text-muted">کدملی/شناسه</span>
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-xs text-text-muted">موبایل (اختیاری)</span>
            <input className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </label>

          <div className="flex items-end md:col-span-2">
            <Button variant="primary" size="md" onClick={create} disabled={!canCreate || creating || !fullName || !nationalId} isLoading={creating} fullWidth>
              ثبت شخص
            </Button>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <Card className="mt-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="grid flex-1 gap-1 text-sm">
            <span className="text-xs text-text-muted">فیلتر: کدملی/شناسه</span>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input className="w-full rounded-lg border border-border-default pr-10 pl-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent" value={filterNationalId} onChange={(e) => setFilterNationalId(e.target.value)} />
            </div>
          </label>
          <Button variant="ghost" size="md" onClick={load} disabled={loading}>
            اعمال فیلتر
          </Button>
        </div>
      </Card>

      <div className="mt-6 space-y-3">
        {rows.map((p) => (
          <Card key={p.partyId} className="p-4 hover:bg-bg-base transition-colors">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${p.type === 'natural' ? 'bg-brand-primary-subtle text-brand-primary' : 'bg-brand-secondary-subtle text-brand-secondary'}`}>
                  {p.type === 'natural' ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{p.fullName}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                    <span>{p.type === 'natural' ? 'حقیقی' : 'حقوقی'}</span>
                    <span dir="ltr">{p.nationalId}</span>
                    {p.mobile && <span dir="ltr">{p.mobile}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(p.status)}
              </div>
            </div>
          </Card>
        ))}

        {!loading && rows.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-text-muted opacity-50" />
            <p className="mt-3 text-sm text-text-muted">موردی یافت نشد.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
