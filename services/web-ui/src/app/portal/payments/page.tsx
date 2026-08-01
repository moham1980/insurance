'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, Loader2, CreditCard } from 'lucide-react';
import { Card, StatCard } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

interface Payment {
  id: string;
  invoiceNumber: string;
  policyNumber: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: string;
}

const MOCK_PAYMENTS: Payment[] = [
  { id: '1', invoiceNumber: 'INV-2024-001', policyNumber: 'POL-2024-001', amount: 5000000, dueDate: '2024-04-21', status: 'PENDING' },
  { id: '2', invoiceNumber: 'INV-2024-002', policyNumber: 'POL-2024-002', amount: 3000000, dueDate: '2024-03-15', status: 'PAID', paidDate: '2024-03-10' },
  { id: '3', invoiceNumber: 'INV-2023-003', policyNumber: 'POL-2023-003', amount: 4500000, dueDate: '2024-02-20', status: 'OVERDUE' },
];

export default function CustomerPortalPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await apiFetch<Payment[]>('/portal/payments');
      setPayments(res.success && res.data ? res.data : MOCK_PAYMENTS);
    } catch {
      setPayments(MOCK_PAYMENTS);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-feedback-warning-subtle text-feedback-warning',
      PAID: 'bg-feedback-success-subtle text-feedback-success',
      OVERDUE: 'bg-feedback-error-subtle text-feedback-error',
    };
    const labels = {
      PENDING: 'در انتظار پرداخت',
      PAID: 'پرداخت شده',
      OVERDUE: 'سررسید گذشته',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handlePayment = async (paymentId: string) => {
    try {
      const res = await apiFetch(`/portal/payments/${paymentId}/pay`, { method: 'POST' });
      if (res.success) {
        loadPayments();
      }
    } catch {
      // fallback - just reload
    }
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button onClick={() => router.push('/portal')} className="text-text-muted hover:text-text-primary">
              <ChevronRight className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">اقساط و پرداخت‌ها</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="در انتظار پرداخت" value={payments.filter(p => p.status === 'PENDING').length} icon={Clock} />
          <StatCard title="سررسید گذشته" value={payments.filter(p => p.status === 'OVERDUE').length} icon={AlertTriangle} />
          <StatCard title="پرداخت شده" value={payments.filter(p => p.status === 'PAID').length} icon={CheckCircle} />
        </div>

        {/* Payments List */}
        <Card className="overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : payments.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted">قسطی یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره فاکتور</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره بیمه‌نامه</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">مبلغ</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">سررسید</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">وضعیت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ پرداخت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-bg-base">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">{payment.invoiceNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">{payment.policyNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{payment.amount.toLocaleString('fa-IR')}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{payment.dueDate}</td>
                        <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(payment.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{payment.paidDate || '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {payment.status === 'PENDING' || payment.status === 'OVERDUE' ? (
                            <button
                              onClick={() => handlePayment(payment.id)}
                              className="flex items-center gap-1 rounded-lg bg-feedback-success px-3 py-1 text-xs font-medium text-text-on-brand hover:opacity-90"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              پرداخت
                            </button>
                          ) : (
                            <span className="text-xs text-text-muted">پرداخت شده</span>
                          )}
                        </td>
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
