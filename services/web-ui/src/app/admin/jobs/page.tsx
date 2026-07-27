'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type JobRow = {
  jobId: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload: any;
  result: any;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  correlationId?: string;
};

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-neutral-100 text-neutral-700',
};

const priorityColor: Record<string, string> = {
  low: 'bg-neutral-100 text-neutral-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-rose-100 text-rose-600',
};

function Drawer(props: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border bg-white p-4 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[520px] md:rounded-none md:border-l">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div className="text-sm font-semibold">{props.title}</div>
          <button type="button" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" onClick={props.onClose}>
            بستن
          </button>
        </div>
        <div className="pt-4">{props.children}</div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<JobRow[]>([]);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canList = hasEnterprisePermission(perms, 'admin:users:view'); // Using admin permission
  const canCreate = hasEnterprisePermission(perms, 'admin:users:create');
  const canCancel = hasEnterprisePermission(perms, 'admin:users:update');
  const canRetry = hasEnterprisePermission(perms, 'admin:users:update');

  const [status, setStatus] = useState('');
  const [jobType, setJobType] = useState('');
  const [q, setQ] = useState('');

  const [jobDrawerOpen, setJobDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (jobType) qs.set('jobType', jobType);
    if (q) qs.set('q', q);

    const res = await apiFetch<JobRow[]>(`/admin/jobs${qs.toString() ? `?${qs.toString()}` : ''}`);
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

  function openJobDetail(job: JobRow) {
    setSelectedJob(job);
    setJobDrawerOpen(true);
  }

  async function cancelJob(jobId: string) {
    if (!canCancel) return;
    const res = await apiFetch(`/admin/jobs/${jobId}/cancel`, {
      method: 'POST',
    });
    if (res.success) await load();
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  async function retryJob(jobId: string) {
    if (!canRetry) return;
    const res = await apiFetch(`/admin/jobs/${jobId}/retry`, {
      method: 'POST',
    });
    if (res.success) await load();
    else setError({ message: res.error.message, correlationId: res.correlationId });
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">مدیریت کارهای پس‌زمینه</h1>
          <p className="mt-1 text-sm text-neutral-600">مشاهده، مدیریت و ردیابی کارهای پس‌زمینه</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" disabled={loading}>
            بروزرسانی
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <select className="rounded-xl border bg-white px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="running">در حال اجرا</option>
          <option value="completed">تکمیل شده</option>
          <option value="failed">ناموفق</option>
          <option value="cancelled">لغو شده</option>
        </select>
        <select className="rounded-xl border bg-white px-3 py-2" value={jobType} onChange={(e) => setJobType(e.target.value)}>
          <option value="">همه انواع</option>
          <option value="document_processing">پردازش سند</option>
          <option value="report_generation">تولید گزارش</option>
          <option value="data_export">خروجی داده</option>
          <option value="notification">ارسال اعلان</option>
          <option value="payment_processing">پردازش پرداخت</option>
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="جستجو (jobId, correlationId)" value={q} onChange={(e) => setQ(e.target.value)} />
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

      <div className="mt-6 space-y-3">
        {rows.map((job) => (
          <div key={job.jobId} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{job.jobType}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[job.status] || 'bg-neutral-100 text-neutral-700'}`}>
                    {job.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${priorityColor[job.priority] || 'bg-neutral-100 text-neutral-600'}`}>
                    {job.priority}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  jobId: {job.jobId}
                  {job.correlationId && ` | correlationId: ${job.correlationId}`}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  تلاش‌ها: {job.retryCount}/{job.maxRetries}
                </div>
                <div className="mt-1 text-xs text-neutral-600">
                  زمان‌بندی: {new Date(job.scheduledAt).toLocaleString('fa-IR')}
                  {job.startedAt && ` | شروع: ${new Date(job.startedAt).toLocaleString('fa-IR')}`}
                  {job.completedAt && ` | پایان: ${new Date(job.completedAt).toLocaleString('fa-IR')}`}
                </div>
                {job.error && (
                  <div className="mt-1 text-xs text-rose-600">
                    خطا: {job.error}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openJobDetail(job)}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  جزئیات
                </button>
                {(job.status === 'pending' || job.status === 'running') && canCancel && (
                  <button
                    type="button"
                    onClick={() => cancelJob(job.jobId)}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    لغو
                  </button>
                )}
                {job.status === 'failed' && canRetry && (
                  <button
                    type="button"
                    onClick={() => retryJob(job.jobId)}
                    className="rounded-xl border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    تلاش مجدد
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 ? <div className="text-sm text-neutral-600">موردی یافت نشد.</div> : null}
      </div>

      <Drawer open={jobDrawerOpen} title="جزئیات کار" onClose={() => setJobDrawerOpen(false)}>
        {selectedJob && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Job ID:</span>
                <span className="font-mono">{selectedJob.jobId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">نوع:</span>
                <span>{selectedJob.jobType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">وضعیت:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[selectedJob.status]}`}>
                  {selectedJob.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">اولویت:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${priorityColor[selectedJob.priority]}`}>
                  {selectedJob.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">تلاش‌ها:</span>
                <span>{selectedJob.retryCount}/{selectedJob.maxRetries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">ایجاد توسط:</span>
                <span>{selectedJob.createdBy}</span>
              </div>
              {selectedJob.correlationId && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Correlation ID:</span>
                  <span className="font-mono">{selectedJob.correlationId}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold">Payload</label>
              <pre className="mt-1 rounded-xl border bg-neutral-50 p-3 text-xs overflow-auto max-h-40">
                {JSON.stringify(selectedJob.payload, null, 2)}
              </pre>
            </div>

            {selectedJob.result && (
              <div>
                <label className="text-sm font-semibold">Result</label>
                <pre className="mt-1 rounded-xl border bg-neutral-50 p-3 text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedJob.result, null, 2)}
                </pre>
              </div>
            )}

            {selectedJob.error && (
              <div>
                <label className="text-sm font-semibold text-rose-600">Error</label>
                <div className="mt-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {selectedJob.error}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </main>
  );
}
