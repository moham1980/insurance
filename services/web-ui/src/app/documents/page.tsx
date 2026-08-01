'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, RefreshCw, Upload, Search, Download, Eye, AlertCircle, CheckCircle, Clock, FileCheck, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { LoadingOverlay } from '@/components/loading-spinner';
import { Button, Card, StatCard } from '@insurance/design-system';
import { MOCK_DOCUMENTS } from '@/lib/mock-data';

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
    else {
      setError({ message: res.error.message, correlationId: res.correlationId });
      setRows(MOCK_DOCUMENTS as unknown as DocumentRow[]);
    }
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

  const statusBadge = (s: string) => {
    const cfg: Record<string, { bg: string; text: string; icon: any }> = {
      processed: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', icon: CheckCircle },
      pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', icon: Clock },
      rejected: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', icon: XCircle },
      uploaded: { bg: 'bg-feedback-info-subtle', text: 'text-feedback-info', icon: FileCheck },
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
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">اسناد</h1>
            <p className="mt-1 text-sm text-text-muted">آپلود و مدیریت اسناد مرتبط با خسارت/بیمه‌گذار/بیمه‌نامه</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی
          </Button>
          {canUpload ? (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 ml-1" />
              آپلود سند
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="کل اسناد" value={rows.length} icon={FileText} />
        <StatCard title="پردازش‌شده" value={rows.filter((r) => r.status === 'processed').length} changeType="positive" change="تکمیل‌شده" icon={CheckCircle} />
        <StatCard title="در انتظار" value={rows.filter((r) => r.status === 'pending').length} changeType="warning" change="در انتظار" icon={Clock} />
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="grid flex-1 gap-1 text-sm">
          <span className="text-xs text-text-muted">فیلتر: Claim ID</span>
          <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" placeholder="claimId" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
        </label>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <Search className="h-4 w-4 ml-1" />
          اعمال فیلتر
        </Button>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div>خطا: {error.message}</div>
            {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
          </div>
        </div>
      ) : null}

      {showUpload && canUpload ? (
        <Card className="mt-6 p-4">
          <h3 className="font-semibold">آپلود سند جدید</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="file"
              className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary md:col-span-2"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <select className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" value={uploadForm.documentType} onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}>
              <option value="invoice">فاکتور</option>
              <option value="medical_report">گزارش پزشکی</option>
              <option value="police_report">گزارش پلیس</option>
              <option value="photo">تصویر</option>
              <option value="receipt">رسید</option>
              <option value="other">سایر</option>
            </select>
            <input className="rounded-xl border border-border-default bg-bg-raised px-3 py-2 text-text-primary" placeholder="claimId (اجباری)" value={uploadForm.claimId} onChange={(e) => setUploadForm({ ...uploadForm, claimId: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={upload} disabled={uploading || !file} isLoading={uploading}>
              {uploading ? 'در حال آپلود...' : 'آپلود'}
            </Button>
            <Button variant="ghost" onClick={() => setShowUpload(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((d) => (
          <Card key={d.documentId} className="p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{d.fileName}</div>
                  {statusBadge(d.status)}
                </div>
                <div className="mt-1 text-xs text-text-muted">type: {d.documentType}</div>
                <div className="mt-1 text-xs text-text-muted">documentId: {d.documentId}</div>
                <div className="mt-1 text-xs text-text-muted">claimId: {d.claimId}</div>
                <div className="mt-1 text-xs text-text-muted">mime: {d.mimeType || '—'} | size: {typeof d.fileSize === 'number' ? `${(d.fileSize / 1024).toFixed(1)} KB` : '—'}</div>
                <div className="mt-1 text-xs text-text-muted">
                  ایجاد: {new Date(d.createdAt).toLocaleString('fa-IR')} | بروزرسانی: {new Date(d.updatedAt).toLocaleString('fa-IR')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => window.open(`/documents/${d.documentId}/download`, '_blank')}>
                  <Download className="h-4 w-4 ml-1" />
                  دانلود
                </Button>
                {(d.mimeType?.startsWith('image/') || d.mimeType === 'application/pdf') && (
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/documents/${d.documentId}/preview`, '_blank')}>
                    <Eye className="h-4 w-4 ml-1" />
                    پیش‌نمایش
                  </Button>
                )}
                {d.claimId && (
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/claims/${d.claimId}`)}>
                    مشاهده خسارت
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-text-muted text-center py-8">موردی یافت نشد.</div> : null}
      </div>
      <LoadingOverlay loading={loading} text="در حال بارگذاری اسناد..." />
    </main>
  );
}
