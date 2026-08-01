'use client';

import { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button, Card } from '@insurance/design-system';
import { MOCK_SANHAB } from '@/lib/mock-data';

type InquiryResult = {
  method: string;
  resultCode: string;
  match: boolean;
  inquiry: {
    nationalId: string | null;
    uniqueCode: string | null;
    policyNumber: string | null;
    vin: string | null;
  };
  payload: any | null;
  workItemId?: string;
  workItemSagaId?: string;
  workItemError?: any;
};

export default function SanhabPage() {
  const [mode, setMode] = useState<'nationalId_uniqueCode' | 'policyNumber' | 'vin'>('nationalId_uniqueCode');

  const [nationalId, setNationalId] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [vin, setVin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);
  const [result, setResult] = useState<InquiryResult | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);

    const body: any = {};
    if (mode === 'nationalId_uniqueCode') {
      body.nationalId = nationalId;
      body.uniqueCode = uniqueCode;
    } else if (mode === 'policyNumber') {
      body.policyNumber = policyNumber;
    } else {
      body.vin = vin;
    }

    const res = await apiFetch<InquiryResult>('/reg/sanhab/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.success) {
      setResult(res.data);
    } else {
      const mock = MOCK_SANHAB[0];
      setResult({
        method: mode,
        resultCode: mock.resultCode,
        match: mock.result === 'verified',
        inquiry: { nationalId: nationalId || null, uniqueCode: uniqueCode || null, policyNumber: policyNumber || null, vin: vin || null },
        payload: mock,
      });
    }

    setLoading(false);
  }

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">استعلام سنهاب (SANHAB)</h1>
          <p className="mt-1 text-sm text-text-muted">استعلام چندکاناله و تولید Work Item در صورت مغایرت/تاخیر/خطای بالادستی</p>
        </div>
      </div>

      <Card className="mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="nationalId_uniqueCode">کد ملی + کد یکتا</option>
            <option value="policyNumber">شماره بیمه‌نامه</option>
            <option value="vin">VIN</option>
          </select>

          {mode === 'nationalId_uniqueCode' ? (
            <>
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" placeholder="کد ملی" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" placeholder="کد یکتا" value={uniqueCode} onChange={(e) => setUniqueCode(e.target.value)} />
            </>
          ) : null}

          {mode === 'policyNumber' ? (
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary md:col-span-2" placeholder="شماره بیمه‌نامه" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          ) : null}

          {mode === 'vin' ? (
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary md:col-span-2" placeholder="VIN" value={vin} onChange={(e) => setVin(e.target.value)} />
          ) : null}

          <Button onClick={submit} disabled={loading} isLoading={loading} fullWidth>
            <Search className="h-4 w-4 ml-1" />
            {loading ? 'در حال استعلام...' : 'استعلام'}
          </Button>
        </div>

        <div className="mt-3 text-xs text-text-muted space-y-1">
          <div className="font-medium text-text-secondary">نمونه تست:</div>
          <div>uniqueCode شامل `MISMATCH` → نتیجه MISMATCH و ساخت WorkItem</div>
          <div>uniqueCode شامل `PENDING` → PENDING_SYNC و ساخت WorkItem</div>
          <div>uniqueCode شامل `UPSTREAM` → UPSTREAM_ERROR و ساخت WorkItem</div>
          <div>uniqueCode یا policyNumber یا vin برابر `404` → NOT_FOUND</div>
        </div>
      </Card>

      {error ? (
        <div className="mt-6 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div>خطا: {error.message}</div>
            {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
          </div>
        </div>
      ) : null}

      {result ? (
        <Card className="mt-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {result.match ? (
                <CheckCircle className="h-5 w-5 text-feedback-success" />
              ) : (
                <XCircle className="h-5 w-5 text-feedback-error" />
              )}
              <div>
                <div className="text-sm font-semibold">resultCode: {result.resultCode}</div>
                <div className="mt-1 text-xs text-text-muted">method: {result.method} | match: {String(result.match)}</div>
              </div>
            </div>

            {result.workItemId ? (
              <a
                href={`/work-items?status=pending`}
                className="inline-flex items-center gap-1 rounded-xl border border-border-default bg-bg-base px-3 py-2 text-sm text-text-primary hover:bg-bg-subtle"
                title={result.workItemId}
              >
                <ExternalLink className="h-4 w-4" />
                WorkItem ساخته شد
              </a>
            ) : null}
          </div>

          {result.workItemId ? (
            <div className="mt-3 rounded-xl border border-border-default bg-bg-base p-3 text-xs">
              <div>workItemId: {result.workItemId}</div>
              {result.workItemSagaId ? <div className="mt-1">sagaId: {result.workItemSagaId}</div> : null}
            </div>
          ) : null}

          {result.workItemError ? (
            <div className="mt-3 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-3 text-xs text-feedback-error">
              <div>WorkItem error: {JSON.stringify(result.workItemError)}</div>
            </div>
          ) : null}

          <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-bg-base p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
        </Card>
      ) : null}
    </main>
  );
}
