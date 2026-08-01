'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, AlertCircle, TrendingUp, Clock, ShieldAlert, FileText, Plus, Save, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { reportingPermissionsForRoles } from '@/lib/rbac';
import { Button, Card, StatCard } from '@insurance/design-system';

type ReadyKpis = {
  issuanceSpeed: { totalIssued: number; avgMinutesQuoteToIssue: number | null };
  claimPayoutTime: { totalPaid: number; avgMinutesRegisterToPaid: number | null };
  fraudIdentifiedRate: { totalScores: number; holdCount: number; holdRate: number };
};

type ClaimPaymentRow = {
  claimId: string;
  claimNumber: string | null;
  policyId: string | null;
  registeredAt: string | null;
  paymentRequestedAt: string | null;
  approvedAmount: string | null;
  paymentExecutedAt: string | null;
  claimPaidAt: string | null;
  updatedAt: string;
};

type KpiSnapshotRow = {
  snapshotId: string;
  kpiKey: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  unit: string | null;
  sourceSystem: string | null;
  metadata: any;
  createdAt: string;
};

type RiCededRow = {
  riKey: string;
  contractId: string;
  policyId: string | null;
  claimId: string | null;
  calculationBasis: string;
  grossAmount: string | null;
  cededAmount: string | null;
  retainedAmount: string | null;
  currency: string | null;
  counterpartyId: string | null;
  updatedAt: string;
};

type ClaimDocumentsAttachedRow = {
  claimId: string;
  documentsCount: number;
  typesSummary: Record<string, number> | null;
  lastDocumentId: string | null;
  lastAttachedAt: string | null;
  updatedAt: string;
};

type FraudCaseEscalationRow = {
  eventId: string;
  occurredAt: string | null;
  correlationId: string | null;
  fraudCaseId: string;
  claimId: string;
  claimNumber: string | null;
  escalatedAt: string | null;
  toUnit: string;
  reasonCodes: string[] | null;
  requiresHumanApproval: boolean | null;
  notes: string | null;
  updatedAt: string;
};

type ComplaintSlaBreachRow = {
  eventId: string;
  occurredAt: string | null;
  correlationId: string | null;
  complaintId: string;
  complaintType: string | null;
  status: string | null;
  assignedTo: string | null;
  policyId: string | null;
  claimId: string | null;
  slaFirstResponseDueAt: string | null;
  slaResolutionDueAt: string | null;
  breachedAt: string | null;
  slaHours: number | null;
  elapsedHours: number | null;
  updatedAt: string;
};

type RiBorderauxRow = {
  borderauxId: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
  itemsCount: number;
  documentId: string | null;
  updatedAt: string;
};

type RiRecoveryRow = {
  recoveryId: string;
  claimId: string;
  contractId: string;
  counterpartyId: string | null;
  recoverableAmount: string | null;
  recoveredAmount: string | null;
  currency: string | null;
  identifiedAt: string | null;
  receivedAt: string | null;
  updatedAt: string;
};

type PermissionKey = 'reporting:view' | 'reporting:ingest' | 'reporting:projections:admin';

type KpiGovernancePolicy = {
  kpiKey: string;
  allowedPeriodGranularities: string[];
  allowedSourceSystems: string[];
  expectedUnit: string | null;
  minValue: number | null;
  maxValue: number | null;
  enforced: boolean;
};

function permissionsForRoles(roles: string[] | undefined | null): PermissionKey[] {
  return reportingPermissionsForRoles(roles) as PermissionKey[];
}

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return String(n);
}

function toIsoOrEmpty(s: string): string {
  const v = (s || '').trim();
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export default function ReportingPage() {
  const perms = useMemo(() => permissionsForRoles(getAuthUser()?.roles), []);
  const canView = perms.includes('reporting:view');
  const canIngest = perms.includes('reporting:ingest');
  const canAdmin = perms.includes('reporting:projections:admin');

  const [readyLoading, setReadyLoading] = useState(false);
  const [ready, setReady] = useState<ReadyKpis | null>(null);
  const [readyErr, setReadyErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);

  const [snapLoading, setSnapLoading] = useState(false);
  const [snapRows, setSnapRows] = useState<KpiSnapshotRow[]>([]);
  const [snapTotal, setSnapTotal] = useState(0);
  const [snapLimit, setSnapLimit] = useState(50);
  const [snapOffset, setSnapOffset] = useState(0);
  const [snapErr, setSnapErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);

  const [fKpiKey, setFKpiKey] = useState('');
  const [fPeriodStart, setFPeriodStart] = useState('');
  const [fPeriodEnd, setFPeriodEnd] = useState('');

  // Ingest form
  const [ingKpiKey, setIngKpiKey] = useState('customer_satisfaction_rate');
  const [ingValue, setIngValue] = useState('');
  const [ingUnit, setIngUnit] = useState('%');
  const [ingSource, setIngSource] = useState('bi');
  const [ingPeriodGranularity, setIngPeriodGranularity] = useState<string>('month');
  const [ingOfficialSourceSystem, setIngOfficialSourceSystem] = useState('bi');
  const [ingPeriodStart, setIngPeriodStart] = useState('');
  const [ingPeriodEnd, setIngPeriodEnd] = useState('');
  const [ingMetadataJson, setIngMetadataJson] = useState('{"note":"manual snapshot ingestion"}');
  const [ingIdempotencyKey, setIngIdempotencyKey] = useState(`ui-${Date.now()}`);
  const [ingBusy, setIngBusy] = useState(false);
  const [ingErr, setIngErr] = useState<{ code: string; message: string; correlationId?: string; details?: any } | null>(null);
  const [ingOk, setIngOk] = useState<{ correlationId?: string } | null>(null);

  const [govLoading, setGovLoading] = useState(false);
  const [govPolicies, setGovPolicies] = useState<KpiGovernancePolicy[]>([]);
  const [govErr, setGovErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);

  const [admSelectedKey, setAdmSelectedKey] = useState<string>('');
  const [admKpiKey, setAdmKpiKey] = useState<string>('');
  const [admAllowedGranularities, setAdmAllowedGranularities] = useState<string>('');
  const [admAllowedSources, setAdmAllowedSources] = useState<string>('');
  const [admExpectedUnit, setAdmExpectedUnit] = useState<string>('');
  const [admMinValue, setAdmMinValue] = useState<string>('');
  const [admMaxValue, setAdmMaxValue] = useState<string>('');
  const [admEnforced, setAdmEnforced] = useState<boolean>(true);
  const [admBusy, setAdmBusy] = useState(false);
  const [admErr, setAdmErr] = useState<{ code: string; message: string; correlationId?: string; details?: any } | null>(null);
  const [admOk, setAdmOk] = useState<{ correlationId?: string } | null>(null);

  const governedGapKpis = useMemo(() => new Set(['customer_satisfaction_rate', 'financial_solvency_ratio', 'market_share_percent']), []);

  // Reinsurance projections
  const [riBusy, setRiBusy] = useState(false);
  const [riErr, setRiErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);

  const [riCededRows, setRiCededRows] = useState<RiCededRow[]>([]);
  const [riCededTotal, setRiCededTotal] = useState(0);
  const [riCededLimit, setRiCededLimit] = useState(25);
  const [riCededOffset, setRiCededOffset] = useState(0);
  const [riCededContractId, setRiCededContractId] = useState('');
  const [riCededPolicyId, setRiCededPolicyId] = useState('');
  const [riCededClaimId, setRiCededClaimId] = useState('');

  const [riBorderauxRows, setRiBorderauxRows] = useState<RiBorderauxRow[]>([]);
  const [riBorderauxTotal, setRiBorderauxTotal] = useState(0);
  const [riBorderauxLimit, setRiBorderauxLimit] = useState(25);
  const [riBorderauxOffset, setRiBorderauxOffset] = useState(0);
  const [riBorderauxContractId, setRiBorderauxContractId] = useState('');

  const [riRecoveryRows, setRiRecoveryRows] = useState<RiRecoveryRow[]>([]);
  const [riRecoveryTotal, setRiRecoveryTotal] = useState(0);
  const [riRecoveryLimit, setRiRecoveryLimit] = useState(25);
  const [riRecoveryOffset, setRiRecoveryOffset] = useState(0);
  const [riRecoveryContractId, setRiRecoveryContractId] = useState('');
  const [riRecoveryClaimId, setRiRecoveryClaimId] = useState('');

  const [docsBusy, setDocsBusy] = useState(false);
  const [docsErr, setDocsErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);
  const [docsRows, setDocsRows] = useState<ClaimDocumentsAttachedRow[]>([]);
  const [docsTotal, setDocsTotal] = useState(0);
  const [docsLimit, setDocsLimit] = useState(25);
  const [docsOffset, setDocsOffset] = useState(0);
  const [docsClaimId, setDocsClaimId] = useState('');

  const [cpBusy, setCpBusy] = useState(false);
  const [cpErr, setCpErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);
  const [cpRows, setCpRows] = useState<ClaimPaymentRow[]>([]);
  const [cpTotal, setCpTotal] = useState(0);
  const [cpLimit, setCpLimit] = useState(25);
  const [cpOffset, setCpOffset] = useState(0);
  const [cpClaimId, setCpClaimId] = useState('');
  const [cpPolicyId, setCpPolicyId] = useState('');

  const [escBusy, setEscBusy] = useState(false);
  const [escErr, setEscErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);
  const [escRows, setEscRows] = useState<FraudCaseEscalationRow[]>([]);
  const [escTotal, setEscTotal] = useState(0);
  const [escLimit, setEscLimit] = useState(25);
  const [escOffset, setEscOffset] = useState(0);
  const [escClaimId, setEscClaimId] = useState('');
  const [escFraudCaseId, setEscFraudCaseId] = useState('');
  const [escToUnit, setEscToUnit] = useState('');

  const [slaBusy, setSlaBusy] = useState(false);
  const [slaErr, setSlaErr] = useState<{ code: string; message: string; correlationId?: string } | null>(null);
  const [slaRows, setSlaRows] = useState<ComplaintSlaBreachRow[]>([]);
  const [slaTotal, setSlaTotal] = useState(0);
  const [slaLimit, setSlaLimit] = useState(25);
  const [slaOffset, setSlaOffset] = useState(0);
  const [slaComplaintId, setSlaComplaintId] = useState('');
  const [slaClaimId, setSlaClaimId] = useState('');
  const [slaPolicyId, setSlaPolicyId] = useState('');
  const [slaStatus, setSlaStatus] = useState('');
  const [slaAssignedTo, setSlaAssignedTo] = useState('');

  async function loadDocsAttached() {
    if (!canView) return;
    setDocsBusy(true);
    setDocsErr(null);
    const qs = new URLSearchParams();
    if (docsClaimId.trim()) qs.set('claimId', docsClaimId.trim());
    qs.set('limit', String(docsLimit));
    qs.set('offset', String(docsOffset));

    const r = await apiFetch<ClaimDocumentsAttachedRow[]>(`/reporting/claims/documents-attached?${qs.toString()}`);
    if (!r.success) {
      setDocsErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
      setDocsRows([]);
      setDocsTotal(0);
      setDocsBusy(false);
      return;
    }

    setDocsRows(r.data || []);
    setDocsTotal(r.pagination?.total || 0);
    setDocsBusy(false);
  }

  async function loadClaimPayments() {
    if (!canView) return;
    setCpBusy(true);
    setCpErr(null);
    const qs = new URLSearchParams();
    if (cpClaimId.trim()) qs.set('claimId', cpClaimId.trim());
    if (cpPolicyId.trim()) qs.set('policyId', cpPolicyId.trim());
    qs.set('limit', String(cpLimit));
    qs.set('offset', String(cpOffset));

    const r = await apiFetch<ClaimPaymentRow[]>(`/reporting/claims/payments?${qs.toString()}`);
    if (!r.success) {
      setCpErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
      setCpRows([]);
      setCpTotal(0);
      setCpBusy(false);
      return;
    }
    setCpRows(r.data || []);
    setCpTotal(r.pagination?.total || 0);
    setCpBusy(false);
  }

  async function loadFraudEscalations() {
    if (!canView) return;
    setEscBusy(true);
    setEscErr(null);
    const qs = new URLSearchParams();
    if (escClaimId.trim()) qs.set('claimId', escClaimId.trim());
    if (escFraudCaseId.trim()) qs.set('fraudCaseId', escFraudCaseId.trim());
    if (escToUnit.trim()) qs.set('toUnit', escToUnit.trim());
    qs.set('limit', String(escLimit));
    qs.set('offset', String(escOffset));

    const r = await apiFetch<FraudCaseEscalationRow[]>(`/reporting/fraud/case-escalations?${qs.toString()}`);
    if (!r.success) {
      setEscErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
      setEscRows([]);
      setEscTotal(0);
      setEscBusy(false);
      return;
    }
    setEscRows(r.data || []);
    setEscTotal(r.pagination?.total || 0);
    setEscBusy(false);
  }

  async function loadSlaBreaches() {
    if (!canView) return;
    setSlaBusy(true);
    setSlaErr(null);
    const qs = new URLSearchParams();
    if (slaComplaintId.trim()) qs.set('complaintId', slaComplaintId.trim());
    if (slaClaimId.trim()) qs.set('claimId', slaClaimId.trim());
    if (slaPolicyId.trim()) qs.set('policyId', slaPolicyId.trim());
    if (slaStatus.trim()) qs.set('status', slaStatus.trim());
    if (slaAssignedTo.trim()) qs.set('assignedTo', slaAssignedTo.trim());
    qs.set('limit', String(slaLimit));
    qs.set('offset', String(slaOffset));

    const r = await apiFetch<ComplaintSlaBreachRow[]>(`/reporting/complaints/sla-breaches?${qs.toString()}`);
    if (!r.success) {
      setSlaErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
      setSlaRows([]);
      setSlaTotal(0);
      setSlaBusy(false);
      return;
    }
    setSlaRows(r.data || []);
    setSlaTotal(r.pagination?.total || 0);
    setSlaBusy(false);
  }

  async function loadRiAll() {
    if (!canView) return;
    setRiBusy(true);
    setRiErr(null);

    const qsC = new URLSearchParams();
    if (riCededContractId) qsC.set('contractId', riCededContractId);
    if (riCededPolicyId) qsC.set('policyId', riCededPolicyId);
    if (riCededClaimId) qsC.set('claimId', riCededClaimId);
    qsC.set('limit', String(riCededLimit));
    qsC.set('offset', String(riCededOffset));

    const qsB = new URLSearchParams();
    if (riBorderauxContractId) qsB.set('contractId', riBorderauxContractId);
    qsB.set('limit', String(riBorderauxLimit));
    qsB.set('offset', String(riBorderauxOffset));

    const qsR = new URLSearchParams();
    if (riRecoveryContractId) qsR.set('contractId', riRecoveryContractId);
    if (riRecoveryClaimId) qsR.set('claimId', riRecoveryClaimId);
    qsR.set('limit', String(riRecoveryLimit));
    qsR.set('offset', String(riRecoveryOffset));

    const r1 = await apiFetch<RiCededRow[]>(`/reporting/ri/ceded?${qsC.toString()}`);
    if (!r1.success) {
      setRiErr({ code: r1.error.code, message: r1.error.message, correlationId: r1.correlationId });
      setRiBusy(false);
      return;
    }
    setRiCededRows(r1.data || []);
    setRiCededTotal(r1.pagination?.total || 0);

    const r2 = await apiFetch<RiBorderauxRow[]>(`/reporting/ri/borderaux?${qsB.toString()}`);
    if (!r2.success) {
      setRiErr({ code: r2.error.code, message: r2.error.message, correlationId: r2.correlationId });
      setRiBusy(false);
      return;
    }
    setRiBorderauxRows(r2.data || []);
    setRiBorderauxTotal(r2.pagination?.total || 0);

    const r3 = await apiFetch<RiRecoveryRow[]>(`/reporting/ri/recoveries?${qsR.toString()}`);
    if (!r3.success) {
      setRiErr({ code: r3.error.code, message: r3.error.message, correlationId: r3.correlationId });
      setRiBusy(false);
      return;
    }
    setRiRecoveryRows(r3.data || []);
    setRiRecoveryTotal(r3.pagination?.total || 0);

    setRiBusy(false);
  }

  const policyByKey = useMemo(() => {
    const m = new Map<string, KpiGovernancePolicy>();
    for (const p of govPolicies) m.set(String(p.kpiKey), p);
    return m;
  }, [govPolicies]);

  const selectedPolicy = useMemo(() => {
    const k = String(ingKpiKey || '').trim();
    return k ? policyByKey.get(k) || null : null;
  }, [ingKpiKey, policyByKey]);

  const governanceSummary = useMemo(() => {
    if (!selectedPolicy) return null;
    const min = selectedPolicy.minValue == null ? null : selectedPolicy.minValue;
    const max = selectedPolicy.maxValue == null ? null : selectedPolicy.maxValue;
    const rangeText = min == null && max == null ? null : `${min == null ? '—' : String(min)} تا ${max == null ? '—' : String(max)}`;
    return {
      enforced: selectedPolicy.enforced,
      expectedUnit: selectedPolicy.expectedUnit,
      rangeText,
      allowedGranularities: selectedPolicy.allowedPeriodGranularities || [],
      allowedSourceSystems: selectedPolicy.allowedSourceSystems || [],
    };
  }, [selectedPolicy]);

  function chip(text: string) {
    return <span className="rounded-full border bg-bg-raised px-2 py-0.5 text-[11px] text-text-secondary">{text}</span>;
  }

  useEffect(() => {
    if (!selectedPolicy) return;
    if (selectedPolicy.allowedPeriodGranularities?.length && !selectedPolicy.allowedPeriodGranularities.includes(ingPeriodGranularity)) {
      setIngPeriodGranularity(selectedPolicy.allowedPeriodGranularities[0]);
    }
    if (selectedPolicy.allowedSourceSystems?.length) {
      if (!selectedPolicy.allowedSourceSystems.includes(ingSource)) setIngSource(selectedPolicy.allowedSourceSystems[0]);
      if (!selectedPolicy.allowedSourceSystems.includes(ingOfficialSourceSystem)) setIngOfficialSourceSystem(selectedPolicy.allowedSourceSystems[0]);
    }
    if (selectedPolicy.expectedUnit && ingUnit !== selectedPolicy.expectedUnit) setIngUnit(selectedPolicy.expectedUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolicy]);

  async function loadGovernancePolicies() {
    setGovLoading(true);
    setGovErr(null);
    const r = await apiFetch<KpiGovernancePolicy[]>('/reporting/kpis/governance');
    if (r.success) setGovPolicies(r.data || []);
    else {
      setGovPolicies([]);
      setGovErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
    }
    setGovLoading(false);
  }

  function splitCsv(v: string): string[] {
    return String(v || '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  function resetAdmForm() {
    setAdmSelectedKey('');
    setAdmKpiKey('');
    setAdmAllowedGranularities('');
    setAdmAllowedSources('');
    setAdmExpectedUnit('');
    setAdmMinValue('');
    setAdmMaxValue('');
    setAdmEnforced(true);
    setAdmErr(null);
    setAdmOk(null);
  }

  useEffect(() => {
    if (!canAdmin) return;
    const key = String(admSelectedKey || '').trim();
    if (!key) return;
    const p = policyByKey.get(key) || null;
    if (!p) return;

    setAdmKpiKey(p.kpiKey);
    setAdmAllowedGranularities((p.allowedPeriodGranularities || []).join(', '));
    setAdmAllowedSources((p.allowedSourceSystems || []).join(', '));
    setAdmExpectedUnit(p.expectedUnit || '');
    setAdmMinValue(p.minValue == null ? '' : String(p.minValue));
    setAdmMaxValue(p.maxValue == null ? '' : String(p.maxValue));
    setAdmEnforced(Boolean(p.enforced));
    setAdmErr(null);
    setAdmOk(null);
  }, [admSelectedKey, canAdmin, policyByKey]);

  async function saveGovernancePolicy() {
    setAdmBusy(true);
    setAdmErr(null);
    setAdmOk(null);

    const errors: string[] = [];
    const key = String(admKpiKey || '').trim();
    const granularities = splitCsv(admAllowedGranularities);
    const sources = splitCsv(admAllowedSources);

    if (!key) errors.push('kpiKey الزامی است');
    if (!granularities.length) errors.push('allowedPeriodGranularities الزامی است (comma-separated)');
    if (!sources.length) errors.push('allowedSourceSystems الزامی است (comma-separated)');

    const expectedUnit = String(admExpectedUnit || '').trim();
    const minV = String(admMinValue || '').trim();
    const maxV = String(admMaxValue || '').trim();
    const minValue = minV ? Number(minV) : null;
    const maxValue = maxV ? Number(maxV) : null;
    if (minV && !Number.isFinite(minValue as any)) errors.push('minValue باید عدد معتبر باشد');
    if (maxV && !Number.isFinite(maxValue as any)) errors.push('maxValue باید عدد معتبر باشد');
    if (typeof minValue === 'number' && typeof maxValue === 'number' && minValue > maxValue) errors.push('minValue باید <= maxValue باشد');

    if (errors.length) {
      setAdmErr({ code: 'VALIDATION_ERROR', message: 'خطاهای اعتبارسنجی', details: { errors } });
      setAdmBusy(false);
      return;
    }

    const r = await apiFetch<KpiGovernancePolicy>(`/reporting/kpis/governance/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' } as any,
      body: JSON.stringify({
        allowedPeriodGranularities: granularities,
        allowedSourceSystems: sources,
        expectedUnit: expectedUnit ? expectedUnit : null,
        minValue: minValue === null ? null : minValue,
        maxValue: maxValue === null ? null : maxValue,
        enforced: admEnforced,
      }),
    });

    if (!r.success) {
      setAdmErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId, details: (r.error as any)?.details });
      setAdmBusy(false);
      return;
    }

    setAdmOk({ correlationId: r.correlationId });
    await loadGovernancePolicies();
    setAdmSelectedKey(key);
    setAdmBusy(false);
  }

  async function loadReady() {
    setReadyLoading(true);
    setReadyErr(null);
    const r = await apiFetch<ReadyKpis>('/reporting/kpis/ready');
    if (r.success) setReady(r.data);
    else setReadyErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
    setReadyLoading(false);
  }

  async function loadSnapshots(params?: { resetOffset?: boolean }) {
    setSnapLoading(true);
    setSnapErr(null);

    const resetOffset = params?.resetOffset === true;
    const effectiveOffset = resetOffset ? 0 : snapOffset;

    const qs = new URLSearchParams();
    if (fKpiKey.trim()) qs.set('kpiKey', fKpiKey.trim());

    const ps = toIsoOrEmpty(fPeriodStart);
    const pe = toIsoOrEmpty(fPeriodEnd);
    if (ps) qs.set('periodStart', ps);
    if (pe) qs.set('periodEnd', pe);

    qs.set('limit', String(snapLimit));
    qs.set('offset', String(effectiveOffset));

    const r = await apiFetch<KpiSnapshotRow[]>(`/reporting/kpis/snapshots?${qs.toString()}`);
    if (r.success) {
      setSnapRows(r.data);
      setSnapTotal(r.pagination?.total || 0);
      if (resetOffset) setSnapOffset(0);
    } else {
      setSnapRows([]);
      setSnapTotal(0);
      setSnapErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId });
    }

    setSnapLoading(false);
  }

  async function submitIngest() {
    setIngBusy(true);
    setIngErr(null);
    setIngOk(null);

    const errors: string[] = [];
    if (!ingIdempotencyKey.trim() || ingIdempotencyKey.trim().length < 8) errors.push('Idempotency-Key باید حداقل ۸ کاراکتر باشد');
    if (!ingKpiKey.trim()) errors.push('kpiKey الزامی است');
    const v = Number(ingValue);
    if (!Number.isFinite(v)) errors.push('value باید عدد معتبر باشد');

    const kpiKeyTrim = ingKpiKey.trim();
    const isGovernedGap = governedGapKpis.has(kpiKeyTrim);
    const p = kpiKeyTrim ? policyByKey.get(kpiKeyTrim) || null : null;

    if (isGovernedGap && !p) {
      errors.push('برای این KPI قانون Governance تعریف نشده است و ingestion مجاز نیست');
    }

    if (isGovernedGap && p) {
      if (!ingPeriodGranularity) errors.push('periodGranularity برای این KPI الزامی است');
      if (!ingOfficialSourceSystem.trim()) errors.push('officialSourceSystem برای این KPI الزامی است');
    }

    if (p?.enforced) {
      if (ingPeriodGranularity && Array.isArray(p.allowedPeriodGranularities) && p.allowedPeriodGranularities.length > 0) {
        if (!p.allowedPeriodGranularities.includes(ingPeriodGranularity)) {
          errors.push(`periodGranularity باید یکی از این مقادیر باشد: ${p.allowedPeriodGranularities.join(', ')}`);
        }
      }

      const src = ingSource.trim();
      const off = ingOfficialSourceSystem.trim();
      if (src && Array.isArray(p.allowedSourceSystems) && p.allowedSourceSystems.length > 0 && !p.allowedSourceSystems.includes(src)) {
        errors.push(`sourceSystem مجاز نیست (allowed: ${p.allowedSourceSystems.join(', ')})`);
      }
      if (off && Array.isArray(p.allowedSourceSystems) && p.allowedSourceSystems.length > 0 && !p.allowedSourceSystems.includes(off)) {
        errors.push(`officialSourceSystem مجاز نیست (allowed: ${p.allowedSourceSystems.join(', ')})`);
      }

      if (p.expectedUnit) {
        if ((ingUnit || '').trim() !== p.expectedUnit) errors.push(`unit باید "${p.expectedUnit}" باشد`);
      }

      if (Number.isFinite(v) && typeof p.minValue === 'number' && v < p.minValue) errors.push(`value باید >= ${p.minValue} باشد`);
      if (Number.isFinite(v) && typeof p.maxValue === 'number' && v > p.maxValue) errors.push(`value باید <= ${p.maxValue} باشد`);
    }

    const ps = toIsoOrEmpty(ingPeriodStart);
    const pe = toIsoOrEmpty(ingPeriodEnd);
    if (!ps) errors.push('periodStart باید تاریخ معتبر باشد');
    if (!pe) errors.push('periodEnd باید تاریخ معتبر باشد');
    if (ps && pe && new Date(ps).getTime() >= new Date(pe).getTime()) errors.push('periodStart باید کوچکتر از periodEnd باشد');

    let metadata: any = null;
    if (ingMetadataJson.trim()) {
      try {
        metadata = JSON.parse(ingMetadataJson);
      } catch {
        errors.push('metadata JSON معتبر نیست');
      }
    }

    if (errors.length) {
      setIngErr({ code: 'VALIDATION_ERROR', message: 'خطاهای اعتبارسنجی', details: { errors } });
      setIngBusy(false);
      return;
    }

    const r = await apiFetch<any>('/reporting/kpis/snapshots', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Idempotency-Key': ingIdempotencyKey.trim(),
      } as any,
      body: JSON.stringify({
        kpiKey: ingKpiKey.trim(),
        value: v,
        unit: ingUnit.trim() || null,
        sourceSystem: ingSource.trim() || null,
        periodGranularity: ingPeriodGranularity,
        officialSourceSystem: ingOfficialSourceSystem.trim() || null,
        periodStart: ps,
        periodEnd: pe,
        metadata,
      }),
    });

    if (!r.success) {
      setIngErr({ code: r.error.code, message: r.error.message, correlationId: r.correlationId, details: (r.error as any)?.details });
      setIngBusy(false);
      return;
    }

    setIngOk({ correlationId: r.correlationId });
    setIngIdempotencyKey(`ui-${Date.now()}`);
    await loadSnapshots({ resetOffset: true });
    setIngBusy(false);
  }

  useEffect(() => {
    if (!canView) return;
    loadReady();
    loadSnapshots({ resetOffset: true });
    loadRiAll();
    loadDocsAttached();
    loadClaimPayments();
    loadFraudEscalations();
    loadSlaBreaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canAdmin) return;
    loadGovernancePolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAdmin]);

  useEffect(() => {
    if (!canView) return;
    loadSnapshots({ resetOffset: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapLimit, snapOffset]);

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">گزارش‌ها / KPI</h1>
            <p className="mt-1 text-sm text-text-muted">
              داشبورد enterprise KPI (Ready projections + Snapshot ingestion) با کنترل دسترسی نقش‌محور
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" disabled={!canView || readyLoading} isLoading={readyLoading} onClick={loadReady}>
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی KPIهای Ready
          </Button>
          <Button variant="ghost" size="sm" disabled={!canView || snapLoading} isLoading={snapLoading} onClick={() => loadSnapshots({ resetOffset: true })}>
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی Snapshotها
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">اتکایی (Reinsurance Projections)</h2>
              <p className="mt-1 text-sm text-text-muted">Read-modelهای derived از رویدادهای `insurance.ri.*` (server-driven pagination + RBAC)</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" disabled={riBusy} isLoading={riBusy} onClick={loadRiAll}>
            <RefreshCw className="h-4 w-4 ml-1" />
            {riBusy ? 'در حال بروزرسانی...' : 'بروزرسانی'}
          </Button>
        </div>

        {riErr ? (
          <div className="mt-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <div>خطا: {riErr.message}</div>
              {riErr.correlationId ? <div className="mt-1 text-xs">correlationId: {riErr.correlationId}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Ceded Calculations</div>
                <div className="mt-1 text-xs text-text-muted">topic: insurance.ri.ceded_calculated</div>
              </div>
              <div className="text-xs text-text-muted">total: {riCededTotal}</div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-5">
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="contractId" value={riCededContractId} onChange={(e) => setRiCededContractId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="policyId" value={riCededPolicyId} onChange={(e) => setRiCededPolicyId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="claimId" value={riCededClaimId} onChange={(e) => setRiCededClaimId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="limit" value={String(riCededLimit)} onChange={(e) => setRiCededLimit(parseInt(e.target.value || '25', 10) || 25)} />
              <Button variant="secondary" size="sm" onClick={() => { setRiCededOffset(0); loadRiAll(); }} disabled={riBusy}>
                اعمال
              </Button>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-muted">
                  <tr className="border-b">
                    <th className="py-2 text-left">riKey</th>
                    <th className="py-2 text-left">contractId</th>
                    <th className="py-2 text-left">policyId</th>
                    <th className="py-2 text-left">gross</th>
                    <th className="py-2 text-left">ceded</th>
                    <th className="py-2 text-left">retained</th>
                    <th className="py-2 text-left">currency</th>
                  </tr>
                </thead>
                <tbody>
                  {riCededRows.map((r: RiCededRow) => (
                    <tr key={r.riKey} className="border-b">
                      <td className="py-2 pr-4 text-xs break-all">{r.riKey}</td>
                      <td className="py-2 pr-4 text-xs break-all">{r.contractId}</td>
                      <td className="py-2 pr-4 text-xs break-all">{r.policyId || '—'}</td>
                      <td className="py-2 pr-4">{r.grossAmount ? Number(r.grossAmount).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{r.cededAmount ? Number(r.cededAmount).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{r.retainedAmount ? Number(r.retainedAmount).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{r.currency || '—'}</td>
                    </tr>
                  ))}
                  {!riBusy && riCededRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-text-muted" colSpan={7}>
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Bordereaux</div>
                <div className="mt-1 text-xs text-text-muted">topic: insurance.ri.borderaux_generated</div>
              </div>
              <div className="text-xs text-text-muted">total: {riBorderauxTotal}</div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="contractId" value={riBorderauxContractId} onChange={(e) => setRiBorderauxContractId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="limit" value={String(riBorderauxLimit)} onChange={(e) => setRiBorderauxLimit(parseInt(e.target.value || '25', 10) || 25)} />
              <div />
              <Button variant="secondary" size="sm" onClick={() => { setRiBorderauxOffset(0); loadRiAll(); }} disabled={riBusy}>
                اعمال
              </Button>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-muted">
                  <tr className="border-b">
                    <th className="py-2 text-left">borderauxId</th>
                    <th className="py-2 text-left">contractId</th>
                    <th className="py-2 text-left">period</th>
                    <th className="py-2 text-left">items</th>
                    <th className="py-2 text-left">documentId</th>
                  </tr>
                </thead>
                <tbody>
                  {riBorderauxRows.map((b: RiBorderauxRow) => (
                    <tr key={b.borderauxId} className="border-b">
                      <td className="py-2 pr-4 text-xs break-all">{b.borderauxId}</td>
                      <td className="py-2 pr-4 text-xs break-all">{b.contractId}</td>
                      <td className="py-2 pr-4 text-xs">{new Date(b.periodStart).toLocaleDateString('fa-IR')} → {new Date(b.periodEnd).toLocaleDateString('fa-IR')}</td>
                      <td className="py-2 pr-4">{b.itemsCount}</td>
                      <td className="py-2 pr-4 text-xs break-all">{b.documentId || '—'}</td>
                    </tr>
                  ))}
                  {!riBusy && riBorderauxRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-text-muted" colSpan={5}>
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Recoveries</div>
                <div className="mt-1 text-xs text-text-muted">topics: insurance.ri.recovery_identified / insurance.ri.recovery_received</div>
              </div>
              <div className="text-xs text-text-muted">total: {riRecoveryTotal}</div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-5">
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="contractId" value={riRecoveryContractId} onChange={(e) => setRiRecoveryContractId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="claimId" value={riRecoveryClaimId} onChange={(e) => setRiRecoveryClaimId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="limit" value={String(riRecoveryLimit)} onChange={(e) => setRiRecoveryLimit(parseInt(e.target.value || '25', 10) || 25)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="offset" value={String(riRecoveryOffset)} onChange={(e) => setRiRecoveryOffset(parseInt(e.target.value || '0', 10) || 0)} />
              <Button variant="secondary" size="sm" onClick={() => { setRiRecoveryOffset(0); loadRiAll(); }} disabled={riBusy}>
                اعمال
              </Button>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-muted">
                  <tr className="border-b">
                    <th className="py-2 text-left">recoveryId</th>
                    <th className="py-2 text-left">claimId</th>
                    <th className="py-2 text-left">contractId</th>
                    <th className="py-2 text-left">recoverable</th>
                    <th className="py-2 text-left">recovered</th>
                    <th className="py-2 text-left">currency</th>
                  </tr>
                </thead>
                <tbody>
                  {riRecoveryRows.map((x: RiRecoveryRow) => (
                    <tr key={x.recoveryId} className="border-b">
                      <td className="py-2 pr-4 text-xs break-all">{x.recoveryId}</td>
                      <td className="py-2 pr-4 text-xs break-all">{x.claimId}</td>
                      <td className="py-2 pr-4 text-xs break-all">{x.contractId}</td>
                      <td className="py-2 pr-4">{x.recoverableAmount ? Number(x.recoverableAmount).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{x.recoveredAmount ? Number(x.recoveredAmount).toLocaleString() : '—'}</td>
                      <td className="py-2 pr-4">{x.currency || '—'}</td>
                    </tr>
                  ))}
                  {!riBusy && riRecoveryRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-text-muted" colSpan={6}>
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Fraud Case Escalations</div>
                <div className="mt-1 text-xs text-text-muted">topic: insurance.fraud.case_escalated</div>
              </div>
              <div className="text-xs text-text-muted">total: {escTotal}</div>
            </div>

            {escErr ? (
              <div className="mt-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div>خطا: {escErr.message}</div>
                  {escErr.correlationId ? <div className="mt-1 text-xs">correlationId: {escErr.correlationId}</div> : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 md:grid-cols-6">
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="claimId" value={escClaimId} onChange={(e) => setEscClaimId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="fraudCaseId" value={escFraudCaseId} onChange={(e) => setEscFraudCaseId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="toUnit (siu/legal)" value={escToUnit} onChange={(e) => setEscToUnit(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="limit" value={String(escLimit)} onChange={(e) => setEscLimit(parseInt(e.target.value || '25', 10) || 25)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="offset" value={String(escOffset)} onChange={(e) => setEscOffset(parseInt(e.target.value || '0', 10) || 0)} />
              <Button variant="secondary" size="sm" onClick={() => { setEscOffset(0); loadFraudEscalations(); }} disabled={escBusy}>
                اعمال
              </Button>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-muted">
                  <tr className="border-b">
                    <th className="py-2 text-left">occurredAt</th>
                    <th className="py-2 text-left">fraudCaseId</th>
                    <th className="py-2 text-left">claimId</th>
                    <th className="py-2 text-left">toUnit</th>
                    <th className="py-2 text-left">requiresHumanApproval</th>
                    <th className="py-2 text-left">reasonCodes</th>
                  </tr>
                </thead>
                <tbody>
                  {escRows.map((e: FraudCaseEscalationRow) => (
                    <tr key={e.eventId} className="border-b">
                      <td className="py-2 pr-4 text-xs">{e.occurredAt ? new Date(e.occurredAt).toLocaleString('fa-IR') : '—'}</td>
                      <td className="py-2 pr-4 text-xs break-all">{e.fraudCaseId}</td>
                      <td className="py-2 pr-4 text-xs break-all">{e.claimId}</td>
                      <td className="py-2 pr-4">{e.toUnit}</td>
                      <td className="py-2 pr-4">{e.requiresHumanApproval == null ? '—' : e.requiresHumanApproval ? 'yes' : 'no'}</td>
                      <td className="py-2 pr-4 text-xs">{e.reasonCodes ? JSON.stringify(e.reasonCodes) : '—'}</td>
                    </tr>
                  ))}
                  {!escBusy && escRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-text-muted" colSpan={6}>
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Complaint SLA Breaches</div>
                <div className="mt-1 text-xs text-text-muted">topic: insurance.complaint.sla_breached</div>
              </div>
              <div className="text-xs text-text-muted">total: {slaTotal}</div>
            </div>

            {slaErr ? (
              <div className="mt-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div>خطا: {slaErr.message}</div>
                  {slaErr.correlationId ? <div className="mt-1 text-xs">correlationId: {slaErr.correlationId}</div> : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 md:grid-cols-7">
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="complaintId" value={slaComplaintId} onChange={(e) => setSlaComplaintId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="claimId" value={slaClaimId} onChange={(e) => setSlaClaimId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="policyId" value={slaPolicyId} onChange={(e) => setSlaPolicyId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="status" value={slaStatus} onChange={(e) => setSlaStatus(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="assignedTo" value={slaAssignedTo} onChange={(e) => setSlaAssignedTo(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary" placeholder="limit" value={String(slaLimit)} onChange={(e) => setSlaLimit(parseInt(e.target.value || '25', 10) || 25)} />
              <Button variant="secondary" size="sm" onClick={() => { setSlaOffset(0); loadSlaBreaches(); }} disabled={slaBusy}>
                اعمال
              </Button>
            </div>

            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-text-muted">
                  <tr className="border-b">
                    <th className="py-2 text-left">occurredAt</th>
                    <th className="py-2 text-left">complaintId</th>
                    <th className="py-2 text-left">status</th>
                    <th className="py-2 text-left">assignedTo</th>
                    <th className="py-2 text-left">breachedAt</th>
                    <th className="py-2 text-left">elapsedHours</th>
                  </tr>
                </thead>
                <tbody>
                  {slaRows.map((b: ComplaintSlaBreachRow) => (
                    <tr key={b.eventId} className="border-b">
                      <td className="py-2 pr-4 text-xs">{b.occurredAt ? new Date(b.occurredAt).toLocaleString('fa-IR') : '—'}</td>
                      <td className="py-2 pr-4 text-xs break-all">{b.complaintId}</td>
                      <td className="py-2 pr-4">{b.status || '—'}</td>
                      <td className="py-2 pr-4 text-xs break-all">{b.assignedTo || '—'}</td>
                      <td className="py-2 pr-4 text-xs">{b.breachedAt ? new Date(b.breachedAt).toLocaleString('fa-IR') : '—'}</td>
                      <td className="py-2 pr-4">{b.elapsedHours == null ? '—' : String(b.elapsedHours)}</td>
                    </tr>
                  ))}
                  {!slaBusy && slaRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-text-muted" colSpan={6}>
                        موردی یافت نشد.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>



      {!canView ? (
        <Card className="mt-6 p-4 border-feedback-warning/30 bg-feedback-warning-subtle text-sm text-feedback-warning text-center">
          شما مجوز مشاهده گزارشات (`reporting:view`) را ندارید.
        </Card>
      ) : null}

      {readyErr ? (
        <div className="mt-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            {readyErr.code}: {readyErr.message}
            {readyErr.correlationId ? <div className="mt-2 text-xs">Correlation: {readyErr.correlationId}</div> : null}
          </div>
        </div>
      ) : null}

      {canView ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard title="سرعت صدور" value={fmt(ready?.issuanceSpeed?.totalIssued)} change={`Avg دقیقه: ${fmt(ready?.issuanceSpeed?.avgMinutesQuoteToIssue)}`} changeType="neutral" icon={TrendingUp} />
          <StatCard title="زمان پرداخت خسارت" value={fmt(ready?.claimPayoutTime?.totalPaid)} change={`Avg دقیقه: ${fmt(ready?.claimPayoutTime?.avgMinutesRegisterToPaid)}`} changeType="neutral" icon={Clock} />
          <StatCard title="نرخ تقلب‌های شناسایی‌شده" value={fmt(ready?.fraudIdentifiedRate?.totalScores)} change={`Hold count: ${fmt(ready?.fraudIdentifiedRate?.holdCount)}`} changeType="warning" icon={ShieldAlert} />
        </div>
      ) : null}

      {canView ? (
        <Card className="mt-6 p-4">
          <div className="text-sm font-semibold">Snapshot KPIها</div>

          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">kpiKey</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={fKpiKey} onChange={(e) => setFKpiKey(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">periodStart (ISO/date)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={fPeriodStart} onChange={(e) => setFPeriodStart(e.target.value)} placeholder="2026-01-01" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">periodEnd (ISO/date)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={fPeriodEnd} onChange={(e) => setFPeriodEnd(e.target.value)} placeholder="2026-02-01" />
            </label>

            <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" disabled={snapLoading} onClick={() => loadSnapshots({ resetOffset: true })}>
                  <Search className="h-4 w-4 ml-1" />
                  اعمال فیلتر
                </Button>

                <label className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-text-muted">limit</span>
                  <input
                    className="w-24 rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                    value={String(snapLimit)}
                    onChange={(e) => {
                      const n = parseInt(e.target.value || '50', 10);
                      setSnapLimit(Math.max(1, Math.min(200, Number.isFinite(n) ? n : 50)));
                    }}
                  />
                </label>
              </div>

              <div className="text-xs text-text-muted">
                نمایش {snapRows.length ? snapOffset + 1 : 0} تا {Math.min(snapOffset + snapLimit, snapTotal)} از {snapTotal}
              </div>
            </div>
          </div>

          {snapErr ? (
            <div className="mt-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                {snapErr.code}: {snapErr.message}
                {snapErr.correlationId ? <div className="mt-2 text-xs">Correlation: {snapErr.correlationId}</div> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {snapRows.map((r) => (
              <div key={r.snapshotId} className="rounded-xl border border-border-default bg-bg-base p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{r.kpiKey}</div>
                  <div className="text-xs text-text-muted">{r.createdAt}</div>
                </div>
                <div className="mt-1 text-xs text-text-muted">{r.periodStart} → {r.periodEnd}</div>
                <div className="mt-1 text-xs text-text-muted">
                  مقدار: {String(r.value)} {r.unit || ''} | Source: {r.sourceSystem || '—'}
                </div>
              </div>
            ))}
            {snapRows.length === 0 && !snapErr ? <div className="text-sm text-text-muted text-center py-4">داده‌ای وجود ندارد.</div> : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" disabled={snapLoading || snapOffset <= 0} onClick={() => setSnapOffset(Math.max(0, snapOffset - snapLimit))}>
              <ChevronRight className="h-4 w-4 ml-1" />
              قبلی
            </Button>
            <Button variant="ghost" size="sm" disabled={snapLoading || snapOffset + snapLimit >= snapTotal} onClick={() => setSnapOffset(snapOffset + snapLimit)}>
              بعدی
              <ChevronLeft className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      ) : null}

      {canView && canAdmin ? (
        <Card className="mt-6 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Governance Admin (Enterprise)</div>
              <p className="mt-1 text-xs text-text-muted">
                مدیریت قوانین KPI governance (RBAC: <code className="px-1">reporting:projections:admin</code>)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" disabled={govLoading} isLoading={govLoading} onClick={loadGovernancePolicies}>
                <RefreshCw className="h-4 w-4 ml-1" />
                {govLoading ? 'در حال بروزرسانی…' : 'بروزرسانی لیست قوانین'}
              </Button>
              <Button variant="secondary" size="sm" disabled={admBusy} onClick={resetAdmForm}>
                <Plus className="h-4 w-4 ml-1" />
                قانون جدید
              </Button>
            </div>
          </div>

          {admErr ? (
            <div className="mt-3 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
              <div className="font-medium">
                {admErr.code}: {admErr.message}
              </div>
              {Array.isArray((admErr as any)?.details?.errors) && (admErr as any).details.errors.length ? (
                <ul className="mt-2 list-disc space-y-1 pr-5 text-sm">
                  {(admErr as any).details.errors.map((e: any, idx: number) => (
                    <li key={idx}>{String(e)}</li>
                  ))}
                </ul>
              ) : null}
              {admErr.correlationId ? <div className="mt-2 text-xs">Correlation: {admErr.correlationId}</div> : null}
            </div>
          ) : null}

          {admOk ? (
            <div className="mt-3 rounded-xl border border-feedback-success/30 bg-feedback-success-subtle p-4 text-sm text-feedback-success">
              ذخیره شد.
              {admOk.correlationId ? <div className="mt-2 text-xs">Correlation: {admOk.correlationId}</div> : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-6">
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">انتخاب policy</span>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admSelectedKey} onChange={(e) => setAdmSelectedKey(e.target.value)}>
                <option value="">—</option>
                {govPolicies.map((p) => (
                  <option key={p.kpiKey} value={p.kpiKey}>
                    {p.kpiKey}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-text-muted">انتخاب برای ویرایش؛ یا «قانون جدید» برای ساخت.</span>
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">kpiKey</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admKpiKey} onChange={(e) => setAdmKpiKey(e.target.value)} placeholder="customer_satisfaction_rate" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">enforced</span>
              <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admEnforced ? 'true' : 'false'} onChange={(e) => setAdmEnforced(e.target.value === 'true')}>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm md:col-span-3">
              <span className="text-xs text-text-muted">allowedPeriodGranularities (comma-separated)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admAllowedGranularities} onChange={(e) => setAdmAllowedGranularities(e.target.value)} placeholder="month, quarter, year" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-3">
              <span className="text-xs text-text-muted">allowedSourceSystems (comma-separated)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admAllowedSources} onChange={(e) => setAdmAllowedSources(e.target.value)} placeholder="bi, regulatory, manual" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">expectedUnit (optional)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admExpectedUnit} onChange={(e) => setAdmExpectedUnit(e.target.value)} placeholder="percent" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">minValue (optional)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admMinValue} onChange={(e) => setAdmMinValue(e.target.value)} placeholder="0" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">maxValue (optional)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={admMaxValue} onChange={(e) => setAdmMaxValue(e.target.value)} placeholder="100" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-text-muted">
              ذخیره با متد <code className="px-1">PUT /reporting/kpis/governance/:kpiKey</code>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={admBusy} onClick={resetAdmForm}>
                پاک‌کردن فرم
              </Button>
              <Button disabled={admBusy} isLoading={admBusy} onClick={saveGovernancePolicy}>
                <Save className="h-4 w-4 ml-1" />
                {admBusy ? 'در حال ذخیره…' : 'ذخیره policy'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {canView && canIngest ? (
        <Card className="mt-6 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Ingest Snapshot KPI (Enterprise)</div>
              <p className="mt-1 text-xs text-text-muted">
                این بخش فقط برای ذینفعان دارای مجوز <code className="px-1">reporting:ingest</code> فعال است.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" disabled={govLoading} isLoading={govLoading} onClick={loadGovernancePolicies}>
                <RefreshCw className="h-4 w-4 ml-1" />
                {govLoading ? 'در حال بروزرسانی قوانین…' : 'بروزرسانی قوانین Governance'}
              </Button>
            </div>
          </div>

          {govErr ? (
            <div className="mt-3 rounded-xl border border-feedback-warning/30 bg-feedback-warning-subtle p-4 text-sm text-feedback-warning">
              خطا در دریافت قوانین: {govErr.code}: {govErr.message}
              {govErr.correlationId ? <div className="mt-2 text-xs">Correlation: {govErr.correlationId}</div> : null}
            </div>
          ) : null}

          {govLoading && !governanceSummary ? (
            <div className="mt-3 rounded-xl border border-border-default bg-bg-base p-4 text-sm text-text-secondary">
              در حال دریافت قوانین Governance…
            </div>
          ) : null}

          {String(ingKpiKey || '').trim() && governedGapKpis.has(String(ingKpiKey || '').trim()) && !selectedPolicy ? (
            <div className="mt-3 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
              برای این KPI قانون Governance در سیستم تعریف نشده است و ingestion طبق سیاست enterprise مسدود خواهد شد.
              <div className="mt-1 text-xs text-feedback-error">kpiKey: {String(ingKpiKey || '').trim()}</div>
            </div>
          ) : null}

          {ingErr ? (
            <div className="mt-3 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
              <div className="font-medium">{ingErr.code}: {ingErr.message}</div>

              {Array.isArray((ingErr as any)?.details?.errors) && (ingErr as any).details.errors.length ? (
                <ul className="mt-2 list-disc space-y-1 pr-5 text-sm">
                  {(ingErr as any).details.errors.map((e: any, idx: number) => (
                    <li key={idx}>{String(e)}</li>
                  ))}
                </ul>
              ) : null}

              {ingErr.correlationId ? <div className="mt-2 text-xs">Correlation: {ingErr.correlationId}</div> : null}
            </div>
          ) : null}

          {ingOk ? (
            <div className="mt-3 rounded-xl border border-feedback-success/30 bg-feedback-success-subtle p-4 text-sm text-feedback-success">
              ثبت شد.
              {ingOk.correlationId ? <div className="mt-2 text-xs">Correlation: {ingOk.correlationId}</div> : null}
            </div>
          ) : null}

          {governanceSummary ? (
            <div className="mt-3 rounded-xl border border-border-default bg-bg-base p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">Governance Summary</div>
                <div
                  className={
                    governanceSummary.enforced
                      ? 'rounded-full border border-feedback-success/30 bg-feedback-success-subtle px-2 py-0.5 text-xs text-feedback-success'
                      : 'rounded-full border border-border-default bg-bg-raised px-2 py-0.5 text-xs text-text-secondary'
                  }
                >
                  {governanceSummary.enforced ? 'Enforced' : 'Not enforced'}
                </div>
              </div>

              <div className="mt-2 grid gap-3 md:grid-cols-3">
                <Card className="p-3">
                  <div className="text-xs text-text-muted">Unit</div>
                  <div className="mt-1 text-sm font-medium">{governanceSummary.expectedUnit ?? '—'}</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-text-muted">Range</div>
                  <div className="mt-1 text-sm font-medium">{governanceSummary.rangeText ?? '—'}</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-text-muted">kpiKey</div>
                  <div className="mt-1 text-sm font-medium">{String(ingKpiKey || '').trim() || '—'}</div>
                </Card>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Card className="p-3">
                  <div className="text-xs text-text-muted">Allowed period granularities</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {governanceSummary.allowedGranularities.length ? governanceSummary.allowedGranularities.map((g) => chip(g)) : chip('—')}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-text-muted">Allowed source systems</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {governanceSummary.allowedSourceSystems.length ? governanceSummary.allowedSourceSystems.map((s) => chip(s)) : chip('—')}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">Idempotency-Key</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingIdempotencyKey} onChange={(e) => setIngIdempotencyKey(e.target.value)} />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">kpiKey</span>
              <input
                className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                value={ingKpiKey}
                onChange={(e) => setIngKpiKey(e.target.value)}
                list="kpiKeys"
              />
              <datalist id="kpiKeys">
                {govPolicies.map((p) => (
                  <option key={p.kpiKey} value={p.kpiKey} />
                ))}
              </datalist>
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">value (number)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingValue} onChange={(e) => setIngValue(e.target.value)} placeholder="12.34" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">unit</span>
              {selectedPolicy?.expectedUnit ? (
                <input className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-text-primary" value={selectedPolicy.expectedUnit} readOnly />
              ) : (
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingUnit} onChange={(e) => setIngUnit(e.target.value)} />
              )}
              {selectedPolicy?.enforced && (selectedPolicy.minValue != null || selectedPolicy.maxValue != null) ? (
                <span className="text-[11px] text-text-muted">
                  بازه مجاز value: {selectedPolicy.minValue == null ? '—' : String(selectedPolicy.minValue)} تا {selectedPolicy.maxValue == null ? '—' : String(selectedPolicy.maxValue)}
                </span>
              ) : null}
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">sourceSystem</span>
              {selectedPolicy?.allowedSourceSystems?.length ? (
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingSource} onChange={(e) => setIngSource(e.target.value)}>
                  {selectedPolicy.allowedSourceSystems.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingSource} onChange={(e) => setIngSource(e.target.value)} />
              )}
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">periodGranularity</span>
              {selectedPolicy?.allowedPeriodGranularities?.length ? (
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingPeriodGranularity} onChange={(e) => setIngPeriodGranularity(e.target.value)}>
                  {selectedPolicy.allowedPeriodGranularities.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingPeriodGranularity} onChange={(e) => setIngPeriodGranularity(e.target.value)}>
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="quarter">quarter</option>
                  <option value="year">year</option>
                </select>
              )}
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">officialSourceSystem</span>
              {selectedPolicy?.allowedSourceSystems?.length ? (
                <select
                  className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                  value={ingOfficialSourceSystem}
                  onChange={(e) => setIngOfficialSourceSystem(e.target.value)}
                >
                  {selectedPolicy.allowedSourceSystems.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary"
                  value={ingOfficialSourceSystem}
                  onChange={(e) => setIngOfficialSourceSystem(e.target.value)}
                />
              )}
            </label>

            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-xs text-text-muted">periodStart</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingPeriodStart} onChange={(e) => setIngPeriodStart(e.target.value)} placeholder="2026-01-01" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-3">
              <span className="text-xs text-text-muted">periodEnd</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingPeriodEnd} onChange={(e) => setIngPeriodEnd(e.target.value)} placeholder="2026-02-01" />
            </label>

            <label className="grid gap-1 text-sm md:col-span-3">
              <span className="text-xs text-text-muted">metadata (JSON)</span>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={ingMetadataJson} onChange={(e) => setIngMetadataJson(e.target.value)} />
            </label>

            <div className="md:col-span-6">
              <Button
                fullWidth
                disabled={ingBusy}
                isLoading={ingBusy}
                onClick={submitIngest}
              >
                {ingBusy ? 'در حال ثبت…' : 'ثبت Snapshot KPI'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </main>
  );
}