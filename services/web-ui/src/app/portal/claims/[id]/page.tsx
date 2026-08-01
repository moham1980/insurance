'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronRight, Loader2, Download, Printer, FileText } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

interface ClaimDetail {
  id: string;
  claimNumber: string;
  policyNumber: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedDate: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
  incidentDate: string;
  incidentTime: string;
  location: string;
  description: string;
  contactPhone: string;
  documents: Array<{
    id: string;
    name: string;
    uploadDate: string;
  }>;
  timeline: Array<{
    date: string;
    status: string;
    description: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    reference: string;
  }>;
}

const MOCK_CLAIM: ClaimDetail = {
  id: '1',
  claimNumber: 'CLM-2024-001',
  policyNumber: 'POL-2024-001',
  status: 'UNDER_REVIEW',
  submittedDate: '2024-03-10',
  claimType: 'آتش‌سوزی',
  amount: 2000000,
  incidentDate: '2024-03-09',
  incidentTime: '14:30',
  location: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
  description: 'آتش‌سوزی ناشی از اتصال برق در موتور خودرو',
  contactPhone: '09121234567',
  documents: [
    { id: '1', name: 'عکس خودرو.jpg', uploadDate: '2024-03-10' },
    { id: '2', name: 'گزارش آتش‌نشانی.pdf', uploadDate: '2024-03-10' },
  ],
  timeline: [
    { date: '2024-03-10', status: 'ثبت شده', description: 'ثبت اولیه خسارت' },
    { date: '2024-03-11', status: 'در حال بررسی', description: 'ارسال به کارشناس' },
    { date: '2024-03-12', status: 'در حال بررسی', description: 'در انتظار تأیید مدیر' },
  ],
  payments: [],
};

export default function ClaimDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      loadClaimDetail();
    }
  }, [params?.id]);

  const loadClaimDetail = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<ClaimDetail>(`/portal/claims/${params?.id}`);
      setClaim(res.success && res.data ? res.data : MOCK_CLAIM);
    } catch {
      setClaim(MOCK_CLAIM);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SUBMITTED: 'bg-brand-primary-subtle text-brand-primary',
      UNDER_REVIEW: 'bg-feedback-warning-subtle text-feedback-warning',
      APPROVED: 'bg-feedback-success-subtle text-feedback-success',
      REJECTED: 'bg-feedback-error-subtle text-feedback-error',
      PAID: 'bg-feedback-success-subtle text-feedback-success',
    };
    const labels = {
      SUBMITTED: 'ثبت شده',
      UNDER_REVIEW: 'در حال بررسی',
      APPROVED: 'تأیید شده',
      REJECTED: 'رد شده',
      PAID: 'پرداخت شده',
    };
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-bg-base" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-text-muted text-center">خسارت یافت نشد</p>
          <button
            onClick={() => router.push('/portal/claims')}
            className="mt-4 mx-auto block px-4 py-2 bg-brand-primary text-text-on-brand rounded-lg hover:opacity-90"
          >
            بازگشت به لیست
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/portal/claims')} className="text-text-muted hover:text-text-primary">
                <ChevronRight className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-text-primary">جزئیات خسارت</h1>
            </div>
            {getStatusBadge(claim.status)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Information */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">اطلاعات خسارت</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-text-muted">شماره خسارت</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.claimNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">شماره بیمه‌نامه</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.policyNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">نوع خسارت</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.claimType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">تاریخ ثبت</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.submittedDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">مبلغ درخواست</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.amount.toLocaleString('fa-IR')} ریال</dd>
                  </div>
                  {claim.approvedAmount && (
                    <div>
                      <dt className="text-sm font-medium text-text-muted">مبلغ تأیید شده</dt>
                      <dd className="mt-1 text-sm text-text-primary">{claim.approvedAmount.toLocaleString('fa-IR')} ریال</dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>

            {/* Incident Details */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">جزئیات وقوع</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-text-muted">تاریخ وقوع</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.incidentDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">ساعت وقوع</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.incidentTime}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-text-muted">مکان وقوع</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.location}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-text-muted">شرح خسارت</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">شماره تماس</dt>
                    <dd className="mt-1 text-sm text-text-primary">{claim.contactPhone}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* Documents */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">مدارک پیوست</h2>
              </div>
              <div className="p-6">
                {claim.documents.length === 0 ? (
                  <p className="text-sm text-text-muted">مدرکی پیوست نشده است</p>
                ) : (
                  <ul className="divide-y divide-border-default">
                    {claim.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-text-muted" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{doc.name}</p>
                            <p className="text-xs text-text-muted">{doc.uploadDate}</p>
                          </div>
                        </div>
                        <button className="flex items-center gap-1 text-sm text-brand-primary hover:underline">
                          <Download className="h-4 w-4" />
                          دانلود
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">تاریخچه</h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {claim.timeline.map((item, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-brand-primary mt-2"></div>
                      </div>
                      <div className="mr-4">
                        <p className="text-sm font-medium text-text-primary">{item.status}</p>
                        <p className="text-xs text-text-muted">{item.date}</p>
                        <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Payments */}
            {claim.payments.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-border-default">
                  <h2 className="text-base font-semibold text-text-primary">پرداخت‌ها</h2>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-default">
                      <thead className="bg-bg-base">
                        <tr>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">مبلغ</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ پرداخت</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">کد پیگیری</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {claim.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-text-primary">{payment.amount.toLocaleString('fa-IR')}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{payment.paymentDate}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{payment.reference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">وضعیت فعلی</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  {getStatusBadge(claim.status)}
                  <p className="mt-2 text-sm text-text-muted">
                    {claim.status === 'UNDER_REVIEW' && 'خسارت شما در حال بررسی است'}
                    {claim.status === 'APPROVED' && 'خسارت تأیید شده است'}
                    {claim.status === 'REJECTED' && 'خسارت رد شده است'}
                    {claim.status === 'PAID' && 'خسارت پرداخت شده است'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">عملیات</h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-bg-base px-4 py-2 text-sm text-text-secondary hover:opacity-80">
                  <Download className="h-4 w-4" />
                  دانلود گزارش
                </button>
                <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-bg-base px-4 py-2 text-sm text-text-secondary hover:opacity-80">
                  <Printer className="h-4 w-4" />
                  پرینت
                </button>
                {claim.status === 'UNDER_REVIEW' && (
                  <button className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90">
                    پیگیری
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
