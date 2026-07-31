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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

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
          <div className="mb-4 rounded-lg border border-danger bg-danger/10 p-3 text-body-sm text-danger">
            {error}
          </div>
        )}

        <Card className="p-4">
          {data?.rows?.length > 0 ? (
            <DataTable
              columns={Object.keys(data.rows[0] || {}).slice(0, 6).map((key) => ({
                key,
                header: key,
                cell: (row: any) => String(row[key] ?? '-'),
              }))}
              rows={data.rows}
              keyExtractor={(row: any) => row.id || row.productId || row.agreementId || String(row._index || Math.random())}
            />
          ) : (
            <p className="text-text-muted">داده‌ای یافت نشد</p>
          )}
        </Card>
      </main>
    </div>
  );
}
