'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

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

  return (
    <main className="p-6">
      <div>
        <h1 className="text-xl font-semibold">شبکه فروش (نمایندگی/کارگزاری)</h1>
        <p className="mt-1 text-sm text-neutral-600">مدیریت lifecycle، قرارداد کمیسیون، دفتر کل کارمزد و KPI</p>
      </div>

      {!canViewPartners ? (
        <div className="mt-6 rounded-2xl border p-4 text-sm text-neutral-700">دسترسی ندارید.</div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error.message}
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button className={`rounded-xl border px-3 py-2 text-sm ${tab === 'partners' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`} onClick={() => setTab('partners')}>
          Partners
        </button>
        <button className={`rounded-xl border px-3 py-2 text-sm ${tab === 'contracts' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`} onClick={() => setTab('contracts')} disabled={!canViewContracts}>
          Contracts
        </button>
        <button className={`rounded-xl border px-3 py-2 text-sm ${tab === 'ledger' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`} onClick={() => setTab('ledger')} disabled={!canViewLedger}>
          Ledger
        </button>
        <button className={`rounded-xl border px-3 py-2 text-sm ${tab === 'kpi' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`} onClick={() => setTab('kpi')} disabled={!canViewKpi}>
          KPI Daily
        </button>
      </div>

      {tab === 'partners' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">فیلتر</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">نوع</span>
                <select className="rounded-xl border px-3 py-2" value={partnerKind} onChange={(e) => setPartnerKind(e.target.value)}>
                  <option value="">همه</option>
                  <option value="agency">نمایندگی</option>
                  <option value="brokerage">کارگزاری</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">وضعیت</span>
                <select className="rounded-xl border px-3 py-2" value={partnerStatus} onChange={(e) => setPartnerStatus(e.target.value)}>
                  <option value="">همه</option>
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="terminated">terminated</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">ایجاد/ویرایش Partner</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">orgUnitId</span>
                <input className="rounded-xl border px-3 py-2" value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)} disabled={!canManagePartners} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">نام</span>
                <input className="rounded-xl border px-3 py-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!canManagePartners} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">نوع</span>
                <select className="rounded-xl border px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as any)} disabled={!canManagePartners}>
                  <option value="agency">نمایندگی</option>
                  <option value="brokerage">کارگزاری</option>
                </select>
              </label>
              <button
                type="button"
                className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!canManagePartners || !orgUnitId || !displayName}
                onClick={createOrUpdatePartner}
              >
                ثبت
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">لیست Partners</div>
              <div className="text-xs text-neutral-600">total: {partnersTotal}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={partnersOffset === 0} onClick={() => setPartnersOffset(Math.max(0, partnersOffset - partnersLimit))}>
                قبلی
              </button>
              <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={partnersOffset + partnersLimit >= partnersTotal} onClick={() => setPartnersOffset(partnersOffset + partnersLimit)}>
                بعدی
              </button>
              <select className="rounded-xl border px-3 py-2 text-sm" value={partnersLimit} onChange={(e) => { setPartnersLimit(parseInt(e.target.value, 10)); setPartnersOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="mt-3 space-y-2">
              {partners.map((p) => (
                <div key={p.partnerId} className="rounded-xl border px-3 py-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{p.displayName}</div>
                      <div className="mt-1 text-xs text-neutral-600">{p.kind} | {p.status}</div>
                      <div className="mt-1 text-xs text-neutral-600">orgUnitId: {p.orgUnitId}</div>
                      {p.licenseCode ? <div className="mt-1 text-xs text-neutral-600">license: {p.licenseCode}</div> : null}
                      {p.verifiedAt ? <div className="mt-1 text-xs text-neutral-600">verifiedAt: {p.verifiedAt}</div> : null}
                    </div>
                    {canManagePartners ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => verifyPartner(p.orgUnitId)}>
                          Verify
                        </button>
                        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setPartnerStatusAction(p.orgUnitId, 'active')}>
                          Set Active
                        </button>
                        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setPartnerStatusAction(p.orgUnitId, 'suspended')}>
                          Suspend
                        </button>
                        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => setPartnerStatusAction(p.orgUnitId, 'terminated')}>
                          Terminate
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {!partnersLoading && partners.length === 0 ? <div className="text-sm text-neutral-600">موردی وجود ندارد.</div> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'contracts' ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">فیلتر</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">orgUnitId</span>
                <input className="rounded-xl border px-3 py-2" value={contractsOrgUnitId} onChange={(e) => setContractsOrgUnitId(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">status</span>
                <input className="rounded-xl border px-3 py-2" value={contractsStatus} onChange={(e) => setContractsStatus(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">ایجاد Contract</div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">orgUnitId</span>
                <input className="rounded-xl border px-3 py-2" value={cOrgUnitId} onChange={(e) => setCOrgUnitId(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">lineOfBusiness (optional)</span>
                <input className="rounded-xl border px-3 py-2" value={cLineOfBusiness} onChange={(e) => setCLineOfBusiness(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">base</span>
                <select className="rounded-xl border px-3 py-2" value={cBase} onChange={(e) => setCBase(e.target.value as any)} disabled={!canManageContracts}>
                  <option value="premium_gross">premium_gross</option>
                  <option value="premium_net">premium_net</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">rateBps</span>
                <input className="rounded-xl border px-3 py-2" value={cRateBps} onChange={(e) => setCRateBps(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">fixedFeeAmount</span>
                <input className="rounded-xl border px-3 py-2" value={cFixedFee} onChange={(e) => setCFixedFee(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">effectiveFrom (ISO)</span>
                <input className="rounded-xl border px-3 py-2" value={cEffectiveFrom} onChange={(e) => setCEffectiveFrom(e.target.value)} disabled={!canManageContracts} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">notes</span>
                <input className="rounded-xl border px-3 py-2" value={cNotes} onChange={(e) => setCNotes(e.target.value)} disabled={!canManageContracts} />
              </label>
              <button
                type="button"
                className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!canManageContracts || !cOrgUnitId || !cEffectiveFrom}
                onClick={createContract}
              >
                ایجاد
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">لیست Contracts</div>
              <div className="text-xs text-neutral-600">total: {contractsTotal}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={contractsOffset === 0} onClick={() => setContractsOffset(Math.max(0, contractsOffset - contractsLimit))}>
                قبلی
              </button>
              <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={contractsOffset + contractsLimit >= contractsTotal} onClick={() => setContractsOffset(contractsOffset + contractsLimit)}>
                بعدی
              </button>
              <select className="rounded-xl border px-3 py-2 text-sm" value={contractsLimit} onChange={(e) => { setContractsLimit(parseInt(e.target.value, 10)); setContractsOffset(0); }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="mt-3 space-y-2">
              {contracts.map((c) => (
                <div key={c.contractId} className="rounded-xl border px-3 py-2">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{c.orgUnitId}</div>
                      <div className="mt-1 text-xs text-neutral-600">{c.status} | base={c.base} | rateBps={c.rateBps ?? '—'} | fixed={c.fixedFeeAmount ?? '—'}</div>
                      <div className="mt-1 text-xs text-neutral-600">effectiveFrom: {c.effectiveFrom}</div>
                    </div>
                    {canManageContracts ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => activateContract(c.contractId)}>
                          Activate
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {!contractsLoading && contracts.length === 0 ? <div className="text-sm text-neutral-600">موردی وجود ندارد.</div> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'ledger' ? (
        <section className="mt-6 rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">orgUnitId</span>
                <input className="rounded-xl border px-3 py-2" value={ledgerOrgUnitId} onChange={(e) => setLedgerOrgUnitId(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">status</span>
                <input className="rounded-xl border px-3 py-2" value={ledgerStatus} onChange={(e) => setLedgerStatus(e.target.value)} />
              </label>
            </div>
            <div className="text-xs text-neutral-600">total: {ledgerTotal}</div>
          </div>

          <div className="mt-3 space-y-2">
            {ledger.map((l) => (
              <div key={l.ledgerEntryId} className="rounded-xl border px-3 py-2">
                <div className="text-xs text-neutral-600">{l.occurredAt} | {l.eventType} | {l.status}</div>
                <div className="mt-1 text-sm">commission: {l.commissionAmount} {l.currency}</div>
                <div className="mt-1 text-xs text-neutral-600">orgUnitId: {l.orgUnitId}</div>
                <div className="mt-1 text-xs text-neutral-600">policy: {l.policyNumber || l.policyId}</div>
                {l.premiumAmount ? <div className="mt-1 text-xs text-neutral-600">premium: {l.premiumAmount}</div> : null}

                {canManageLedger ? (
                  <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                    <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => payLedger(l.ledgerEntryId)}>
                      Mark Paid
                    </button>
                    <input
                      className="rounded-xl border px-3 py-2 text-sm"
                      placeholder="reason برای void"
                      value={voidReasonByLedgerId[l.ledgerEntryId] || ''}
                      onChange={(e) => setVoidReasonByLedgerId((m) => ({ ...m, [l.ledgerEntryId]: e.target.value }))}
                    />
                    <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={() => voidLedger(l.ledgerEntryId)}>
                      Void
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {!ledgerLoading && ledger.length === 0 ? <div className="text-sm text-neutral-600">موردی وجود ندارد.</div> : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={ledgerOffset === 0} onClick={() => setLedgerOffset(Math.max(0, ledgerOffset - ledgerLimit))}>
              قبلی
            </button>
            <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={ledgerOffset + ledgerLimit >= ledgerTotal} onClick={() => setLedgerOffset(ledgerOffset + ledgerLimit)}>
              بعدی
            </button>
            <select className="rounded-xl border px-3 py-2 text-sm" value={ledgerLimit} onChange={(e) => { setLedgerLimit(parseInt(e.target.value, 10)); setLedgerOffset(0); }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </section>
      ) : null}

      {tab === 'kpi' ? (
        <section className="mt-6 rounded-2xl border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-2 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">orgUnitId</span>
                <input className="rounded-xl border px-3 py-2" value={kpiOrgUnitId} onChange={(e) => setKpiOrgUnitId(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">dayFrom (YYYY-MM-DD)</span>
                <input className="rounded-xl border px-3 py-2" value={kpiDayFrom} onChange={(e) => setKpiDayFrom(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-neutral-600">dayTo (YYYY-MM-DD)</span>
                <input className="rounded-xl border px-3 py-2" value={kpiDayTo} onChange={(e) => setKpiDayTo(e.target.value)} />
              </label>
            </div>
            <div className="text-xs text-neutral-600">total: {kpiTotal}</div>
          </div>

          <div className="mt-3 space-y-2">
            {kpis.map((k) => (
              <div key={k.kpiId} className="rounded-xl border px-3 py-2">
                <div className="text-sm font-semibold">{k.day}</div>
                <div className="mt-1 text-xs text-neutral-600">orgUnitId: {k.orgUnitId}</div>
                <div className="mt-1 text-xs text-neutral-600">policiesIssued: {k.policiesIssuedCount}</div>
                <div className="mt-1 text-xs text-neutral-600">premiumIssued: {k.premiumIssuedAmount} {k.currency}</div>
                <div className="mt-1 text-xs text-neutral-600">commissionAccrued: {k.commissionAccruedAmount} {k.currency}</div>
              </div>
            ))}
            {!kpiLoading && kpis.length === 0 ? <div className="text-sm text-neutral-600">موردی وجود ندارد.</div> : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={kpiOffset === 0} onClick={() => setKpiOffset(Math.max(0, kpiOffset - kpiLimit))}>
              قبلی
            </button>
            <button className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50" disabled={kpiOffset + kpiLimit >= kpiTotal} onClick={() => setKpiOffset(kpiOffset + kpiLimit)}>
              بعدی
            </button>
            <select className="rounded-xl border px-3 py-2 text-sm" value={kpiLimit} onChange={(e) => { setKpiLimit(parseInt(e.target.value, 10)); setKpiOffset(0); }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </section>
      ) : null}
    </main>
  );
}
