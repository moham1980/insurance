'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

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
      setError({ message: res.error.message, correlationId: res.correlationId });
    }

    setLoading(false);
  }

  return (
    <main className="p-6">
      <div>
        <h1 className="text-xl font-semibold">SANHAB / UniqueCode Inquiry (استعلام سنهاب)</h1>
        <p className="mt-1 text-sm text-neutral-600">استعلام چندکاناله و تولید Work Item در صورت مغایرت/تاخیر/خطای بالادستی</p>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="rounded-xl border px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="nationalId_uniqueCode">کد ملی + کد یکتا</option>
            <option value="policyNumber">شماره بیمه‌نامه</option>
            <option value="vin">VIN</option>
          </select>

          {mode === 'nationalId_uniqueCode' ? (
            <>
              <input className="rounded-xl border px-3 py-2" placeholder="nationalId" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              <input className="rounded-xl border px-3 py-2" placeholder="uniqueCode" value={uniqueCode} onChange={(e) => setUniqueCode(e.target.value)} />
            </>
          ) : null}

          {mode === 'policyNumber' ? (
            <input className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="policyNumber" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          ) : null}

          {mode === 'vin' ? (
            <input className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="vin" value={vin} onChange={(e) => setVin(e.target.value)} />
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? 'در حال استعلام...' : 'استعلام'}
          </button>
        </div>

        <div className="mt-3 text-xs text-neutral-600">
          <div>نمونه تست:</div>
          <div>uniqueCode شامل `MISMATCH` → نتیجه MISMATCH و ساخت WorkItem</div>
          <div>uniqueCode شامل `PENDING` → PENDING_SYNC و ساخت WorkItem</div>
          <div>uniqueCode شامل `UPSTREAM` → UPSTREAM_ERROR و ساخت WorkItem</div>
          <div>uniqueCode یا policyNumber یا vin برابر `404` → NOT_FOUND</div>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">resultCode: {result.resultCode}</div>
              <div className="mt-1 text-xs text-neutral-600">method: {result.method} | match: {String(result.match)}</div>
            </div>

            {result.workItemId ? (
              <a
                href={`/work-items?status=pending`}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                title={result.workItemId}
              >
                WorkItem ساخته شد
              </a>
            ) : null}
          </div>

          {result.workItemId ? (
            <div className="mt-3 rounded-xl border bg-neutral-50 p-3 text-xs">
              <div>workItemId: {result.workItemId}</div>
              {result.workItemSagaId ? <div className="mt-1">sagaId: {result.workItemSagaId}</div> : null}
            </div>
          ) : null}

          {result.workItemError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <div>WorkItem error: {JSON.stringify(result.workItemError)}</div>
            </div>
          ) : null}

          <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-neutral-50 p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </main>
  );
}
