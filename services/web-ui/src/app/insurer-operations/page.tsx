'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, FileText, Users, ShieldAlert, DollarSign, BarChart3, ChevronLeft } from 'lucide-react';
import { Card, DataTable, Button } from '@insurance/design-system';
import { cn } from '@/lib/cn';

const API_URL = process.env.NEXT_PUBLIC_INSURER_BFF_URL || 'http://localhost:3040';

function getAuthHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
  const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const mockProducts = { rows: [
  { productId: 'pr-001', code: 'MOT-3RD-1403', nameFa: 'بیمه ثالثی شخصی', lineOfBusiness: 'خودرو', status: 'فعال', premiumMin: 1500000, premiumMax: 4000000 },
  { productId: 'pr-002', code: 'FIRE-RES-1403', nameFa: 'بیمه آتش‌سوزی مسکونی', lineOfBusiness: 'آتش‌سوزی', status: 'فعال', premiumMin: 800000, premiumMax: 2500000 },
  { productId: 'pr-003', code: 'ACC-IND-1403', nameFa: 'بیمه حوادث انفرادی', lineOfBusiness: 'حوادث', status: 'فعال', premiumMin: 500000, premiumMax: 3000000 },
  { productId: 'pr-004', code: 'ENG-CIV-1403', nameFa: 'بیمه مهندسی عمران', lineOfBusiness: 'مهندسی', status: 'فعال', premiumMin: 2000000, premiumMax: 10000000 },
  { productId: 'pr-005', code: 'HEA-SUP-1403', nameFa: 'بیمه درمان تکمیلی', lineOfBusiness: 'درمان', status: 'پیش‌نویس', premiumMin: 3000000, premiumMax: 8000000 },
]};

const mockAgreements = { rows: [
  { agreementId: 'ag-001', partnerName: 'کارگزاری بیمه ایران', agreementType: 'کارگزاری', commissionRate: '18%', startDate: '1403/01/01', endDate: '1404/01/01', status: 'فعال' },
  { agreementId: 'ag-002', partnerName: 'نمایندگی بیمه آسیه', agreementType: 'نمایندگی', commissionRate: '15%', startDate: '1403/02/15', endDate: '1404/02/15', status: 'فعال' },
  { agreementId: 'ag-003', partnerName: 'بازاریاب بیمه پاسارگاد', agreementType: 'بازاریاب', commissionRate: '20%', startDate: '1403/03/01', endDate: '1404/03/01', status: 'فعال' },
  { agreementId: 'ag-004', partnerName: 'کارگزاری بیمه البرز', agreementType: 'کارگزاری', commissionRate: '12%', startDate: '1403/04/10', endDate: '1404/04/10', status: 'در مذاکره' },
]};

const mockRfqs = { rows: [
  { rfqId: 'rfq-001', rfqNumber: 'RFQ-1403-001', customerName: 'علی محمدی', productName: 'بیمه ثالثی', channel: 'کارگزاری', status: 'در انتظار قیمت‌گذاری', createdAt: '1403/05/10' },
  { rfqId: 'rfq-002', rfqNumber: 'RFQ-1403-002', customerName: 'مریم احمدی', productName: 'بیمه آتش‌سوزی', channel: 'نمایندگی', status: 'قیمت‌گذاری شده', createdAt: '1403/05/12' },
  { rfqId: 'rfq-003', rfqNumber: 'RFQ-1403-003', customerName: 'حسین رضایی', productName: 'بیمه حوادث', channel: 'بازاریاب', status: 'تسویه شده', createdAt: '1403/05/08' },
  { rfqId: 'rfq-004', rfqNumber: 'RFQ-1403-004', customerName: 'فاطمه کریمی', productName: 'بیمه مهندسی', channel: 'کارگزاری', status: 'در انتظار قیمت‌گذاری', createdAt: '1403/05/14' },
]};

const mockClaims = { rows: [
  { claimId: 'cl-001', claimNumber: 'CLM-1403-92145', policyNumber: 'POL-1403-0231', customerName: 'علی محمدی', lossType: 'تصادف', amount: 15000000, status: 'در حال بررسی', date: '1403/05/10' },
  { claimId: 'cl-002', claimNumber: 'CLM-1403-92146', policyNumber: 'POL-1403-0232', customerName: 'مریم احمدی', lossType: 'سرقت', amount: 85000000, status: 'تأیید شده', date: '1403/05/08' },
  { claimId: 'cl-003', claimNumber: 'CLM-1403-92147', policyNumber: 'POL-1403-0233', customerName: 'حسین رضایی', lossType: 'آتش‌سوزی', amount: 120000000, status: 'ثبت شده', date: '1403/05/14' },
]};

const mockSettlements = { rows: [
  { settlementId: 'st-001', period: 'خرداد 1403', channel: 'کارگزاری بیمه ایران', totalPremium: 45000000, commissionAmount: 8100000, status: 'تسویه شده', settlementDate: '1403/04/01' },
  { settlementId: 'st-002', period: 'خرداد 1403', channel: 'نمایندگی بیمه آسیه', totalPremium: 28000000, commissionAmount: 4200000, status: 'تسویه شده', settlementDate: '1403/04/01' },
  { settlementId: 'st-003', period: 'تیر 1403', channel: 'کارگزاری بیمه ایران', totalPremium: 52000000, commissionAmount: 9360000, status: 'در انتظار', settlementDate: '-' },
]};

const mockReports = { rows: [
  { reportId: 'rp-001', reportType: 'گزارش ماهانه فروش', period: 'خرداد 1403', submittedBy: 'سیستم خودکار', status: 'ارسال شده', submissionDate: '1403/04/05' },
  { reportId: 'rp-002', reportType: 'گزارش خسارات', period: 'خرداد 1403', submittedBy: 'محمد احمدی', status: 'ارسال شده', submissionDate: '1403/04/05' },
  { reportId: 'rp-003', reportType: 'گزارش ماهانه فروش', period: 'تیر 1403', submittedBy: '-', status: 'در حال تهیه', submissionDate: '-' },
]};

const mockMap: Record<string, any> = {
  products: mockProducts,
  agreements: mockAgreements,
  rfqs: mockRfqs,
  claims: mockClaims,
  settlements: mockSettlements,
  reports: mockReports,
};

function formatToman(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

export default function InsurerOperationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'agreements' | 'rfqs' | 'claims' | 'settlements' | 'reports'>('products');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    if (!tokenMatch) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const endpoints: Record<string, string> = {
        products: `${API_URL}/api/v1/insurer/products`,
        agreements: `${API_URL}/api/v1/insurer/distribution-agreements`,
        rfqs: `${API_URL}/api/v1/insurer/rfqs`,
        claims: `${API_URL}/api/v1/insurer/claims`,
        settlements: `${API_URL}/api/v1/insurer/settlements`,
        reports: `${API_URL}/api/v1/insurer/regulatory-reports`,
      };
      const res = await fetch(endpoints[activeTab], { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data || {});
    } catch (err: any) {
      setError(err.message);
      setData(mockMap[activeTab] || {});
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'products' as const, label: 'محصولات و تعرفه‌ها', icon: Package },
    { key: 'agreements' as const, label: 'قراردادهای توزیع', icon: FileText },
    { key: 'rfqs' as const, label: 'درخواست‌های استعلام', icon: Users },
    { key: 'claims' as const, label: 'مدیریت خسارات', icon: ShieldAlert },
    { key: 'settlements' as const, label: 'تسویه‌ها', icon: DollarSign },
    { key: 'reports' as const, label: 'گزارش‌های نظارتی', icon: BarChart3 },
  ];

  const rows = data?.rows || (Array.isArray(data) ? data : []);

  const columnSets: Record<string, any[]> = {
    products: [
      { key: 'code', header: 'کد', cell: (row: any) => <span className="font-medium text-text-primary">{row.code || '-'}</span> },
      { key: 'nameFa', header: 'نام محصول', cell: (row: any) => row.nameFa || '-' },
      { key: 'lineOfBusiness', header: 'رشته بیمه', cell: (row: any) => row.lineOfBusiness || '-' },
      { key: 'premiumMin', header: 'حداقل حق بیمه', cell: (row: any) => <span className="text-text-muted">{row.premiumMin ? formatToman(row.premiumMin) : '-'}</span> },
      { key: 'premiumMax', header: 'حداکثر حق بیمه', cell: (row: any) => <span className="text-text-muted">{row.premiumMax ? formatToman(row.premiumMax) : '-'}</span> },
      { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
    ],
    agreements: [
      { key: 'agreementId', header: 'شماره', cell: (row: any) => <span className="font-medium text-text-primary">{row.agreementId || '-'}</span> },
      { key: 'partnerName', header: 'طرف قرارداد', cell: (row: any) => row.partnerName || '-' },
      { key: 'agreementType', header: 'نوع قرارداد', cell: (row: any) => row.agreementType || '-' },
      { key: 'commissionRate', header: 'نرخ پورسانت', cell: (row: any) => <span className="inline-flex items-center rounded-lg bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">{row.commissionRate || '-'}</span> },
      { key: 'startDate', header: 'شروع', cell: (row: any) => <span className="text-text-muted">{row.startDate || '-'}</span> },
      { key: 'endDate', header: 'پایان', cell: (row: any) => <span className="text-text-muted">{row.endDate || '-'}</span> },
      { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'فعال' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
    ],
    rfqs: [
      { key: 'rfqNumber', header: 'شماره استعلام', cell: (row: any) => <span className="font-medium text-text-primary">{row.rfqNumber || '-'}</span> },
      { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName || '-' },
      { key: 'productName', header: 'محصول', cell: (row: any) => row.productName || '-' },
      { key: 'channel', header: 'کانال فروش', cell: (row: any) => row.channel || '-' },
      { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'تسویه شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : row.status === 'قیمت‌گذاری شده' ? 'border-brand-primary/30 bg-brand-primary-subtle text-brand-primary' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
      { key: 'createdAt', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.createdAt || '-'}</span> },
    ],
    claims: [
      { key: 'claimNumber', header: 'شماره خسارت', cell: (row: any) => <span className="font-medium text-text-primary">{row.claimNumber || '-'}</span> },
      { key: 'policyNumber', header: 'بیمه‌نامه', cell: (row: any) => row.policyNumber || '-' },
      { key: 'customerName', header: 'مشتری', cell: (row: any) => row.customerName || '-' },
      { key: 'lossType', header: 'نوع خسارت', cell: (row: any) => row.lossType || '-' },
      { key: 'amount', header: 'مبلغ', cell: (row: any) => <span className="font-medium text-text-primary">{row.amount > 0 ? formatToman(row.amount) : '-'}</span> },
      { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'تأیید شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : row.status === 'در حال بررسی' ? 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning' : 'border-border-default bg-bg-base text-text-muted')}>{row.status || '-'}</span> },
      { key: 'date', header: 'تاریخ', cell: (row: any) => <span className="text-text-muted">{row.date || '-'}</span> },
    ],
    settlements: [
      { key: 'period', header: 'دوره', cell: (row: any) => <span className="font-medium text-text-primary">{row.period || '-'}</span> },
      { key: 'channel', header: 'کانال', cell: (row: any) => row.channel || '-' },
      { key: 'totalPremium', header: 'کل حق بیمه', cell: (row: any) => <span className="text-text-muted">{row.totalPremium ? formatToman(row.totalPremium) : '-'}</span> },
      { key: 'commissionAmount', header: 'مبلغ پورسانت', cell: (row: any) => <span className="font-medium text-text-primary">{row.commissionAmount ? formatToman(row.commissionAmount) : '-'}</span> },
      { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'تسویه شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
      { key: 'settlementDate', header: 'تاریخ تسویه', cell: (row: any) => <span className="text-text-muted">{row.settlementDate || '-'}</span> },
    ],
    reports: [
      { key: 'reportType', header: 'نوع گزارش', cell: (row: any) => <span className="font-medium text-text-primary">{row.reportType || '-'}</span> },
      { key: 'period', header: 'دوره', cell: (row: any) => row.period || '-' },
      { key: 'submittedBy', header: 'ارسال کننده', cell: (row: any) => row.submittedBy || '-' },
      { key: 'status', header: 'وضعیت', cell: (row: any) => <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', row.status === 'ارسال شده' ? 'border-feedback-success/30 bg-feedback-success-subtle text-feedback-success' : 'border-feedback-warning/30 bg-feedback-warning-subtle text-feedback-warning')}>{row.status || '-'}</span> },
      { key: 'submissionDate', header: 'تاریخ ارسال', cell: (row: any) => <span className="text-text-muted">{row.submissionDate || '-'}</span> },
    ],
  };

  const columns = columnSets[activeTab] || [];

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-10 border-b border-border-default bg-bg-raised shadow-1">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ChevronLeft className="h-5 w-5" />
            بازگشت
          </Button>
          <h1 className="text-h3 font-bold text-text-primary">عملیات بیمه‌گر</h1>
        </div>
      </header>

      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle p-3 text-body-sm text-feedback-warning">
            در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-primary" />
          </div>
        ) : rows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={rows}
            keyExtractor={(row: any) => row.id || row.productId || row.agreementId || row.claimId || row.settlementId || row.reportId || row.rfqId || String(Math.random())}
          />
        ) : (
          <Card className="p-8 text-center">
            <p className="text-text-muted">داده‌ای یافت نشد</p>
          </Card>
        )}
      </main>
    </div>
  );
}
