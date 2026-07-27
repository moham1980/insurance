'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type ClaimDetail = {
  claimId: string;
  claimNumber: string;
  policyId: string;
  claimantPartyId?: string;
  lossDate?: string;
  lossType?: string;
  status: string;
  description?: string | null;
  assessedAmount?: number | null;
  approvedAmount?: number | null;
  requiresHumanTriage?: boolean | null;
  createdAt: string;
  updatedAt: string;
  lastEventId?: string | null;
  riContractId?: string | null;
  riLastRecoveryId?: string | null;
  riRecoverableAmount?: string | null;
  riRecoveredAmount?: string | null;
  riCurrency?: string | null;
  riLastIdentifiedAt?: string | null;
  riLastReceivedAt?: string | null;
};

type ClaimDocument = {
  documentId: string;
  claimId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
};

type ClaimPayment = {
  paymentIntentId: string;
  claimId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  executedAt?: string;
};

type ClaimEvent = {
  eventId: string;
  eventType: string;
  eventData: any;
  occurredAt: string;
  correlationId?: string;
};

export default function ClaimDetailPage({ params }: { params: { claimId: string } }) {
  const router = useRouter();
  const { claimId } = params;
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<{ message: string; correlationId?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'payments' | 'timeline'>('overview');
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [payments, setPayments] = useState<ClaimPayment[]>([]);
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const perms = enterprisePermissionsForRoles(getAuthUser()?.roles);
  const canView = hasEnterprisePermission(perms, 'rm:claims:view');
  const canViewDocuments = hasEnterprisePermission(perms, 'documents:list');
  const canViewPayments = hasEnterprisePermission(perms, 'payments:list');

  useEffect(() => {
    if (!canView) {
      router.replace('/forbidden');
      return;
    }
    loadClaim();
  }, [claimId]);

  useEffect(() => {
    if (claim) {
      if (activeTab === 'documents' && canViewDocuments) loadDocuments();
      if (activeTab === 'payments' && canViewPayments) loadPayments();
      if (activeTab === 'timeline') loadEvents();
    }
  }, [activeTab, claim]);

  async function loadClaim() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<ClaimDetail>(`/rm/claims/${encodeURIComponent(claimId)}`);
    if (res.success) {
      setClaim(res.data);
    } else {
      setError({ message: res.error.message, correlationId: res.correlationId });
    }
    setLoading(false);
  }

  async function loadDocuments() {
    if (!claim) return;
    setTabLoading(true);
    const res = await apiFetch<ClaimDocument[]>(`/documents?claimId=${encodeURIComponent(claim.claimId)}`);
    if (res.success) setDocuments(res.data);
    setTabLoading(false);
  }

  async function loadPayments() {
    if (!claim) return;
    setTabLoading(true);
    const res = await apiFetch<ClaimPayment[]>(`/payments?claimId=${encodeURIComponent(claim.claimId)}`);
    if (res.success) setPayments(res.data);
    setTabLoading(false);
  }

  async function loadEvents() {
    if (!claim) return;
    setTabLoading(true);
    const res = await apiFetch<ClaimEvent[]>(`/claims/${encodeURIComponent(claim.claimId)}/events?limit=50`);
    if (res.success) setEvents(res.data);
    setTabLoading(false);
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="text-sm text-neutral-600">در حال بارگذاری...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div>خطا: {error.message}</div>
          {error.correlationId ? <div className="mt-1 text-xs">correlationId: {error.correlationId}</div> : null}
        </div>
      </main>
    );
  }

  if (!claim) {
    return (
      <main className="p-6">
        <div className="text-sm text-neutral-600">خسارت یافت نشد.</div>
      </main>
    );
  }

  const statusColor: Record<string, string> = {
    registered: 'bg-blue-100 text-blue-700',
    assessed: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    paid: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-neutral-100 text-neutral-700',
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">جزئیات خسارت</h1>
          <p className="mt-1 text-sm text-neutral-600">{claim.claimNumber}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/claims')}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          بازگشت به لیست
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`rounded-xl px-3 py-2 text-sm ${
            activeTab === 'overview'
              ? 'bg-neutral-900 text-white'
              : 'border hover:bg-neutral-50'
          }`}
        >
          نمای کلی
        </button>
        {canViewDocuments && (
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`rounded-xl px-3 py-2 text-sm ${
              activeTab === 'documents'
                ? 'bg-neutral-900 text-white'
                : 'border hover:bg-neutral-50'
            }`}
          >
            اسناد ({documents.length})
          </button>
        )}
        {canViewPayments && (
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`rounded-xl px-3 py-2 text-sm ${
              activeTab === 'payments'
                ? 'bg-neutral-900 text-white'
                : 'border hover:bg-neutral-50'
            }`}
          >
            پرداخت‌ها ({payments.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`rounded-xl px-3 py-2 text-sm ${
            activeTab === 'timeline'
              ? 'bg-neutral-900 text-white'
              : 'border hover:bg-neutral-50'
          }`}
        >
          زمان‌بندی ({events.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">اطلاعات اصلی</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">شناسه:</span>
                <span>{claim.claimId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">شماره:</span>
                <span>{claim.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">وضعیت:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[claim.status] || 'bg-neutral-100 text-neutral-700'}`}>
                  {claim.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">نوع خسارت:</span>
                <span>{claim.lossType || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">تاریخ خسارت:</span>
                <span>{claim.lossDate || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">اتکایی</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">قرارداد:</span>
                <span className="text-right break-all">{claim.riContractId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">RecoveryId:</span>
                <span className="text-right break-all">{claim.riLastRecoveryId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">مبلغ قابل بازیافت:</span>
                <span>
                  {claim.riRecoverableAmount ? Number(claim.riRecoverableAmount).toLocaleString() : '—'}
                  {claim.riCurrency ? ` ${claim.riCurrency}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">مبلغ وصول‌شده:</span>
                <span>
                  {claim.riRecoveredAmount ? Number(claim.riRecoveredAmount).toLocaleString() : '—'}
                  {claim.riCurrency ? ` ${claim.riCurrency}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">آخرین شناسایی:</span>
                <span>{claim.riLastIdentifiedAt ? new Date(claim.riLastIdentifiedAt).toLocaleString('fa-IR') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">آخرین دریافت:</span>
                <span>{claim.riLastReceivedAt ? new Date(claim.riLastReceivedAt).toLocaleString('fa-IR') : '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">اطلاعات بیمه‌نامه و بیمه‌گذار</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">شناسه بیمه‌نامه:</span>
                <span>{claim.policyId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">شناسه بیمه‌گذار:</span>
                <span>{claim.claimantPartyId || '—'}</span>
              </div>
              {claim.requiresHumanTriage !== null && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">نیاز به بررسی انسانی:</span>
                  <span>{claim.requiresHumanTriage ? 'بله' : 'خیر'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">مبالغ</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">مبلغ ارزیابی شده:</span>
                <span>{typeof claim.assessedAmount === 'number' ? claim.assessedAmount.toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">مبلغ تأیید شده:</span>
                <span>{typeof claim.approvedAmount === 'number' ? claim.approvedAmount.toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">زمان‌ها</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">ایجاد:</span>
                <span>{new Date(claim.createdAt).toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">بروزرسانی:</span>
                <span>{new Date(claim.updatedAt).toLocaleString('fa-IR')}</span>
              </div>
            </div>
          </div>

          {claim.description && (
            <div className="rounded-2xl border p-4 md:col-span-2">
              <h3 className="font-semibold text-sm">شرح خسارت</h3>
              <p className="mt-2 text-sm text-neutral-700">{claim.description}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="mt-6">
          {tabLoading ? (
            <div className="text-sm text-neutral-600">در حال بارگذاری اسناد...</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.documentId} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{doc.fileName}</div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {doc.documentType} | {(doc.fileSize / 1024).toFixed(1)} KB | {doc.mimeType}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        توسط {doc.uploadedBy} در {new Date(doc.uploadedAt).toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={() => window.open(`/documents/${doc.documentId}/download`, '_blank')}
                    >
                      دانلود
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && <div className="text-sm text-neutral-600">موردی یافت نشد.</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="mt-6">
          {tabLoading ? (
            <div className="text-sm text-neutral-600">در حال بارگذاری پرداخت‌ها...</div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.paymentIntentId} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{payment.paymentIntentId}</div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {payment.amount.toLocaleString()} {payment.currency} | {payment.status}
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">
                        ایجاد: {new Date(payment.createdAt).toLocaleString('fa-IR')}
                      </div>
                      {payment.executedAt && (
                        <div className="mt-1 text-xs text-neutral-600">
                          اجرا: {new Date(payment.executedAt).toLocaleString('fa-IR')}
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      payment.status === 'executed' ? 'bg-emerald-100 text-emerald-700' :
                      payment.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
              {payments.length === 0 && <div className="text-sm text-neutral-600">موردی یافت نشد.</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="mt-6">
          {tabLoading ? (
            <div className="text-sm text-neutral-600">در حال بارگذاری زمان‌بندی...</div>
          ) : (
            <div className="space-y-3">
              {events.map((event, idx) => (
                <div key={event.eventId} className="rounded-2xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-2 w-2 rounded-full bg-neutral-400" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{event.eventType}</div>
                      <div className="mt-1 text-xs text-neutral-600">
                        {new Date(event.occurredAt).toLocaleString('fa-IR')}
                      </div>
                      {event.correlationId && (
                        <div className="mt-1 text-xs text-neutral-600">
                          correlationId: {event.correlationId}
                        </div>
                      )}
                      {event.eventData && typeof event.eventData === 'object' && (
                        <details className="mt-2">
                          <summary className="text-xs text-neutral-600 cursor-pointer">داده‌های رویداد</summary>
                          <pre className="mt-1 text-xs bg-neutral-50 p-2 rounded overflow-auto">
                            {JSON.stringify(event.eventData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="text-sm text-neutral-600">موردی یافت نشد.</div>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
