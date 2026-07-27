'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Payment {
  id: string;
  invoiceNumber: string;
  policyNumber: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: string;
}

export default function CustomerPortalPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      // In a real implementation, fetch from API
      const mockPayments: Payment[] = [
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          policyNumber: 'POL-2024-001',
          amount: 5000000,
          dueDate: '2024-04-21',
          status: 'PENDING',
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          policyNumber: 'POL-2024-002',
          amount: 3000000,
          dueDate: '2024-03-15',
          status: 'PAID',
          paidDate: '2024-03-10',
        },
        {
          id: '3',
          invoiceNumber: 'INV-2023-003',
          policyNumber: 'POL-2023-003',
          amount: 4500000,
          dueDate: '2024-02-20',
          status: 'OVERDUE',
        },
      ];

      setPayments(mockPayments);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
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
    // In a real implementation, redirect to payment gateway
    alert(`انتقال به درگاه پرداخت برای فاکتور ${paymentId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">اقساط و پرداخت‌ها</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">در انتظار پرداخت</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">سررسید گذشته</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'OVERDUE').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">پرداخت شده</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'PAID').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : payments.length === 0 ? (
              <p className="text-gray-500 text-center py-12">قسطی یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره فاکتور
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره بیمه‌نامه
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مبلغ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        سررسید
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        وضعیت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ پرداخت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.policyNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.amount.toLocaleString('fa-IR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.dueDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paidDate || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {payment.status === 'PENDING' || payment.status === 'OVERDUE' ? (
                            <button
                              onClick={() => handlePayment(payment.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                            >
                              پرداخت
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">پرداخت شده</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
