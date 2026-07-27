'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { LoadingOverlay } from '@/components/loading-spinner';

type DocumentRow = {
  documentId: string;
  documentType: string;
  claimId: string;
  fileName: string;
  storageRef: string;
  mimeType: string | null;
  fileSize: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'documents:list');
  const canUpload = hasEnterprisePermission(perms, 'documents:upload');

  const [claimId, setClaimId] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    documentType: 'other',
    claimId: '',
  });

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (claimId) qs.set('claimId', claimId);

    const res = await apiFetch<DocumentRow[]>(`/documents${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success) setRows(res.data);
    else setError({ message: res.error.message, correlationId: res.correlationId });
    setLoading(false);
  }

  useEffect(() => {
    if (!canList) {
      router.replace('/forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file) {
      setError({ message: 'فایل را انتخاب کنید' });
      return;
    }

    if (!uploadForm.claimId) {
      setError({ message: 'claimId اجباری است' });
      return;
    }
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', uploadForm.documentType);
    formData.append('claimId', uploadForm.claimId);

    const res = await apiFetch<{ documentId: string }>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.success) {
      setShowUpload(false);
      setFile(null);
      setUploadForm({ documentType: 'other', claimId: '' });
      await load();
    } else {
      setError({ message: res.error.message, correlationId: res.correlationId });
    }
    setUploading(false);
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Documents (اسناد)</h1>
          <p className="mt-1 text-sm text-neutral-600">آپلود و مدیریت اسناد مرتبط با خسارت/بیمه‌گذار/بیمه‌نامه</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
          {canUpload ? (
            <button type="button" onClick={() => setShowUpload(true)} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800">
              + آپلود سند
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <input className="rounded-xl border px-3 py-2" placeholder="claimId" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
        <div />
        <div />
        <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={load} disabled={loading}>
          اعمال فیلتر
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      ) : null}

      {showUpload && canUpload ? (
        <div className="mt-6 rounded-2xl border p-4">
          <h3 className="font-semibold">آپلود سند جدید</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="file"
              className="rounded-xl border px-3 py-2 md:col-span-2"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <select className="rounded-xl border px-3 py-2" value={uploadForm.documentType} onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}>
              <option value="invoice">Invoice</option>
              <option value="medical_report">Medical Report</option>
              <option value="police_report">Police Report</option>
              <option value="photo">Photo</option>
              <option value="receipt">Receipt</option>
              <option value="other">Other</option>
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="claimId (required)" value={uploadForm.claimId} onChange={(e) => setUploadForm({ ...uploadForm, claimId: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={upload} disabled={uploading || !file} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50">
              {uploading ? 'در حال آپلود...' : 'آپلود'}
            </button>
            <button type="button" onClick={() => setShowUpload(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((d) => (
          <div key={d.documentId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">{d.fileName}</div>
                <div className="mt-1 text-xs text-neutral-600">type: {d.documentType} | status: {d.status}</div>
                <div className="mt-1 text-xs text-neutral-600">documentId: {d.documentId}</div>
                <div className="mt-1 text-xs text-neutral-600">claimId: {d.claimId}</div>
                <div className="mt-1 text-xs text-neutral-600">mime: {d.mimeType || '—'} | size: {typeof d.fileSize === 'number' ? `${(d.fileSize / 1024).toFixed(1)} KB` : '—'}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  ایجاد: {new Date(d.createdAt).toLocaleString('fa-IR')} | بروزرسانی: {new Date(d.updatedAt).toLocaleString('fa-IR')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                  onClick={() => window.open(`/documents/${d.documentId}/download`, '_blank')}
                >
                  دانلود
                </button>
                {(d.mimeType?.startsWith('image/') || d.mimeType === 'application/pdf') && (
                  <button
                    type="button"
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                    onClick={() => window.open(`/documents/${d.documentId}/preview`, '_blank')}
                  >
                    پیش‌نمایش
                  </button>
                )}
                {d.claimId && (
                  <button
                    type="button"
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                    onClick={() => router.push(`/claims/${d.claimId}`)}
                  >
                    مشاهده خسارت
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>
      <LoadingOverlay loading={loading} text="در حال بارگذاری اسناد..." />
    </main>
  );
}
