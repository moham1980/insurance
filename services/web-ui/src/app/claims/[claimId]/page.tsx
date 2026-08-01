'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { MOCK_CLAIM_DETAIL, MOCK_CLAIM_DOCUMENTS, MOCK_CLAIM_PAYMENTS, MOCK_CLAIM_EVENTS } from '@/lib/mock-data';

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
    const res = await apiFetch<ClaimDetail>(`/rm/claims/${encodeURIComponent(claimId)}`);
    if (res.success) {
      setClaim(res.data);
    } else {
      setClaim(MOCK_CLAIM_DETAIL as unknown as ClaimDetail);
    }
    setLoading(false);
  }

  async function loadDocuments() {
    if (!claim) return;
    setTabLoading(true);
    const res = await apiFetch<ClaimDocument[]>(`/documents?claimId=${encodeURIComponent(claim.claimId)}`);
    if (res.success) setDocuments(res.data);
    else setDocuments(MOCK_CLAIM_DOCUMENTS as unknown as ClaimDocument[]);
    setTabLoading(false);
  }

  async function loadPayments() {
    if (!claim) return;
    setTabLoading(true);
    const res = await apiFetch<ClaimPayment[]>(`/payments?claimId=${encodeURIComponent(claim.claimId)}`);
    if (res.success) setPayments(res.data);
    else setPayments(MOCK_CLAIM_PAYMENTS as unknown as ClaimPayment[]);
    setTabLoading(false);
  }

  async function loadEvents() {
    if (!claim) return;
    setTabLoading(true);
    const res = await apiFetch<ClaimEvent[]>(`/claims/${encodeURIComponent(claim.claimId)}/events?limit=50`);
    if (res.success) setEvents(res.data);
    else setEvents(MOCK_CLAIM_EVENTS as unknown as ClaimEvent[]);
    setTabLoading(false);
  }

  if (loading) {
    return (
      <main className="p-6">
        <div className="text-sm text-text-muted">در حال بارگذاری...</div>
      </main>
    );
  }

  if (!claim) {
    return (
      <main className="p-6">
        <div className="text-sm text-text-muted">خسارت یافت نشد.</div>
      </main>
    );
  }

  const statusColor: Record<string, string> = {
    registered: 'bg-brand-primary-subtle text-brand-primary',
    assessed: 'bg-feedback-warning-subtle text-feedback-warning',
    approved: 'bg-feedback-success-subtle text-feedback-success',
    rejected: 'bg-feedback-error-subtle text-feedback-error',
    paid: 'bg-feedback-success-subtle text-feedback-success',
    closed: 'bg-bg-base text-text-secondary',
  };

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">جزئیات خسارت</h1>
          <p className="mt-1 text-sm text-text-muted">{claim.claimNumber}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/claims')}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
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
              ? 'bg-brand-primary text-text-on-brand'
              : 'border hover:bg-bg-base'
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
                ? 'bg-brand-primary text-text-on-brand'
                : 'border hover:bg-bg-base'
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
                ? 'bg-brand-primary text-text-on-brand'
                : 'border hover:bg-bg-base'
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
              ? 'bg-brand-primary text-text-on-brand'
              : 'border hover:bg-bg-base'
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
                <span className="text-text-muted">شناسه:</span>
                <span>{claim.claimId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">شماره:</span>
                <span>{claim.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">وضعیت:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[claim.status] || 'bg-bg-base text-text-secondary'}`}>
                  {claim.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">نوع خسارت:</span>
                <span>{claim.lossType || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">تاریخ خسارت:</span>
                <span>{claim.lossDate || '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">اتکایی</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">قرارداد:</span>
                <span className="text-right break-all">{claim.riContractId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">RecoveryId:</span>
                <span className="text-right break-all">{claim.riLastRecoveryId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">مبلغ قابل بازیافت:</span>
                <span>
                  {claim.riRecoverableAmount ? Number(claim.riRecoverableAmount).toLocaleString() : '—'}
                  {claim.riCurrency ? ` ${claim.riCurrency}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">مبلغ وصول‌شده:</span>
                <span>
                  {claim.riRecoveredAmount ? Number(claim.riRecoveredAmount).toLocaleString() : '—'}
                  {claim.riCurrency ? ` ${claim.riCurrency}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">آخرین شناسایی:</span>
                <span>{claim.riLastIdentifiedAt ? new Date(claim.riLastIdentifiedAt).toLocaleString('fa-IR') : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">آخرین دریافت:</span>
                <span>{claim.riLastReceivedAt ? new Date(claim.riLastReceivedAt).toLocaleString('fa-IR') : '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">اطلاعات بیمه‌نامه و بیمه‌گذار</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">شناسه بیمه‌نامه:</span>
                <span>{claim.policyId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">شناسه بیمه‌گذار:</span>
                <span>{claim.claimantPartyId || '—'}</span>
              </div>
              {claim.requiresHumanTriage !== null && (
                <div className="flex justify-between">
                  <span className="text-text-muted">نیاز به بررسی انسانی:</span>
                  <span>{claim.requiresHumanTriage ? 'بله' : 'خیر'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">مبالغ</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">مبلغ ارزیابی شده:</span>
                <span>{typeof claim.assessedAmount === 'number' ? claim.assessedAmount.toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">مبلغ تأیید شده:</span>
                <span>{typeof claim.approvedAmount === 'number' ? claim.approvedAmount.toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold text-sm">زمان‌ها</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">ایجاد:</span>
                <span>{new Date(claim.createdAt).toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">بروزرسانی:</span>
                <span>{new Date(claim.updatedAt).toLocaleString('fa-IR')}</span>
              </div>
            </div>
          </div>

          {claim.description && (
            <div className="rounded-2xl border p-4 md:col-span-2">
              <h3 className="font-semibold text-sm">شرح خسارت</h3>
              <p className="mt-2 text-sm text-text-secondary">{claim.description}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="mt-6">
          {tabLoading ? (
            <div className="text-sm text-text-muted">در حال بارگذاری اسناد...</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.documentId} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{doc.fileName}</div>
                      <div className="mt-1 text-xs text-text-muted">
                        {doc.documentType} | {(doc.fileSize / 1024).toFixed(1)} KB | {doc.mimeType}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        توسط {doc.uploadedBy} در {new Date(doc.uploadedAt).toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-base"
                      onClick={() => window.open(`/documents/${doc.documentId}/download`, '_blank')}
                    >
                      دانلود
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && <div className="text-sm text-text-muted">موردی یافت نشد.</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="mt-6">
          {tabLoading ? (
            <div className="text-sm text-text-muted">در حال بارگذاری پرداخت‌ها...</div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.paymentIntentId} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{payment.paymentIntentId}</div>
                      <div className="mt-1 text-xs text-text-muted">
                        {payment.amount.toLocaleString()} {payment.currency} | {payment.status}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        ایجاد: {new Date(payment.createdAt).toLocaleString('fa-IR')}
                      </div>
                      {payment.executedAt && (
                        <div className="mt-1 text-xs text-text-muted">
                          اجرا: {new Date(payment.executedAt).toLocaleString('fa-IR')}
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      payment.status === 'executed' ? 'bg-feedback-success-subtle text-feedback-success' :
                      payment.status === 'failed' ? 'bg-feedback-error-subtle text-feedback-error' :
                      'bg-feedback-warning-subtle text-feedback-warning'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
              {payments.length === 0 && <div className="text-sm text-text-muted">موردی یافت نشد.</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="mt-6">
          {tabLoading ? (
            <div className="text-sm text-text-muted">در حال بارگذاری زمان‌بندی...</div>
          ) : (
            <div className="space-y-3">
              {events.map((event, idx) => (
                <div key={event.eventId} className="rounded-2xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-2 w-2 rounded-full bg-border-default" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{event.eventType}</div>
                      <div className="mt-1 text-xs text-text-muted">
                        {new Date(event.occurredAt).toLocaleString('fa-IR')}
                      </div>
                      {event.correlationId && (
                        <div className="mt-1 text-xs text-text-muted">
                          correlationId: {event.correlationId}
                        </div>
                      )}
                      {event.eventData && typeof event.eventData === 'object' && (
                        <details className="mt-2">
                          <summary className="text-xs text-text-muted cursor-pointer">داده‌های رویداد</summary>
                          <pre className="mt-1 text-xs bg-bg-base p-2 rounded overflow-auto">
                            {JSON.stringify(event.eventData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="text-sm text-text-muted">موردی یافت نشد.</div>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
