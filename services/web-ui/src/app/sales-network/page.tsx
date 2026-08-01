'use client';

import { useEffect, useMemo, useState } from 'react';
import { Network, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, FileText, Plus, BadgeCheck, Ban, PlayCircle, Users, BarChart3, BookOpen } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_SALES_NETWORK_PARTNERS } from '@/lib/mock-data';

type PartnerRow = {
  partnerId: string;
  orgUnitId: string;
  kind: string;
  status: string;
  displayName: string;
  legalNationalId?: string | null;
  licenseCode?: string | null;
  contactMobile?: string | null;
  contactEmail?: string | null;
  bankIban?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContractRow = {
  contractId: string;
  orgUnitId: string;
  status: string;
  lineOfBusiness?: string | null;
  base: string;
  rateBps?: number | null;
  fixedFeeAmount?: string | null;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

type LedgerRow = {
  ledgerEntryId: string;
  eventId: string;
  eventType: string;
  occurredAt: string;
  orgUnitId: string;
  policyId: string;
  policyNumber?: string | null;
  lineOfBusiness?: string | null;
  premiumAmount?: string | null;
  commissionAmount: string;
  currency: string;
  contractId?: string | null;
  status: string;
  createdAt: string;
};

type KpiRow = {
  kpiId: string;
  orgUnitId: string;
  day: string;
  policiesIssuedCount: number;
  premiumIssuedAmount: string;
  commissionAccruedAmount: string;
  currency: string;
  updatedAt: string;
};

export default function SalesNetworkPage() {
  const roles = useMemo(() => getAuthUser()?.roles || [], []);
  const perms = useMemo(() => enterprisePermissionsForRoles(roles), [roles]);

  const canViewPartners = hasEnterprisePermission(perms, 'sales_network:partners:view');
  const canManagePartners = hasEnterprisePermission(perms, 'sales_network:partners:manage');
  const canViewContracts = hasEnterprisePermission(perms, 'sales_network:contracts:view');
  const canManageContracts = hasEnterprisePermission(perms, 'sales_network:contracts:manage');
  const canViewLedger = hasEnterprisePermission(perms, 'sales_network:ledger:view');
  const canManageLedger = hasEnterprisePermission(perms, 'sales_network:ledger:manage');
  const canViewKpi = hasEnterprisePermission(perms, 'sales_network:kpi:view');

  const [tab, setTab] = useState<'partners' | 'contracts' | 'ledger' | 'kpi'>('partners');

  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [partnersTotal, setPartnersTotal] = useState(0);
  const [partnersLimit, setPartnersLimit] = useState(50);
  const [partnersOffset, setPartnersOffset] = useState(0);
  const [partnerKind, setPartnerKind] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('');

  const [orgUnitId, setOrgUnitId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [kind, setKind] = useState<'agency' | 'brokerage'>('agency');

  const [contractsLoading, setContractsLoading] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [contractsTotal, setContractsTotal] = useState(0);
  const [contractsLimit, setContractsLimit] = useState(50);
  const [contractsOffset, setContractsOffset] = useState(0);
  const [contractsOrgUnitId, setContractsOrgUnitId] = useState('');
  const [contractsStatus, setContractsStatus] = useState('');

  const [cOrgUnitId, setCOrgUnitId] = useState('');
  const [cLineOfBusiness, setCLineOfBusiness] = useState('');
  const [cBase, setCBase] = useState<'premium_gross' | 'premium_net'>('premium_gross');
  const [cRateBps, setCRateBps] = useState('');
  const [cFixedFee, setCFixedFee] = useState('');
  const [cEffectiveFrom, setCEffectiveFrom] = useState('');
  const [cNotes, setCNotes] = useState('');

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLimit, setLedgerLimit] = useState(50);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerOrgUnitId, setLedgerOrgUnitId] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState('');
  const [voidReasonByLedgerId, setVoidReasonByLedgerId] = useState<Record<string, string>>({});

  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [kpiTotal, setKpiTotal] = useState(0);
  const [kpiLimit, setKpiLimit] = useState(50);
  const [kpiOffset, setKpiOffset] = useState(0);
  const [kpiOrgUnitId, setKpiOrgUnitId] = useState('');
  const [kpiDayFrom, setKpiDayFrom] = useState('');
  const [kpiDayTo, setKpiDayTo] = useState('');

  async function loadPartners() {
    if (!canViewPartners) return;
    setPartnersLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (partnerKind) qs.set('kind', partnerKind);
    if (partnerStatus) qs.set('status', partnerStatus);
    qs.set('limit', String(partnersLimit));
    qs.set('offset', String(partnersOffset));
    const res = await apiFetch<any>(`/sales-network/partners?${qs.toString()}`);
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    if (res.success) {
      setPartners(res.data);
      setPartnersTotal(res.pagination?.total || 0);
    } else {
      setPartners(MOCK_SALES_NETWORK_PARTNERS as unknown as PartnerRow[]);
      setPartnersTotal(MOCK_SALES_NETWORK_PARTNERS.length);
    }
    setPartnersLoading(false);
  }

  async function payLedger(ledgerEntryId: string) {
    if (!canManageLedger) return;
    setError(null);
    const res = await apiFetch<any>(`/sales-network/ledger/${encodeURIComponent(ledgerEntryId)}/pay`, { method: 'POST' });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadLedger();
  }

  async function voidLedger(ledgerEntryId: string) {
    if (!canManageLedger) return;
    const reason = String(voidReasonByLedgerId[ledgerEntryId] || '').trim();
    if (!reason) {
      setError({ message: 'reason اجباری است' });
      return;
    }
    setError(null);
    const res = await apiFetch<any>(`/sales-network/ledger/${encodeURIComponent(ledgerEntryId)}/void`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadLedger();
  }

  async function createOrUpdatePartner() {
    if (!canManagePartners) return;
    setError(null);
    const res = await apiFetch<any>('/sales-network/partners', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgUnitId, kind, displayName }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    if (res.success) {
      setOrgUnitId('');
      setDisplayName('');
      await loadPartners();
    }
  }

  async function verifyPartner(targetOrgUnitId: string) {
    if (!canManagePartners) return;
    setError(null);
    const res = await apiFetch<any>(`/sales-network/partners/${encodeURIComponent(targetOrgUnitId)}/verify`, { method: 'POST' });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadPartners();
  }

  async function setPartnerStatusAction(targetOrgUnitId: string, status: string) {
    if (!canManagePartners) return;
    setError(null);
    const res = await apiFetch<any>(`/sales-network/partners/${encodeURIComponent(targetOrgUnitId)}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadPartners();
  }

  async function loadContracts() {
    if (!canViewContracts) return;
    setContractsLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (contractsOrgUnitId) qs.set('orgUnitId', contractsOrgUnitId);
    if (contractsStatus) qs.set('status', contractsStatus);
    qs.set('limit', String(contractsLimit));
    qs.set('offset', String(contractsOffset));
    const res = await apiFetch<any>(`/sales-network/contracts?${qs.toString()}`);
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    if (res.success) {
      setContracts(res.data);
      setContractsTotal(res.pagination?.total || 0);
    }
    setContractsLoading(false);
  }

  async function createContract() {
    if (!canManageContracts) return;
    setError(null);
    const rateBps = cRateBps.trim().length > 0 ? Number(cRateBps) : null;
    const fixedFeeAmount = cFixedFee.trim().length > 0 ? cFixedFee.trim() : null;

    const res = await apiFetch<any>('/sales-network/contracts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orgUnitId: cOrgUnitId,
        lineOfBusiness: cLineOfBusiness || null,
        base: cBase,
        rateBps,
        fixedFeeAmount,
        effectiveFrom: cEffectiveFrom,
        notes: cNotes || null,
      }),
    });

    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    if (res.success) {
      setCOrgUnitId('');
      setCLineOfBusiness('');
      setCRateBps('');
      setCFixedFee('');
      setCEffectiveFrom('');
      setCNotes('');
      await loadContracts();
    }
  }

  async function activateContract(contractId: string) {
    if (!canManageContracts) return;
    setError(null);
    const res = await apiFetch<any>(`/sales-network/contracts/${encodeURIComponent(contractId)}/activate`, { method: 'POST' });
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    await loadContracts();
  }

  async function loadLedger() {
    if (!canViewLedger) return;
    setLedgerLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (ledgerOrgUnitId) qs.set('orgUnitId', ledgerOrgUnitId);
    if (ledgerStatus) qs.set('status', ledgerStatus);
    qs.set('limit', String(ledgerLimit));
    qs.set('offset', String(ledgerOffset));
    const res = await apiFetch<any>(`/sales-network/ledger?${qs.toString()}`);
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    if (res.success) {
      setLedger(res.data);
      setLedgerTotal(res.pagination?.total || 0);
    }
    setLedgerLoading(false);
  }

  async function loadKpi() {
    if (!canViewKpi) return;
    setKpiLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (kpiOrgUnitId) qs.set('orgUnitId', kpiOrgUnitId);
    if (kpiDayFrom) qs.set('dayFrom', kpiDayFrom);
    if (kpiDayTo) qs.set('dayTo', kpiDayTo);
    qs.set('limit', String(kpiLimit));
    qs.set('offset', String(kpiOffset));
    const res = await apiFetch<any>(`/sales-network/kpi/daily?${qs.toString()}`);
    if (!res.success) setError({ message: res.error.message, correlationId: res.correlationId });
    if (res.success) {
      setKpis(res.data);
      setKpiTotal(res.pagination?.total || 0);
    }
    setKpiLoading(false);
  }

  useEffect(() => {
    if (tab === 'partners') loadPartners();
    if (tab === 'contracts') loadContracts();
    if (tab === 'ledger') loadLedger();
    if (tab === 'kpi') loadKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, partnersLimit, partnersOffset, partnerKind, partnerStatus, contractsLimit, contractsOffset, contractsOrgUnitId, contractsStatus, ledgerLimit, ledgerOffset, ledgerOrgUnitId, ledgerStatus, kpiLimit, kpiOffset, kpiOrgUnitId, kpiDayFrom, kpiDayTo]);

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      verified: { bg: 'bg-feedback-info-subtle', text: 'text-feedback-info', icon: BadgeCheck },
      active: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      suspended: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: Ban },
      terminated: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
      draft: { bg: 'bg-bg-base', text: 'text-text-secondary', icon: FileText },
      paid: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      void: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
      accrued: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
    };
    const c = cfg[s] || { bg: 'bg-bg-base', text: 'text-text-secondary', icon: AlertCircle };
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {s}
      </span>
    );
  };

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">شبکه فروش (نمایندگی/کارگزاری)</h1>
            <p className="mt-1 text-sm text-text-muted">مدیریت lifecycle، قرارداد کمیسیون، دفتر کل کارمزد و KPI</p>
          </div>
        </div>
      </div>

      {!canViewPartners ? (
        <Card className="mt-6 p-4 text-sm text-text-secondary text-center">دسترسی ندارید.</Card>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-3 text-sm text-feedback-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error.message}
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant={tab === 'partners' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('partners')}>
          <Users className="h-4 w-4 ml-1" />
          نمایندگی‌ها
        </Button>
        <Button variant={tab === 'contracts' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('contracts')} disabled={!canViewContracts}>
          <FileText className="h-4 w-4 ml-1" />
          قراردادها
        </Button>
        <Button variant={tab === 'ledger' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('ledger')} disabled={!canViewLedger}>
          <BookOpen className="h-4 w-4 ml-1" />
          دفتر کل
        </Button>
        <Button variant={tab === 'kpi' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('kpi')} disabled={!canViewKpi}>
          <BarChart3 className="h-4 w-4 ml-1" />
          شاخص‌های روزانه
        </Button>
      </div>

      {tab === 'partners' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-semibold">فیلتر</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">نوع</span>
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={partnerKind} onChange={(e) => setPartnerKind(e.target.value)}>
                  <option value="">همه</option>
                  <option value="agency">نمایندگی</option>
                  <option value="brokerage">کارگزاری</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">وضعیت</span>
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={partnerStatus} onChange={(e) => setPartnerStatus(e.target.value)}>
                  <option value="">همه</option>
                  <option value="pending">در انتظار</option>
                  <option value="verified">تأییدشده</option>
                  <option value="active">فعال</option>
                  <option value="suspended">معلق</option>
                  <option value="terminated">خاتمه‌یافته</option>
                </select>
              </label>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold">ایجاد/ویرایش Partner</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">orgUnitId</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} disabled={!canManagePartners} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">نام</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!canManagePartners} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">نوع</span>
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={kind} onChange={(e) => setKind(e.target.value as any)} disabled={!canManagePartners}>
                  <option value="agency">نمایندگی</option>
                  <option value="brokerage">کارگزاری</option>
                </select>
              </label>
              <Button
                disabled={!canManagePartners || !orgUnitId || !displayName}
                onClick={createOrUpdatePartner}
              >
                <Plus className="h-4 w-4 ml-1" />
                ثبت
              </Button>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">لیست Partners</div>
              <div className="text-xs text-text-muted">total: {partnersTotal}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" disabled={partnersOffset === 0} onClick={() => setPartnersOffset(Math.max(0, partnersOffset - partnersLimit))}>
                قبلی
              </Button>
              <Button variant="ghost" size="sm" disabled={partnersOffset + partnersLimit >= partnersTotal} onClick={() => setPartnersOffset(partnersOffset + partnersLimit)}>
                بعدی
              </Button>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" value={partnersLimit} onChange={(e) => { setPartnersLimit(parseInt(e.target.value, 10)); setPartnersOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="mt-3 space-y-2">
              {partners.map((p) => (
                <div key={p.partnerId} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{p.displayName}</div>
                        {statusBadge(p.status)}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">{p.kind} | orgUnitId: {p.orgUnitId}</div>
                      {p.licenseCode ? <div className="mt-1 text-xs text-text-muted">license: {p.licenseCode}</div> : null}
                      {p.verifiedAt ? <div className="mt-1 text-xs text-text-muted">verifiedAt: {p.verifiedAt}</div> : null}
                    </div>
                    {canManagePartners ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => verifyPartner(p.orgUnitId)}>
                          <BadgeCheck className="h-4 w-4 ml-1" />
                          تأیید
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setPartnerStatusAction(p.orgUnitId, 'active')}>
                          <CheckCircle className="h-4 w-4 ml-1" />
                          فعال
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setPartnerStatusAction(p.orgUnitId, 'suspended')}>
                          <Ban className="h-4 w-4 ml-1" />
                          تعلیق
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setPartnerStatusAction(p.orgUnitId, 'terminated')}>
                          <XCircle className="h-4 w-4 ml-1" />
                          خاتمه
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {!partnersLoading && partners.length === 0 ? <div className="text-sm text-text-muted text-center py-4">موردی وجود ندارد.</div> : null}
            </div>
          </Card>
        </section>
      ) : null}

      {tab === 'contracts' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-semibold">فیلتر</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">orgUnitId</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={contractsOrgUnitId} onChange={(e) => setContractsOrgUnitId(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">status</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={contractsStatus} onChange={(e) => setContractsStatus(e.target.value)} />
              </label>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold">ایجاد Contract</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">orgUnitId</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cOrgUnitId} onChange={(e) => setCOrgUnitId(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">lineOfBusiness (optional)</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cLineOfBusiness} onChange={(e) => setCLineOfBusiness(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">base</span>
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cBase} onChange={(e) => setCBase(e.target.value as any)} disabled={!canManageContracts}>
                  <option value="premium_gross">premium_gross</option>
                  <option value="premium_net">premium_net</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">rateBps</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cRateBps} onChange={(e) => setCRateBps(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">fixedFeeAmount</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cFixedFee} onChange={(e) => setCFixedFee(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">effectiveFrom (ISO)</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cEffectiveFrom} onChange={(e) => setCEffectiveFrom(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-text-muted">notes</span>
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={cNotes} onChange={(e) => setCNotes(e.target.value)} disabled={!canManageContracts} />
              </label>
              <Button
                disabled={!canManageContracts || !cOrgUnitId || !cEffectiveFrom}
                onClick={createContract}
              >
                <Plus className="h-4 w-4 ml-1" />
                ایجاد
              </Button>
            </div>
          </Card>

          <Card className="p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">لیست Contracts</div>
              <div className="text-xs text-text-muted">total: {contractsTotal}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" disabled={contractsOffset === 0} onClick={() => setContractsOffset(Math.max(0, contractsOffset - contractsLimit))}>
                قبلی
              </Button>
              <Button variant="ghost" size="sm" disabled={contractsOffset + contractsLimit >= contractsTotal} onClick={() => setContractsOffset(contractsOffset + contractsLimit)}>
                بعدی
              </Button>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" value={contractsLimit} onChange={(e) => { setContractsLimit(parseInt(e.target.value, 10)); setContractsOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="mt-3 space-y-2">
              {contracts.map((c) => (
                <div key={c.contractId} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{c.orgUnitId}</div>
                        {statusBadge(c.status)}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">base={c.base} | rateBps={c.rateBps ?? '—'} | fixed={c.fixedFeeAmount ?? '—'}</div>
                      <div className="mt-1 text-xs text-text-muted">effectiveFrom: {c.effectiveFrom}</div>
                    </div>
                    {canManageContracts ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => activateContract(c.contractId)}>
                          <PlayCircle className="h-4 w-4 ml-1" />
                          فعال‌سازی
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {!contractsLoading && contracts.length === 0 ? <div className="text-sm text-text-muted text-center py-4">موردی وجود ندارد.</div> : null}
            </div>
          </Card>
        </section>
      ) : null}

      {tab === 'ledger' ? (
        <section className="mt-6">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">orgUnitId</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ledgerOrgUnitId} onChange={(e) => setLedgerOrgUnitId(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">status</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ledgerStatus} onChange={(e) => setLedgerStatus(e.target.value)} />
                </label>
              </div>
              <div className="text-xs text-text-muted">total: {ledgerTotal}</div>
            </div>

            <div className="mt-3 space-y-2">
              {ledger.map((l) => (
                <div key={l.ledgerEntryId} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-text-muted">{l.occurredAt} | {l.eventType}</div>
                    {statusBadge(l.status)}
                  </div>
                  <div className="mt-1 text-sm">commission: {l.commissionAmount} {l.currency}</div>
                  <div className="mt-1 text-xs text-text-muted">orgUnitId: {l.orgUnitId}</div>
                  <div className="mt-1 text-xs text-text-muted">policy: {l.policyNumber || l.policyId}</div>
                  {l.premiumAmount ? <div className="mt-1 text-xs text-text-muted">premium: {l.premiumAmount}</div> : null}

                  {canManageLedger ? (
                    <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                      <Button variant="secondary" size="sm" onClick={() => payLedger(l.ledgerEntryId)}>
                        <CheckCircle className="h-4 w-4 ml-1" />
                        ثبت پرداخت
                      </Button>
                      <input
                        className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary"
                        placeholder="reason برای void"
                        value={voidReasonByLedgerId[l.ledgerEntryId] || ''}
                        onChange={(e) => setVoidReasonByLedgerId((m) => ({ ...m, [l.ledgerEntryId]: e.target.value }))}
                      />
                      <Button variant="danger" size="sm" onClick={() => voidLedger(l.ledgerEntryId)}>
                        <XCircle className="h-4 w-4 ml-1" />
                        باطل
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!ledgerLoading && ledger.length === 0 ? <div className="text-sm text-text-muted text-center py-4">موردی وجود ندارد.</div> : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" disabled={ledgerOffset === 0} onClick={() => setLedgerOffset(Math.max(0, ledgerOffset - ledgerLimit))}>
                قبلی
              </Button>
              <Button variant="ghost" size="sm" disabled={ledgerOffset + ledgerLimit >= ledgerTotal} onClick={() => setLedgerOffset(ledgerOffset + ledgerLimit)}>
                بعدی
              </Button>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" value={ledgerLimit} onChange={(e) => { setLedgerLimit(parseInt(e.target.value, 10)); setLedgerOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </Card>
        </section>
      ) : null}

      {tab === 'kpi' ? (
        <section className="mt-6">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-2 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">orgUnitId</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={kpiOrgUnitId} onChange={(e) => setKpiOrgUnitId(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">dayFrom (YYYY-MM-DD)</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={kpiDayFrom} onChange={(e) => setKpiDayFrom(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-text-muted">dayTo (YYYY-MM-DD)</span>
                  <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={kpiDayTo} onChange={(e) => setKpiDayTo(e.target.value)} />
                </label>
              </div>
              <div className="text-xs text-text-muted">total: {kpiTotal}</div>
            </div>

            <div className="mt-3 space-y-2">
              {kpis.map((k) => (
                <div key={k.kpiId} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
                  <div className="text-sm font-semibold">{k.day}</div>
                  <div className="mt-1 text-xs text-text-muted">orgUnitId: {k.orgUnitId}</div>
                  <div className="mt-1 text-xs text-text-muted">policiesIssued: {k.policiesIssuedCount}</div>
                  <div className="mt-1 text-xs text-text-muted">premiumIssued: {k.premiumIssuedAmount} {k.currency}</div>
                  <div className="mt-1 text-xs text-text-muted">commissionAccrued: {k.commissionAccruedAmount} {k.currency}</div>
                </div>
              ))}
              {!kpiLoading && kpis.length === 0 ? <div className="text-sm text-text-muted text-center py-4">موردی وجود ندارد.</div> : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" disabled={kpiOffset === 0} onClick={() => setKpiOffset(Math.max(0, kpiOffset - kpiLimit))}>
                قبلی
              </Button>
              <Button variant="ghost" size="sm" disabled={kpiOffset + kpiLimit >= kpiTotal} onClick={() => setKpiOffset(kpiOffset + kpiLimit)}>
                بعدی
              </Button>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" value={kpiLimit} onChange={(e) => { setKpiLimit(parseInt(e.target.value, 10)); setKpiOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
