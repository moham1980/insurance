'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronRight, Loader2, Download, Printer, FileText, Check } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

interface PolicyDetail {
  id: string;
  policyNumber: string;
  product: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  issueDate: string;
  expiryDate: string;
  premium: number;
  vehiclePlate?: string;
  vehicleVin?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  insuredName: string;
  insuredNationalId: string;
  insurer: string;
  coverage: string[];
  documents: Array<{
    id: string;
    name: string;
    uploadDate: string;
  }>;
  history: Array<{
    date: string;
    action: string;
    description: string;
  }>;
}

const MOCK_POLICY: PolicyDetail = {
  id: '1',
  policyNumber: 'POL-2024-001',
  product: 'بدنه خودرو',
  status: 'ACTIVE',
  issueDate: '2024-03-21',
  expiryDate: '2025-03-21',
  premium: 5000000,
  vehiclePlate: '۱۲-ب-۴۵۶-۷۸',
  vehicleVin: 'VIN1234567890',
  vehicleMake: 'پژو',
  vehicleModel: '206',
  vehicleYear: '2020',
  insuredName: 'علی احمدی',
  insuredNationalId: '0123456789',
  insurer: 'بیمه ایران',
  coverage: ['خسارت بدنه', 'خسارت مالی', 'سرقت کلی', 'شکست شیشه'],
  documents: [
    { id: '1', name: 'بیمه‌نامه.pdf', uploadDate: '2024-03-21' },
    { id: '2', name: 'کارشناسی خودرو.jpg', uploadDate: '2024-03-20' },
  ],
  history: [
    { date: '2024-03-21', action: 'صدور', description: 'صدور بیمه‌نامه' },
    { date: '2024-03-20', action: 'ثبت درخواست', description: 'ثبت درخواست بیمه' },
  ],
};

export default function PolicyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) loadPolicyDetail();
  }, [params?.id]);

  const loadPolicyDetail = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<PolicyDetail>(`/portal/policies/${params?.id}`);
      setPolicy(res.success && res.data ? res.data : MOCK_POLICY);
    } catch {
      setPolicy(MOCK_POLICY);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-feedback-success-subtle text-feedback-success',
      EXPIRED: 'bg-feedback-error-subtle text-feedback-error',
      CANCELLED: 'bg-bg-base text-text-primary',
    };
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status === 'ACTIVE' ? 'فعال' : status === 'EXPIRED' ? 'منقضی' : 'ابطال شده'}
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

  if (!policy) {
    return (
      <div className="min-h-screen bg-bg-base" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-text-muted text-center">بیمه‌نامه یافت نشد</p>
          <button
            onClick={() => router.push('/portal/policies')}
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
              <button onClick={() => router.push('/portal/policies')} className="text-text-muted hover:text-text-primary">
                <ChevronRight className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-text-primary">جزئیات بیمه‌نامه</h1>
            </div>
            {getStatusBadge(policy.status)}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Information */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">اطلاعات بیمه‌نامه</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-text-muted">شماره بیمه‌نامه</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.policyNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">محصول</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.product}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">تاریخ صدور</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.issueDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">تاریخ انقضا</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.expiryDate}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">حق بیمه</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.premium.toLocaleString('fa-IR')} ریال</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">بیمه‌گر</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.insurer}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* Vehicle Information */}
            {policy.vehiclePlate && (
              <Card>
                <div className="px-6 py-4 border-b border-border-default">
                  <h2 className="text-base font-semibold text-text-primary">اطلاعات خودرو</h2>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-text-muted">پلاک خودرو</dt>
                      <dd className="mt-1 text-sm text-text-primary">{policy.vehiclePlate}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-text-muted">شماره VIN</dt>
                      <dd className="mt-1 text-sm text-text-primary">{policy.vehicleVin}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-text-muted">مارک خودرو</dt>
                      <dd className="mt-1 text-sm text-text-primary">{policy.vehicleMake}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-text-muted">مدل خودرو</dt>
                      <dd className="mt-1 text-sm text-text-primary">{policy.vehicleModel}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-text-muted">سال ساخت</dt>
                      <dd className="mt-1 text-sm text-text-primary">{policy.vehicleYear}</dd>
                    </div>
                  </dl>
                </div>
              </Card>
            )}

            {/* Coverage */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">پوشش‌های بیمه‌ای</h2>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {policy.coverage.map((item, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-feedback-success ml-2" />
                      <span className="text-sm text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Documents */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">مدارک پیوست</h2>
              </div>
              <div className="p-6">
                {policy.documents.length === 0 ? (
                  <p className="text-sm text-text-muted">مدرکی پیوست نشده است</p>
                ) : (
                  <ul className="divide-y divide-border-default">
                    {policy.documents.map((doc) => (
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

            {/* History */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">تاریخچه تغییرات</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {policy.history.map((item, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-brand-primary mt-2"></div>
                      </div>
                      <div className="mr-4">
                        <p className="text-sm font-medium text-text-primary">{item.action}</p>
                        <p className="text-xs text-text-muted">{item.date}</p>
                        <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Insured Information */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">اطلاعات بیمه‌گذار</h2>
              </div>
              <div className="p-6">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-text-muted">نام</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.insuredName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-text-muted">کد ملی</dt>
                    <dd className="mt-1 text-sm text-text-primary">{policy.insuredNationalId}</dd>
                  </div>
                </dl>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <div className="px-6 py-4 border-b border-border-default">
                <h2 className="text-base font-semibold text-text-primary">عملیات</h2>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => router.push('/portal/claims/new')}
                  className="w-full rounded-lg bg-feedback-success px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
                >
                  ثبت خسارت
                </button>
                <button
                  onClick={() => router.push('/portal/payments')}
                  className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
                >
                  پرداخت اقساط
                </button>
                <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-bg-base px-4 py-2 text-sm text-text-secondary hover:opacity-80">
                  <Download className="h-4 w-4" />
                  دانلود بیمه‌نامه
                </button>
                <button className="flex w-full items-center justify-center gap-1 rounded-lg bg-bg-base px-4 py-2 text-sm text-text-secondary hover:opacity-80">
                  <Printer className="h-4 w-4" />
                  پرینت
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
