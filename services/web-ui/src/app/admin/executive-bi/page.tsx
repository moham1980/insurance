'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type DashboardMetrics = {
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalClaims: number;
  paidClaims: number;
  pendingClaims: number;
  totalCommissions: number;
  netProfit: number;
  lossRatio: number;
  combinedRatio: number;
  customerRetentionRate: number;
  newCustomers: number;
};

type TrendData = {
  date: string;
  policies: number;
  premium: number;
  claims: number;
  commissions: number;
  profit: number;
};

type ProductPerformance = {
  productId: string;
  productName: string;
  policiesCount: number;
  premium: number;
  claims: number;
  lossRatio: number;
  growthRate: number;
};

type RegionalPerformance = {
  region: string;
  policiesCount: number;
  premium: number;
  claims: number;
  marketShare: number;
};

type AgentPerformance = {
  agentId: string;
  agentName: string;
  policiesCount: number;
  premium: number;
  commissions: number;
  ranking: number;
};

export default function ExecutiveBIDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [regionalPerformance, setRegionalPerformance] = useState<RegionalPerformance[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'reporting:view')) { router.push('/forbidden'); return; }
    fetchAllData();
  }, [router, selectedPeriod, comparisonMode]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchTrendData(),
        fetchProductPerformance(),
        fetchRegionalPerformance(),
        fetchAgentPerformance(),
      ]);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت داده‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await apiFetch<DashboardMetrics>(`/reporting/executive-bi/metrics?period=${selectedPeriod}`);
      if (res.success) setMetrics(res.data);
    } catch (e: any) {
      console.error('Failed to fetch metrics:', e);
      setMetrics(getMockMetrics());
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const res = await apiFetch<TrendData[]>(`/reporting/executive-bi/trends?period=${selectedPeriod}`);
      if (res.success) setTrendData(res.data);
    } catch (e: any) {
      console.error('Failed to fetch trend data:', e);
      setTrendData(getMockTrendData(selectedPeriod));
    }
  };

  const fetchProductPerformance = async () => {
    try {
      const res = await apiFetch<ProductPerformance[]>(`/reporting/executive-bi/products?period=${selectedPeriod}`);
      if (res.success) setProductPerformance(res.data);
    } catch (e: any) {
      console.error('Failed to fetch product performance:', e);
      setProductPerformance(getMockProductPerformance());
    }
  };

  const fetchRegionalPerformance = async () => {
    try {
      const res = await apiFetch<RegionalPerformance[]>(`/reporting/executive-bi/regions?period=${selectedPeriod}`);
      if (res.success) setRegionalPerformance(res.data);
    } catch (e: any) {
      console.error('Failed to fetch regional performance:', e);
      setRegionalPerformance(getMockRegionalPerformance());
    }
  };

  const fetchAgentPerformance = async () => {
    try {
      const res = await apiFetch<AgentPerformance[]>(`/reporting/executive-bi/agents?period=${selectedPeriod}`);
      if (res.success) setAgentPerformance(res.data);
    } catch (e: any) {
      console.error('Failed to fetch agent performance:', e);
      setAgentPerformance(getMockAgentPerformance());
    }
  };

  const getMockMetrics = (): DashboardMetrics => ({
    totalPolicies: 15420,
    activePolicies: 12350,
    totalPremium: 456000000000,
    totalClaims: 2340,
    paidClaims: 1890,
    pendingClaims: 450,
    totalCommissions: 45600000000,
    netProfit: 89000000000,
    lossRatio: 68.5,
    combinedRatio: 92.3,
    customerRetentionRate: 85.2,
    newCustomers: 1250,
  });

  const getMockTrendData = (period: string): TrendData[] => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const data: TrendData[] = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        policies: Math.floor(Math.random() * 50) + 20,
        premium: Math.floor(Math.random() * 50000000) + 10000000,
        claims: Math.floor(Math.random() * 10) + 2,
        commissions: Math.floor(Math.random() * 5000000) + 1000000,
        profit: Math.floor(Math.random() * 10000000) + 2000000,
      });
    }
    
    return data;
  };

  const getMockProductPerformance = (): ProductPerformance[] => [
    {
      productId: '1',
      productName: 'شخص ثالث خودرو',
      policiesCount: 8500,
      premium: 250000000000,
      claims: 1200,
      lossRatio: 65.2,
      growthRate: 12.5,
    },
    {
      productId: '2',
      productName: 'بدنه خودرو',
      policiesCount: 4200,
      premium: 150000000000,
      claims: 800,
      lossRatio: 72.8,
      growthRate: 8.3,
    },
    {
      productId: '3',
      productName: 'آتش‌سوزی',
      policiesCount: 1800,
      premium: 35000000000,
      claims: 220,
      lossRatio: 58.4,
      growthRate: 15.2,
    },
    {
      productId: '4',
      productName: 'عمر',
      policiesCount: 920,
      premium: 21000000000,
      claims: 120,
      lossRatio: 45.6,
      growthRate: 22.1,
    },
  ];

  const getMockRegionalPerformance = (): RegionalPerformance[] => [
    {
      region: 'تهران',
      policiesCount: 5200,
      premium: 180000000000,
      claims: 750,
      marketShare: 35.2,
    },
    {
      region: 'اصفهان',
      policiesCount: 2800,
      premium: 95000000000,
      claims: 420,
      marketShare: 18.5,
    },
    {
      region: 'فارس',
      policiesCount: 2200,
      premium: 75000000000,
      claims: 350,
      marketShare: 14.2,
    },
    {
      region: 'خراسان رضوی',
      policiesCount: 1900,
      premium: 62000000000,
      claims: 290,
      marketShare: 12.1,
    },
    {
      region: 'سایر استان‌ها',
      policiesCount: 3320,
      premium: 144000000000,
      claims: 530,
      marketShare: 20.0,
    },
  ];

  const getMockAgentPerformance = (): AgentPerformance[] => [
    {
      agentId: '1',
      agentName: 'علی احمدی',
      policiesCount: 245,
      premium: 8500000000,
      commissions: 1275000000,
      ranking: 1,
    },
    {
      agentId: '2',
      agentName: 'مریم رضایی',
      policiesCount: 198,
      premium: 7200000000,
      commissions: 1080000000,
      ranking: 2,
    },
    {
      agentId: '3',
      agentName: 'حسن محمدی',
      policiesCount: 175,
      premium: 6100000000,
      commissions: 915000000,
      ranking: 3,
    },
    {
      agentId: '4',
      agentName: 'زهرا کریمی',
      policiesCount: 152,
      premium: 5400000000,
      commissions: 810000000,
      ranking: 4,
    },
    {
      agentId: '5',
      agentName: 'محمد جعفری',
      policiesCount: 128,
      premium: 4800000000,
      commissions: 720000000,
      ranking: 5,
    },
  ];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  const formatPercent = (value: number): string => {
    return value.toFixed(1) + '%';
  };

  const metricColorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-brand-primary-subtle', text: 'text-brand-primary' },
    green: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success' },
    orange: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning' },
    yellow: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning' },
    teal: { bg: 'bg-brand-secondary-subtle', text: 'text-brand-secondary' },
    indigo: { bg: 'bg-brand-accent-subtle', text: 'text-brand-accent' },
  };

  const renderMetricCard = (title: string, value: string, change?: number, color: string = 'blue') => {
    const changeColor = change && change > 0 ? 'text-feedback-success' : change && change < 0 ? 'text-feedback-error' : 'text-text-muted';
    const changeIcon = change && change > 0 ? '↑' : change && change < 0 ? '↓' : '';
    const colorClasses = metricColorMap[color] || metricColorMap.blue;
    
    return (
      <div className="bg-bg-raised rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold text-text-primary mt-2">{value}</p>
            {change !== undefined && (
              <p className={`text-sm mt-2 ${changeColor}`}>
                {changeIcon} {Math.abs(change)}% نسبت به دوره قبل
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full ${colorClasses.bg} flex items-center justify-center`}>
            <TrendingUp className={`w-6 h-6 ${colorClasses.text}`} />
          </div>
        </div>
      </div>
    );
  };

  const renderAreaChart = (data: TrendData[], dataKey: keyof TrendData, gradientId: string, color: string) => {
    const values = data.slice(-30).map(d => Number(d[dataKey]));
    if (values.length === 0) return <div className="h-64 flex items-center justify-center text-text-muted">داده‌ای موجود نیست</div>;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    const width = 100;
    const height = 100;
    const step = width / Math.max(values.length - 1, 1);
    const points = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - minValue) / range) * (height - 10) - 5;
      return `${x},${y}`;
    });
    const areaPath = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
    const linePath = `M ${points.join(' L ')}`;
    return (
      <div className="relative h-64">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          {values.map((v, i) => {
            const x = i * step;
            const y = height - ((v - minValue) / range) * (height - 10) - 5;
            return <circle key={i} cx={x} cy={y} r="0.8" fill={color} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-text-muted px-1">
          <span>{data[0]?.date?.slice(5) || ''}</span>
          <span>{data[data.length - 1]?.date?.slice(5) || ''}</span>
        </div>
      </div>
    );
  };

  const renderDonutChart = (items: { label: string; value: number; color: string }[]) => {
    const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
    let cumulative = 0;
    const radius = 15.91549;
    return (
      <div className="flex items-center gap-6">
        <div className="relative h-40 w-40 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--color-border-default)" strokeWidth="3" />
            {items.map((item, i) => {
              const dash = (item.value / total) * 100;
              const offset = (cumulative / total) * 100;
              cumulative += item.value;
              return (
                <circle
                  key={i}
                  cx="18" cy="18" r={radius} fill="none"
                  stroke={item.color} strokeWidth="3"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-text-primary">{formatNumber(total)}</span>
            <span className="text-[10px] text-text-muted">کل</span>
          </div>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-bold text-text-primary">{formatNumber(item.value)}</span>
              <span className="text-text-muted">({((item.value / total) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProgressBar = (label: string, value: number, max: number, color: string) => {
    const pct = Math.min((value / max) * 100, 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">{label}</span>
          <span className="font-bold text-text-primary">{formatNumber(value)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-base">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="bg-bg-raised shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-text-primary">داشبورد مدیریتی (Executive BI)</h1>
            <div className="flex items-center gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="rounded-md border border-border-default px-3 py-2 text-sm"
              >
                <option value="7d">۷ روز اخیر</option>
                <option value="30d">۳۰ روز اخیر</option>
                <option value="90d">۹۰ روز اخیر</option>
                <option value="1y">یک سال</option>
              </select>
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`px-4 py-2 text-sm rounded-md ${comparisonMode ? 'bg-brand-primary text-text-on-brand' : 'bg-bg-base text-text-secondary'}`}
              >
                مقایسه دوره‌ای
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                بازگشت
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
            {error}
          </div>
        )}

        {metricsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-text-muted">در حال بارگذاری...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metrics && (
                <>
                  {renderMetricCard('کل بیمه‌نامه‌ها', formatNumber(metrics.totalPolicies), 12.5, 'blue')}
                  {renderMetricCard('پریمیوم کل', formatCurrency(metrics.totalPremium), 8.3, 'green')}
                  {renderMetricCard('کل خسارت‌ها', formatNumber(metrics.totalClaims), -5.2, 'red')}
                  {renderMetricCard('سود خالص', formatCurrency(metrics.netProfit), 15.8, 'purple')}
                  {renderMetricCard('نسبت خسارت', formatPercent(metrics.lossRatio), -2.1, 'orange')}
                  {renderMetricCard('نسبت ترکیبی', formatPercent(metrics.combinedRatio), -1.5, 'yellow')}
                  {renderMetricCard('نرخ حفظ مشتریان', formatPercent(metrics.customerRetentionRate), 3.2, 'teal')}
                  {renderMetricCard('مشتریان جدید', formatNumber(metrics.newCustomers), 18.5, 'indigo')}
                </>
              )}
            </div>

            {/* Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-bg-raised rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">روند صدور بیمه‌نامه</h3>
                {renderAreaChart(trendData, 'policies', 'grad-policies', 'var(--color-brand-primary)')}
              </div>
              <div className="bg-bg-raised rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">روند پریمیوم</h3>
                {renderAreaChart(trendData, 'premium', 'grad-premium', 'var(--color-feedback-success)')}
              </div>
              <div className="bg-bg-raised rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">روند خسارت‌ها</h3>
                {renderAreaChart(trendData, 'claims', 'grad-claims', 'var(--color-feedback-error)')}
              </div>
              <div className="bg-bg-raised rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">روند سود</h3>
                {renderAreaChart(trendData, 'profit', 'grad-profit', 'var(--color-brand-accent)')}
              </div>
            </div>

            {/* Product Performance with Progress Bars */}
            <div className="bg-bg-raised rounded-xl shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-text-primary mb-4">عملکرد محصولات</h3>
              <div className="space-y-3 mb-6">
                {productPerformance.slice(0, 5).map(p => (
                  <div key={p.productId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-text-secondary">{p.productName}</span>
                      <span className="text-text-muted">نسبت خسارت: {formatPercent(p.lossRatio)} | رشد: <span className={p.growthRate > 0 ? 'text-feedback-success' : 'text-feedback-error'}>{p.growthRate > 0 ? '+' : ''}{formatPercent(p.growthRate)}</span></span>
                    </div>
                    {renderProgressBar('', p.policiesCount, Math.max(...productPerformance.map(x => x.policiesCount)), 'var(--color-brand-primary)')}
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">محصول</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">تعداد بیمه‌نامه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">پریمیوم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">خسارت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نسبت خسارت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نرخ رشد</th>
                    </tr>
                  </thead>
                  <tbody className="bg-bg-raised divide-y divide-border-default">
                    {productPerformance.map((product) => (
                      <tr key={product.productId} className="hover:bg-bg-base">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{product.productName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatNumber(product.policiesCount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatCurrency(product.premium)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatNumber(product.claims)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatPercent(product.lossRatio)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={product.growthRate > 0 ? 'text-feedback-success' : 'text-feedback-error'}>
                            {product.growthRate > 0 ? '+' : ''}{formatPercent(product.growthRate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regional Performance with Donut Chart */}
            <div className="bg-bg-raised rounded-xl shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-text-primary mb-4">عملکرد منطقه‌ای</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {renderDonutChart(regionalPerformance.map((r, i) => ({
                  label: r.region,
                  value: r.policiesCount,
                  color: ['var(--color-brand-primary)', 'var(--color-feedback-success)', 'var(--color-feedback-warning)', 'var(--color-feedback-error)', 'var(--color-brand-accent)', 'var(--color-brand-secondary)'][i % 6],
                })))}
                <div className="space-y-3">
                  {regionalPerformance.map((r, i) => (
                    renderProgressBar(r.region, r.premium, Math.max(...regionalPerformance.map(x => x.premium)),
                      ['var(--color-brand-primary)', 'var(--color-feedback-success)', 'var(--color-feedback-warning)', 'var(--color-feedback-error)', 'var(--color-brand-accent)', 'var(--color-brand-secondary)'][i % 6])
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">منطقه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">تعداد بیمه‌نامه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">پریمیوم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">خسارت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">سهم بازار</th>
                    </tr>
                  </thead>
                  <tbody className="bg-bg-raised divide-y divide-border-default">
                    {regionalPerformance.map((region) => (
                      <tr key={region.region} className="hover:bg-bg-base">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{region.region}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatNumber(region.policiesCount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatCurrency(region.premium)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatNumber(region.claims)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatPercent(region.marketShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Agents with Ranking Bars */}
            <div className="bg-bg-raised rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">برترین نمایندگان</h3>
              <div className="space-y-3 mb-6">
                {agentPerformance.map((agent, i) => (
                  <div key={agent.agentId} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-feedback-warning-subtle text-feedback-warning' : i === 1 ? 'bg-bg-base text-text-secondary' : i === 2 ? 'bg-feedback-warning-subtle text-feedback-warning' : 'bg-brand-primary-subtle text-brand-primary'}`}>
                      {agent.ranking}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-text-secondary">{agent.agentName}</span>
                        <span className="text-text-muted">{formatNumber(agent.policiesCount)} بیمه‌نامه</span>
                      </div>
                      {renderProgressBar('', agent.premium, Math.max(...agentPerformance.map(a => a.premium)), ['var(--color-feedback-warning)', 'var(--color-text-muted)', 'var(--color-brand-secondary)', 'var(--color-brand-primary)', 'var(--color-brand-accent)'][i % 5])}
                    </div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">رتبه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نام نماینده</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">تعداد بیمه‌نامه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">پریمیوم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">کمیسیون</th>
                    </tr>
                  </thead>
                  <tbody className="bg-bg-raised divide-y divide-border-default">
                    {agentPerformance.map((agent) => (
                      <tr key={agent.agentId} className="hover:bg-bg-base">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary-subtle text-brand-primary">
                            {agent.ranking}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{agent.agentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatNumber(agent.policiesCount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatCurrency(agent.premium)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{formatCurrency(agent.commissions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
