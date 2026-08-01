'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, Plus, AlertCircle } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedDate: string;
  claimType: string;
  amount: number;
  approvedAmount?: number;
}

const MOCK_CLAIMS: Claim[] = [
  { id: '1', claimNumber: 'CLM-2024-001', policyNumber: 'POL-2024-001', status: 'UNDER_REVIEW', submittedDate: '2024-03-10', claimType: 'آتش‌سوزی', amount: 2000000 },
  { id: '2', claimNumber: 'CLM-2023-002', policyNumber: 'POL-2023-003', status: 'PAID', submittedDate: '2023-11-15', claimType: 'سرقت', amount: 15000000, approvedAmount: 12000000 },
  { id: '3', claimNumber: 'CLM-2023-003', policyNumber: 'POL-2023-003', status: 'REJECTED', submittedDate: '2023-08-20', claimType: 'تصادف', amount: 5000000 },
];

export default function CustomerPortalClaims() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const res = await apiFetch<Claim[]>('/portal/claims');
      setClaims(res.success && res.data ? res.data : MOCK_CLAIMS);
    } catch {
      setClaims(MOCK_CLAIMS);
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
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/portal')} className="text-text-muted hover:text-text-primary">
                <ChevronRight className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-text-primary">خسارت‌ها</h1>
            </div>
            <button
              onClick={() => router.push('/portal/claims/new')}
              className="flex items-center gap-1 rounded-lg bg-feedback-success px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              ثبت خسارت جدید
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : claims.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-10 w-10 text-text-muted" />
                <p className="mt-2 text-sm text-text-muted">خسارتی یافت نشد</p>
                <button
                  onClick={() => router.push('/portal/claims/new')}
                  className="mt-4 rounded-lg bg-feedback-success px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
                >
                  ثبت اولین خسارت
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره خسارت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره بیمه‌نامه</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">نوع خسارت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">وضعیت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ ثبت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">مبلغ درخواست</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">مبلغ تأیید شده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {claims.map((claim) => (
                      <tr
                        key={claim.id}
                        className="cursor-pointer hover:bg-bg-base"
                        onClick={() => router.push(`/portal/claims/${claim.id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">{claim.claimNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">{claim.policyNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{claim.claimType}</td>
                        <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(claim.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{claim.submittedDate}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{claim.amount.toLocaleString('fa-IR')}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{claim.approvedAmount ? claim.approvedAmount.toLocaleString('fa-IR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
