'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button, Card } from '@insurance/design-system';
import { cn as dsCn } from '@/lib/cn';
import { MOCK_PRODUCTS } from '@/lib/mock-data';

type ProductRow = {
  productId: string;
  code: string;
  nameFa: string;
  nameEn?: string | null;
  lineOfBusiness: string;
  status: string;
};

type CoverageRow = {
  coverageId: string;
  productId: string;
  code: string;
  nameFa: string;
  status: string;
};

type DeductibleRow = {
  deductibleId: string;
  productId: string;
  code: string;
  nameFa: string;
  kind: string;
  value: string;
  status: string;
};

type PricingRuleRow = {
  pricingRuleId: string;
  productId: string;
  code: string;
  nameFa: string;
  status: string;
};

type TabKey = 'products' | 'coverages' | 'deductibles' | 'pricingRules';

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}
const _dsCn = dsCn;

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bg-overlay" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border border-border-default bg-bg-raised p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[520px] md:rounded-none md:border-l">
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="text-body-sm font-semibold text-text-primary">{props.title}</div>
          <button type="button" className="rounded-xl border border-border-default px-3 py-2 text-sm text-text-secondary hover:bg-bg-base" onClick={props.onClose}>
            بستن
          </button>
        </div>
        <div className="pt-4">{props.children}</div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const [tab, setTab] = useState<TabKey>('products');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState<'create' | 'edit'>('create');
  const [productEditingId, setProductEditingId] = useState<string>('');
  const [productForm, setProductForm] = useState({ code: '', nameFa: '', nameEn: '', lineOfBusiness: '', status: '' });
  const [productSaving, setProductSaving] = useState(false);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string>('');

  const [selectedProductId, setSelectedProductId] = useState('');

  const [coveragesLoading, setCoveragesLoading] = useState(false);
  const [coverages, setCoverages] = useState<CoverageRow[]>([]);
  const [coveragesError, setCoveragesError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [coverageDrawerOpen, setCoverageDrawerOpen] = useState(false);
  const [coverageFormMode, setCoverageFormMode] = useState<'create' | 'edit'>('create');
  const [coverageEditingId, setCoverageEditingId] = useState<string>('');
  const [coverageForm, setCoverageForm] = useState({ code: '', nameFa: '', status: '' });
  const [coverageSaving, setCoverageSaving] = useState(false);
  const [confirmCoverageArchiveId, setConfirmCoverageArchiveId] = useState<string>('');

  const [deductiblesLoading, setDeductiblesLoading] = useState(false);
  const [deductibles, setDeductibles] = useState<DeductibleRow[]>([]);
  const [deductiblesError, setDeductiblesError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [deductibleDrawerOpen, setDeductibleDrawerOpen] = useState(false);
  const [deductibleFormMode, setDeductibleFormMode] = useState<'create' | 'edit'>('create');
  const [deductibleEditingId, setDeductibleEditingId] = useState<string>('');
  const [deductibleForm, setDeductibleForm] = useState({ code: '', nameFa: '', kind: '', value: '', status: '' });
  const [deductibleSaving, setDeductibleSaving] = useState(false);
  const [confirmDeductibleArchiveId, setConfirmDeductibleArchiveId] = useState<string>('');

  const [pricingRulesLoading, setPricingRulesLoading] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRuleRow[]>([]);
  const [pricingRulesError, setPricingRulesError] = useState<{ message: string; correlationId?: string } | null>(null);

  const [pricingRuleDrawerOpen, setPricingRuleDrawerOpen] = useState(false);
  const [pricingRuleFormMode, setPricingRuleFormMode] = useState<'create' | 'edit'>('create');
  const [pricingRuleEditingId, setPricingRuleEditingId] = useState<string>('');
  const [pricingRuleForm, setPricingRuleForm] = useState({ code: '', nameFa: '', status: '' });
  const [pricingRuleSaving, setPricingRuleSaving] = useState(false);
  const [confirmPricingRuleArchiveId, setConfirmPricingRuleArchiveId] = useState<string>('');

  const [status, setStatus] = useState('');
  const [lineOfBusiness, setLineOfBusiness] = useState('');
  const [q, setQ] = useState('');

  const [productsLimit, setProductsLimit] = useState(20);
  const [productsOffset, setProductsOffset] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);

  const [coveragesStatus, setCoveragesStatus] = useState('');
  const [coveragesQ, setCoveragesQ] = useState('');
  const [coveragesLimit, setCoveragesLimit] = useState(20);
  const [coveragesOffset, setCoveragesOffset] = useState(0);
  const [coveragesTotal, setCoveragesTotal] = useState(0);

  const [deductiblesStatus, setDeductiblesStatus] = useState('');
  const [deductiblesKind, setDeductiblesKind] = useState('');
  const [deductiblesQ, setDeductiblesQ] = useState('');
  const [deductiblesLimit, setDeductiblesLimit] = useState(20);
  const [deductiblesOffset, setDeductiblesOffset] = useState(0);
  const [deductiblesTotal, setDeductiblesTotal] = useState(0);

  const [pricingRulesStatus, setPricingRulesStatus] = useState('');
  const [pricingRulesQ, setPricingRulesQ] = useState('');
  const [pricingRulesLimit, setPricingRulesLimit] = useState(20);
  const [pricingRulesOffset, setPricingRulesOffset] = useState(0);
  const [pricingRulesTotal, setPricingRulesTotal] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [exportJson, setExportJson] = useState<string>('');

  async function load() {
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (lineOfBusiness) qs.set('lineOfBusiness', lineOfBusiness);
    if (q) qs.set('q', q);
    qs.set('limit', String(productsLimit));
    qs.set('offset', String(productsOffset));

    const res = await apiFetch<{ rows: ProductRow[]; total: number }>(
      `/product/products${qs.toString() ? `?${qs.toString()}` : ''}`
    );

    if (res.success) {
      setRows(res.data.rows || []);
      setProductsTotal(res.data.total || 0);
    }
    else {
      setRows(MOCK_PRODUCTS as unknown as ProductRow[]);
      setProductsTotal(MOCK_PRODUCTS.length);
    }

    setLoading(false);
  }

  async function doExport() {
    setExporting(true);
    setError(null);
    setExportJson('');

    const res = await apiFetch<any>('/product/export');
    if (res.success) setExportJson(JSON.stringify(res.data, null, 2));
    else setError({ message: res.error.message, correlationId: res.correlationId });

    setExporting(false);
  }

  function openCreateProduct() {
    setProductFormMode('create');
    setProductEditingId('');
    setProductForm({ code: '', nameFa: '', nameEn: '', lineOfBusiness: '', status: '' });
    setProductDrawerOpen(true);
  }

  function openEditProduct(p: ProductRow) {
    setProductFormMode('edit');
    setProductEditingId(p.productId);
    setProductForm({
      code: p.code,
      nameFa: p.nameFa,
      nameEn: p.nameEn || '',
      lineOfBusiness: p.lineOfBusiness,
      status: p.status || '',
    });
    setProductDrawerOpen(true);
  }

  async function saveProduct() {
    setProductSaving(true);
    setError(null);

    try {
      if (productFormMode === 'create') {
        const res = await apiFetch<ProductRow>('/product/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: productForm.code,
            nameFa: productForm.nameFa,
            nameEn: productForm.nameEn || null,
            lineOfBusiness: productForm.lineOfBusiness,
          }),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<ProductRow>(`/product/products/${productEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            nameFa: productForm.nameFa,
            nameEn: productForm.nameEn || null,
            lineOfBusiness: productForm.lineOfBusiness,
            status: productForm.status || undefined,
          }),
        });
        if (!res.success) {
          setError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setProductDrawerOpen(false);
      await load();
    } finally {
      setProductSaving(false);
    }
  }

  async function archiveProductNow(productId: string) {
    setConfirmArchiveId('');
    setError(null);
    const res = await apiFetch<any>(`/product/products/${productId}/archive`, { method: 'POST' });
    if (!res.success) {
      setError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }
    await load();
  }

  function openCreateCoverage() {
    if (!selectedProductId) return;
    setCoverageFormMode('create');
    setCoverageEditingId('');
    setCoverageForm({ code: '', nameFa: '', status: '' });
    setCoverageDrawerOpen(true);
  }

  function openEditCoverage(c: CoverageRow) {
    setCoverageFormMode('edit');
    setCoverageEditingId(c.coverageId);
    setCoverageForm({ code: c.code, nameFa: c.nameFa, status: c.status || '' });
    setCoverageDrawerOpen(true);
  }

  async function saveCoverage() {
    if (!selectedProductId) return;
    setCoverageSaving(true);
    setCoveragesError(null);

    try {
      if (coverageFormMode === 'create') {
        const res = await apiFetch<CoverageRow>('/product/coverages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProductId,
            code: coverageForm.code,
            nameFa: coverageForm.nameFa,
          }),
        });
        if (!res.success) {
          setCoveragesError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<CoverageRow>(`/product/coverages/${coverageEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            nameFa: coverageForm.nameFa,
            status: coverageForm.status || undefined,
          }),
        });
        if (!res.success) {
          setCoveragesError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setCoverageDrawerOpen(false);
      await loadCoverages();
    } finally {
      setCoverageSaving(false);
    }
  }

  async function archiveCoverageNow(coverageId: string) {
    setConfirmCoverageArchiveId('');
    setCoveragesError(null);
    const res = await apiFetch<any>(`/product/coverages/${coverageId}/archive`, { method: 'POST' });
    if (!res.success) {
      setCoveragesError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }
    await loadCoverages();
  }

  function openCreateDeductible() {
    if (!selectedProductId) return;
    setDeductibleFormMode('create');
    setDeductibleEditingId('');
    setDeductibleForm({ code: '', nameFa: '', kind: '', value: '', status: '' });
    setDeductibleDrawerOpen(true);
  }

  function openEditDeductible(d: DeductibleRow) {
    setDeductibleFormMode('edit');
    setDeductibleEditingId(d.deductibleId);
    setDeductibleForm({
      code: d.code,
      nameFa: d.nameFa,
      kind: d.kind || '',
      value: d.value || '',
      status: d.status || '',
    });
    setDeductibleDrawerOpen(true);
  }

  async function saveDeductible() {
    if (!selectedProductId) return;
    setDeductibleSaving(true);
    setDeductiblesError(null);

    try {
      if (deductibleFormMode === 'create') {
        const res = await apiFetch<DeductibleRow>('/product/deductibles', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProductId,
            code: deductibleForm.code,
            nameFa: deductibleForm.nameFa,
            kind: deductibleForm.kind,
            value: deductibleForm.value,
          }),
        });
        if (!res.success) {
          setDeductiblesError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<DeductibleRow>(`/product/deductibles/${deductibleEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            nameFa: deductibleForm.nameFa,
            kind: deductibleForm.kind,
            value: deductibleForm.value,
            status: deductibleForm.status || undefined,
          }),
        });
        if (!res.success) {
          setDeductiblesError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setDeductibleDrawerOpen(false);
      await loadDeductibles();
    } finally {
      setDeductibleSaving(false);
    }
  }

  async function archiveDeductibleNow(deductibleId: string) {
    setConfirmDeductibleArchiveId('');
    setDeductiblesError(null);
    const res = await apiFetch<any>(`/product/deductibles/${deductibleId}/archive`, { method: 'POST' });
    if (!res.success) {
      setDeductiblesError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }
    await loadDeductibles();
  }

  function openCreatePricingRule() {
    if (!selectedProductId) return;
    setPricingRuleFormMode('create');
    setPricingRuleEditingId('');
    setPricingRuleForm({ code: '', nameFa: '', status: '' });
    setPricingRuleDrawerOpen(true);
  }

  function openEditPricingRule(r: PricingRuleRow) {
    setPricingRuleFormMode('edit');
    setPricingRuleEditingId(r.pricingRuleId);
    setPricingRuleForm({ code: r.code, nameFa: r.nameFa, status: r.status || '' });
    setPricingRuleDrawerOpen(true);
  }

  async function savePricingRule() {
    if (!selectedProductId) return;
    setPricingRuleSaving(true);
    setPricingRulesError(null);

    try {
      if (pricingRuleFormMode === 'create') {
        const res = await apiFetch<PricingRuleRow>('/product/pricing-rules', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProductId,
            code: pricingRuleForm.code,
            nameFa: pricingRuleForm.nameFa,
          }),
        });
        if (!res.success) {
          setPricingRulesError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      } else {
        const res = await apiFetch<PricingRuleRow>(`/product/pricing-rules/${pricingRuleEditingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            nameFa: pricingRuleForm.nameFa,
            status: pricingRuleForm.status || undefined,
          }),
        });
        if (!res.success) {
          setPricingRulesError({ message: res.error.message, correlationId: res.correlationId });
          return;
        }
      }

      setPricingRuleDrawerOpen(false);
      await loadPricingRules();
    } finally {
      setPricingRuleSaving(false);
    }
  }

  async function archivePricingRuleNow(pricingRuleId: string) {
    setConfirmPricingRuleArchiveId('');
    setPricingRulesError(null);
    const res = await apiFetch<any>(`/product/pricing-rules/${pricingRuleId}/archive`, { method: 'POST' });
    if (!res.success) {
      setPricingRulesError({ message: res.error.message, correlationId: res.correlationId });
      return;
    }
    await loadPricingRules();
  }

  async function loadCoverages() {
    setCoveragesLoading(true);
    setCoveragesError(null);

    const qs = new URLSearchParams();
    if (selectedProductId) qs.set('productId', selectedProductId);
    if (coveragesStatus) qs.set('status', coveragesStatus);
    if (coveragesQ) qs.set('q', coveragesQ);
    qs.set('limit', String(coveragesLimit));
    qs.set('offset', String(coveragesOffset));

    const res = await apiFetch<{ rows: CoverageRow[]; total: number }>(
      `/product/coverages${qs.toString() ? `?${qs.toString()}` : ''}`
    );

    if (res.success) {
      setCoverages(res.data.rows || []);
      setCoveragesTotal(res.data.total || 0);
    } else {
      setCoveragesError({ message: res.error.message, correlationId: res.correlationId });
    }

    setCoveragesLoading(false);
  }

  async function loadDeductibles() {
    setDeductiblesLoading(true);
    setDeductiblesError(null);

    const qs = new URLSearchParams();
    if (selectedProductId) qs.set('productId', selectedProductId);
    if (deductiblesStatus) qs.set('status', deductiblesStatus);
    if (deductiblesKind) qs.set('kind', deductiblesKind);
    if (deductiblesQ) qs.set('q', deductiblesQ);
    qs.set('limit', String(deductiblesLimit));
    qs.set('offset', String(deductiblesOffset));

    const res = await apiFetch<{ rows: DeductibleRow[]; total: number }>(
      `/product/deductibles${qs.toString() ? `?${qs.toString()}` : ''}`
    );

    if (res.success) {
      setDeductibles(res.data.rows || []);
      setDeductiblesTotal(res.data.total || 0);
    } else {
      setDeductiblesError({ message: res.error.message, correlationId: res.correlationId });
    }

    setDeductiblesLoading(false);
  }

  async function loadPricingRules() {
    setPricingRulesLoading(true);
    setPricingRulesError(null);

    const qs = new URLSearchParams();
    if (selectedProductId) qs.set('productId', selectedProductId);
    if (pricingRulesStatus) qs.set('status', pricingRulesStatus);
    if (pricingRulesQ) qs.set('q', pricingRulesQ);
    qs.set('limit', String(pricingRulesLimit));
    qs.set('offset', String(pricingRulesOffset));

    const res = await apiFetch<{ rows: PricingRuleRow[]; total: number }>(
      `/product/pricing-rules${qs.toString() ? `?${qs.toString()}` : ''}`
    );

    if (res.success) {
      setPricingRules(res.data.rows || []);
      setPricingRulesTotal(res.data.total || 0);
    } else {
      setPricingRulesError({ message: res.error.message, correlationId: res.correlationId });
    }

    setPricingRulesLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== 'products') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, productsLimit, productsOffset]);

  useEffect(() => {
    if (tab === 'coverages') loadCoverages();
    if (tab === 'deductibles') loadDeductibles();
    if (tab === 'pricingRules') loadPricingRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedProductId, coveragesStatus, coveragesQ, coveragesLimit, coveragesOffset, deductiblesStatus, deductiblesKind, deductiblesQ, deductiblesLimit, deductiblesOffset, pricingRulesStatus, pricingRulesQ, pricingRulesLimit, pricingRulesOffset]);

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-h3 font-bold text-text-primary">محصولات (Product)</h1>
            <p className="mt-1 text-body-xs text-text-muted">Products / Coverages / Deductibles / Pricing Rules</p>
          </div>
          <div className="flex gap-2">
            {tab === 'products' ? (
              <Button size="sm" onClick={openCreateProduct}>
                ایجاد محصول
              </Button>
            ) : null}
            {tab === 'coverages' ? (
              <Button size="sm" onClick={openCreateCoverage} disabled={!selectedProductId}>
                ایجاد پوشش
              </Button>
            ) : null}
            {tab === 'deductibles' ? (
              <Button size="sm" onClick={openCreateDeductible} disabled={!selectedProductId}>
                ایجاد فرانشیز
              </Button>
            ) : null}
            {tab === 'pricingRules' ? (
              <Button size="sm" onClick={openCreatePricingRule} disabled={!selectedProductId}>
                ایجاد Rule
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
              بروزرسانی
            </Button>
            <Button size="sm" variant="secondary" onClick={doExport} disabled={exporting}>
              {exporting ? 'در حال خروجی...' : 'Export'}
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setTab('products')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
              tab === 'products' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setTab('coverages')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
              tab === 'coverages' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            Coverages
          </button>
          <button
            type="button"
            onClick={() => setTab('deductibles')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
              tab === 'deductibles' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            Deductibles
          </button>
          <button
            type="button"
            onClick={() => setTab('pricingRules')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
              tab === 'pricingRules' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            Pricing Rules
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">

      {tab === 'products' ? (
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <input className="rounded-xl border px-3 py-2" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="lineOfBusiness"
            value={lineOfBusiness}
            onChange={(e) => setLineOfBusiness(e.target.value)}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="q (code / nameFa / nameEn)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base" onClick={load} disabled={loading}>
            اعمال فیلتر
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <select
              className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setCoveragesOffset(0);
                setDeductiblesOffset(0);
                setPricingRulesOffset(0);
              }}
            >
              <option value="">همه محصولات</option>
              {rows.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.code} - {p.nameFa}
                </option>
              ))}
            </select>

            {!selectedProductId ? (
              <div className="rounded-xl border border-feedback-warning/30 bg-feedback-warning-subtle px-3 py-2 text-xs text-feedback-warning">
                برای مشاهده/ایجاد آیتم‌های این تب، ابتدا یک محصول انتخاب کنید.
              </div>
            ) : null}

            {tab === 'coverages' ? (
              <>
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="status"
                  value={coveragesStatus}
                  onChange={(e) => {
                    setCoveragesStatus(e.target.value);
                    setCoveragesOffset(0);
                  }}
                />
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="q (code / nameFa)"
                  value={coveragesQ}
                  onChange={(e) => {
                    setCoveragesQ(e.target.value);
                    setCoveragesOffset(0);
                  }}
                />
                <button
                  type="button"
                  className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base"
                  onClick={loadCoverages}
                  disabled={coveragesLoading}
                >
                  {coveragesLoading ? 'در حال دریافت...' : 'بروزرسانی'}
                </button>
              </>
            ) : null}

            {tab === 'deductibles' ? (
              <>
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="status"
                  value={deductiblesStatus}
                  onChange={(e) => {
                    setDeductiblesStatus(e.target.value);
                    setDeductiblesOffset(0);
                  }}
                />
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="kind (fixed_amount / percent)"
                  value={deductiblesKind}
                  onChange={(e) => {
                    setDeductiblesKind(e.target.value);
                    setDeductiblesOffset(0);
                  }}
                />
                <input
                  className="rounded-xl border px-3 py-2 md:col-span-2"
                  placeholder="q (code / nameFa)"
                  value={deductiblesQ}
                  onChange={(e) => {
                    setDeductiblesQ(e.target.value);
                    setDeductiblesOffset(0);
                  }}
                />
                <button
                  type="button"
                  className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base md:col-span-4"
                  onClick={loadDeductibles}
                  disabled={deductiblesLoading}
                >
                  {deductiblesLoading ? 'در حال دریافت...' : 'بروزرسانی'}
                </button>
              </>
            ) : null}

            {tab === 'pricingRules' ? (
              <>
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="status"
                  value={pricingRulesStatus}
                  onChange={(e) => {
                    setPricingRulesStatus(e.target.value);
                    setPricingRulesOffset(0);
                  }}
                />
                <input
                  className="rounded-xl border px-3 py-2"
                  placeholder="q (code / nameFa)"
                  value={pricingRulesQ}
                  onChange={(e) => {
                    setPricingRulesQ(e.target.value);
                    setPricingRulesOffset(0);
                  }}
                />
                <button
                  type="button"
                  className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base"
                  onClick={loadPricingRules}
                  disabled={pricingRulesLoading}
                >
                  {pricingRulesLoading ? 'در حال دریافت...' : 'بروزرسانی'}
                </button>
              </>
            ) : null}
          </div>

          {tab === 'coverages' && coveragesError ? (
            <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
              <div>خطا: {coveragesError.message}</div>
              {coveragesError.correlationId ? <div className="mt-1 text-xs">correlationId: {coveragesError.correlationId}</div> : null}
            </div>
          ) : null}

          {tab === 'deductibles' && deductiblesError ? (
            <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
              <div>خطا: {deductiblesError.message}</div>
              {deductiblesError.correlationId ? <div className="mt-1 text-xs">correlationId: {deductiblesError.correlationId}</div> : null}
            </div>
          ) : null}

          {tab === 'pricingRules' && pricingRulesError ? (
            <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
              <div>خطا: {pricingRulesError.message}</div>
              {pricingRulesError.correlationId ? <div className="mt-1 text-xs">correlationId: {pricingRulesError.correlationId}</div> : null}
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="mt-6 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {exportJson ? (
        <Card className="mt-6 p-4">
          <div className="text-sm font-semibold">Export snapshot</div>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-bg-raised p-3 text-xs text-text-primary">{exportJson}</pre>
        </Card>
      ) : null}

      {tab === 'products' ? (
        <div className="mt-6 space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="text-text-secondary">
              نمایش
              <span className="mx-1 font-semibold">{rows.length}</span>
              از
              <span className="mx-1 font-semibold">{productsTotal}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-border-default bg-bg-base px-2 py-1 text-body-sm text-text-primary"
                value={productsLimit}
                onChange={(e) => {
                  setProductsLimit(parseInt(e.target.value, 10) || 20);
                  setProductsOffset(0);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={productsOffset <= 0 || loading}
                onClick={() => setProductsOffset(Math.max(0, productsOffset - productsLimit))}
              >
                قبلی
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={productsOffset + productsLimit >= productsTotal || loading}
                onClick={() => setProductsOffset(productsOffset + productsLimit)}
              >
                بعدی
              </button>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((p) => (
              <div key={p.productId} className="rounded-xl border border-border-default bg-bg-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {p.code} - {p.nameFa}
                  </div>
                  <span className="rounded-xl border bg-bg-base px-2 py-1 text-xs text-text-secondary">{p.status}</span>
                </div>
                <div className="mt-2 text-xs text-text-muted">lineOfBusiness: {p.lineOfBusiness}</div>
                <div className="mt-1 text-xs text-text-muted">productId: {p.productId}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base" onClick={() => openEditProduct(p)}>
                    ویرایش
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-3 py-2 text-sm text-feedback-error hover:opacity-90"
                    onClick={() => setConfirmArchiveId(p.productId)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && rows.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
        </div>
      ) : null}

      {tab === 'coverages' ? (
        <div className="mt-6 space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="text-text-secondary">
              نمایش
              <span className="mx-1 font-semibold">{coverages.length}</span>
              از
              <span className="mx-1 font-semibold">{coveragesTotal}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-border-default bg-bg-base px-2 py-1 text-body-sm text-text-primary"
                value={coveragesLimit}
                onChange={(e) => {
                  setCoveragesLimit(parseInt(e.target.value, 10) || 20);
                  setCoveragesOffset(0);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={coveragesOffset <= 0 || coveragesLoading}
                onClick={() => setCoveragesOffset(Math.max(0, coveragesOffset - coveragesLimit))}
              >
                قبلی
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={coveragesOffset + coveragesLimit >= coveragesTotal || coveragesLoading}
                onClick={() => setCoveragesOffset(coveragesOffset + coveragesLimit)}
              >
                بعدی
              </button>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {coverages.map((c) => (
              <div key={c.coverageId} className="rounded-xl border border-border-default bg-bg-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {c.code} - {c.nameFa}
                  </div>
                  <span className="rounded-xl border bg-bg-base px-2 py-1 text-xs text-text-secondary">{c.status}</span>
                </div>
                <div className="mt-2 text-xs text-text-muted">productId: {c.productId}</div>
                <div className="mt-1 text-xs text-text-muted">coverageId: {c.coverageId}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base" onClick={() => openEditCoverage(c)}>
                    ویرایش
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-3 py-2 text-sm text-feedback-error hover:opacity-90"
                    onClick={() => setConfirmCoverageArchiveId(c.coverageId)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!coveragesLoading && coverages.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
        </div>
      ) : null}

      {tab === 'deductibles' ? (
        <div className="mt-6 space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="text-text-secondary">
              نمایش
              <span className="mx-1 font-semibold">{deductibles.length}</span>
              از
              <span className="mx-1 font-semibold">{deductiblesTotal}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-border-default bg-bg-base px-2 py-1 text-body-sm text-text-primary"
                value={deductiblesLimit}
                onChange={(e) => {
                  setDeductiblesLimit(parseInt(e.target.value, 10) || 20);
                  setDeductiblesOffset(0);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={deductiblesOffset <= 0 || deductiblesLoading}
                onClick={() => setDeductiblesOffset(Math.max(0, deductiblesOffset - deductiblesLimit))}
              >
                قبلی
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={deductiblesOffset + deductiblesLimit >= deductiblesTotal || deductiblesLoading}
                onClick={() => setDeductiblesOffset(deductiblesOffset + deductiblesLimit)}
              >
                بعدی
              </button>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {deductibles.map((d) => (
              <div key={d.deductibleId} className="rounded-xl border border-border-default bg-bg-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {d.code} - {d.nameFa}
                  </div>
                  <span className="rounded-xl border bg-bg-base px-2 py-1 text-xs text-text-secondary">{d.status}</span>
                </div>
                <div className="mt-2 text-xs text-text-muted">kind: {d.kind} | value: {d.value}</div>
                <div className="mt-1 text-xs text-text-muted">productId: {d.productId}</div>
                <div className="mt-1 text-xs text-text-muted">deductibleId: {d.deductibleId}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base" onClick={() => openEditDeductible(d)}>
                    ویرایش
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-3 py-2 text-sm text-feedback-error hover:opacity-90"
                    onClick={() => setConfirmDeductibleArchiveId(d.deductibleId)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!deductiblesLoading && deductibles.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
        </div>
      ) : null}

      {tab === 'pricingRules' ? (
        <div className="mt-6 space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div className="text-text-secondary">
              نمایش
              <span className="mx-1 font-semibold">{pricingRules.length}</span>
              از
              <span className="mx-1 font-semibold">{pricingRulesTotal}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-border-default bg-bg-base px-2 py-1 text-body-sm text-text-primary"
                value={pricingRulesLimit}
                onChange={(e) => {
                  setPricingRulesLimit(parseInt(e.target.value, 10) || 20);
                  setPricingRulesOffset(0);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={pricingRulesOffset <= 0 || pricingRulesLoading}
                onClick={() => setPricingRulesOffset(Math.max(0, pricingRulesOffset - pricingRulesLimit))}
              >
                قبلی
              </button>
              <button
                type="button"
                className="rounded-xl border border-border-default bg-bg-base px-3 py-1 text-body-sm text-text-primary hover:bg-bg-base"
                disabled={pricingRulesOffset + pricingRulesLimit >= pricingRulesTotal || pricingRulesLoading}
                onClick={() => setPricingRulesOffset(pricingRulesOffset + pricingRulesLimit)}
              >
                بعدی
              </button>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {pricingRules.map((r) => (
              <div key={r.pricingRuleId} className="rounded-xl border border-border-default bg-bg-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {r.code} - {r.nameFa}
                  </div>
                  <span className="rounded-xl border bg-bg-base px-2 py-1 text-xs text-text-secondary">{r.status}</span>
                </div>
                <div className="mt-2 text-xs text-text-muted">productId: {r.productId}</div>
                <div className="mt-1 text-xs text-text-muted">pricingRuleId: {r.pricingRuleId}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base" onClick={() => openEditPricingRule(r)}>
                    ویرایش
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-3 py-2 text-sm text-feedback-error hover:opacity-90"
                    onClick={() => setConfirmPricingRuleArchiveId(r.pricingRuleId)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!pricingRulesLoading && pricingRules.length === 0 ? <div className="text-sm text-text-muted">موردی یافت نشد.</div> : null}
        </div>
      ) : null}

      <Drawer
        open={productDrawerOpen}
        title={productFormMode === 'create' ? 'ایجاد محصول' : 'ویرایش محصول'}
        onClose={() => setProductDrawerOpen(false)}
      >
        <div className="grid gap-3">
          {productFormMode === 'create' ? (
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="code"
              value={productForm.code}
              onChange={(e) => setProductForm((s) => ({ ...s, code: e.target.value }))}
            />
          ) : (
            <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-sm text-text-secondary">code: {productForm.code}</div>
          )}
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="nameFa"
            value={productForm.nameFa}
            onChange={(e) => setProductForm((s) => ({ ...s, nameFa: e.target.value }))}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="nameEn (optional)"
            value={productForm.nameEn}
            onChange={(e) => setProductForm((s) => ({ ...s, nameEn: e.target.value }))}
          />
          <input
            className="rounded-xl border px-3 py-2"
            placeholder="lineOfBusiness"
            value={productForm.lineOfBusiness}
            onChange={(e) => setProductForm((s) => ({ ...s, lineOfBusiness: e.target.value }))}
          />
          {productFormMode === 'edit' ? (
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="status (draft/active/archived)"
              value={productForm.status}
              onChange={(e) => setProductForm((s) => ({ ...s, status: e.target.value }))}
            />
          ) : null}
          <button
            type="button"
            className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
            onClick={saveProduct}
            disabled={productSaving}
          >
            {productSaving ? 'در حال ذخیره...' : productFormMode === 'create' ? 'ایجاد' : 'ذخیره'}
          </button>
        </div>
      </Drawer>

      <Drawer open={!!confirmArchiveId} title="تایید Archive" onClose={() => setConfirmArchiveId('')}>
        <div className="text-sm text-text-secondary">آیا مطمئن هستید؟ این کار وضعیت محصول را archived می‌کند.</div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base" onClick={() => setConfirmArchiveId('')}>
            انصراف
          </button>
          <button
            type="button"
            className="rounded-xl bg-feedback-error px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
            onClick={() => archiveProductNow(confirmArchiveId)}
          >
            Archive
          </button>
        </div>
      </Drawer>

      <Drawer
        open={coverageDrawerOpen}
        title={coverageFormMode === 'create' ? 'ایجاد پوشش' : 'ویرایش پوشش'}
        onClose={() => setCoverageDrawerOpen(false)}
      >
        {!selectedProductId ? (
          <div className="text-sm text-text-secondary">ابتدا یک محصول انتخاب کنید.</div>
        ) : (
          <div className="grid gap-3">
            {coverageFormMode === 'create' ? (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="code"
                value={coverageForm.code}
                onChange={(e) => setCoverageForm((s) => ({ ...s, code: e.target.value }))}
              />
            ) : (
              <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-sm text-text-secondary">code: {coverageForm.code}</div>
            )}
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="nameFa"
              value={coverageForm.nameFa}
              onChange={(e) => setCoverageForm((s) => ({ ...s, nameFa: e.target.value }))}
            />
            {coverageFormMode === 'edit' ? (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="status (draft/active/archived)"
                value={coverageForm.status}
                onChange={(e) => setCoverageForm((s) => ({ ...s, status: e.target.value }))}
              />
            ) : null}
            <button
              type="button"
              className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
              onClick={saveCoverage}
              disabled={coverageSaving || !selectedProductId}
            >
              {coverageSaving ? 'در حال ذخیره...' : coverageFormMode === 'create' ? 'ایجاد' : 'ذخیره'}
            </button>
          </div>
        )}
      </Drawer>

      <Drawer open={!!confirmCoverageArchiveId} title="تایید Archive" onClose={() => setConfirmCoverageArchiveId('')}>
        <div className="text-sm text-text-secondary">آیا مطمئن هستید؟ این کار وضعیت پوشش را archived می‌کند.</div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base"
            onClick={() => setConfirmCoverageArchiveId('')}
          >
            انصراف
          </button>
          <button
            type="button"
            className="rounded-xl bg-feedback-error px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
            onClick={() => archiveCoverageNow(confirmCoverageArchiveId)}
          >
            Archive
          </button>
        </div>
      </Drawer>

      <Drawer
        open={deductibleDrawerOpen}
        title={deductibleFormMode === 'create' ? 'ایجاد فرانشیز' : 'ویرایش فرانشیز'}
        onClose={() => setDeductibleDrawerOpen(false)}
      >
        {!selectedProductId ? (
          <div className="text-sm text-text-secondary">ابتدا یک محصول انتخاب کنید.</div>
        ) : (
          <div className="grid gap-3">
            {deductibleFormMode === 'create' ? (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="code"
                value={deductibleForm.code}
                onChange={(e) => setDeductibleForm((s) => ({ ...s, code: e.target.value }))}
              />
            ) : (
              <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-sm text-text-secondary">code: {deductibleForm.code}</div>
            )}
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="nameFa"
              value={deductibleForm.nameFa}
              onChange={(e) => setDeductibleForm((s) => ({ ...s, nameFa: e.target.value }))}
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="kind (fixed_amount / percent)"
              value={deductibleForm.kind}
              onChange={(e) => setDeductibleForm((s) => ({ ...s, kind: e.target.value }))}
            />
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="value"
              value={deductibleForm.value}
              onChange={(e) => setDeductibleForm((s) => ({ ...s, value: e.target.value }))}
            />
            {deductibleFormMode === 'edit' ? (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="status (draft/active/archived)"
                value={deductibleForm.status}
                onChange={(e) => setDeductibleForm((s) => ({ ...s, status: e.target.value }))}
              />
            ) : null}
            <button
              type="button"
              className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
              onClick={saveDeductible}
              disabled={deductibleSaving || !selectedProductId}
            >
              {deductibleSaving ? 'در حال ذخیره...' : deductibleFormMode === 'create' ? 'ایجاد' : 'ذخیره'}
            </button>
          </div>
        )}
      </Drawer>

      <Drawer open={!!confirmDeductibleArchiveId} title="تایید Archive" onClose={() => setConfirmDeductibleArchiveId('')}>
        <div className="text-sm text-text-secondary">آیا مطمئن هستید؟ این کار وضعیت فرانشیز را archived می‌کند.</div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base"
            onClick={() => setConfirmDeductibleArchiveId('')}
          >
            انصراف
          </button>
          <button
            type="button"
            className="rounded-xl bg-feedback-error px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
            onClick={() => archiveDeductibleNow(confirmDeductibleArchiveId)}
          >
            Archive
          </button>
        </div>
      </Drawer>

      <Drawer
        open={pricingRuleDrawerOpen}
        title={pricingRuleFormMode === 'create' ? 'ایجاد Pricing Rule' : 'ویرایش Pricing Rule'}
        onClose={() => setPricingRuleDrawerOpen(false)}
      >
        {!selectedProductId ? (
          <div className="text-sm text-text-secondary">ابتدا یک محصول انتخاب کنید.</div>
        ) : (
          <div className="grid gap-3">
            {pricingRuleFormMode === 'create' ? (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="code"
                value={pricingRuleForm.code}
                onChange={(e) => setPricingRuleForm((s) => ({ ...s, code: e.target.value }))}
              />
            ) : (
              <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-sm text-text-secondary">code: {pricingRuleForm.code}</div>
            )}
            <input
              className="rounded-xl border px-3 py-2"
              placeholder="nameFa"
              value={pricingRuleForm.nameFa}
              onChange={(e) => setPricingRuleForm((s) => ({ ...s, nameFa: e.target.value }))}
            />
            {pricingRuleFormMode === 'edit' ? (
              <input
                className="rounded-xl border px-3 py-2"
                placeholder="status (draft/active/archived)"
                value={pricingRuleForm.status}
                onChange={(e) => setPricingRuleForm((s) => ({ ...s, status: e.target.value }))}
              />
            ) : null}
            <button
              type="button"
              className="rounded-xl bg-brand-primary px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
              onClick={savePricingRule}
              disabled={pricingRuleSaving || !selectedProductId}
            >
              {pricingRuleSaving ? 'در حال ذخیره...' : pricingRuleFormMode === 'create' ? 'ایجاد' : 'ذخیره'}
            </button>
          </div>
        )}
      </Drawer>

      <Drawer open={!!confirmPricingRuleArchiveId} title="تایید Archive" onClose={() => setConfirmPricingRuleArchiveId('')}>
        <div className="text-sm text-text-secondary">آیا مطمئن هستید؟ این کار وضعیت Rule را archived می‌کند.</div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-border-default bg-bg-base px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted hover:bg-bg-base"
            onClick={() => setConfirmPricingRuleArchiveId('')}
          >
            انصراف
          </button>
          <button
            type="button"
            className="rounded-xl bg-feedback-error px-3 py-2 text-sm text-text-on-brand hover:opacity-90"
            onClick={() => archivePricingRuleNow(confirmPricingRuleArchiveId)}
          >
            Archive
          </button>
        </div>
      </Drawer>
    </main>
    </div>
  );
}
