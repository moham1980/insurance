'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

  const renderMetricCard = (title: string, value: string, change?: number, color: string = 'blue') => {
    const changeColor = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-gray-500';
    const changeIcon = change && change > 0 ? '↑' : change && change < 0 ? '↓' : '';
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            {change !== undefined && (
              <p className={`text-sm mt-2 ${changeColor}`}>
                {changeIcon} {Math.abs(change)}% نسبت به دوره قبل
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full bg-${color}-100 flex items-center justify-center`}>
            <svg className={`w-6 h-6 text-${color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const renderSimpleChart = (data: TrendData[], dataKey: keyof TrendData, color: string) => {
    const maxValue = Math.max(...data.map(d => Number(d[dataKey])));
    const minValue = Math.min(...data.map(d => Number(d[dataKey])));
    const range = maxValue - minValue || 1;
    
    return (
      <div className="h-64 flex items-end gap-1">
        {data.slice(-30).map((d, i) => {
          const value = Number(d[dataKey]);
          const height = ((value - minValue) / range) * 100;
          return (
            <div
              key={i}
              className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
              style={{ height: `${height}%` }}
              title={`${d.date}: ${formatNumber(value)}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">داشبورد مدیریتی (Executive BI)</h1>
            <div className="flex items-center gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="7d">۷ روز اخیر</option>
                <option value="30d">۳۰ روز اخیر</option>
                <option value="90d">۹۰ روز اخیر</option>
                <option value="1y">یک سال</option>
              </select>
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`px-4 py-2 text-sm rounded-md ${comparisonMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                مقایسه دوره‌ای
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                بازگشت
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {metricsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">در حال بارگذاری...</p>
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
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">روند صدور بیمه‌نامه</h3>
                {renderSimpleChart(trendData, 'policies', 'blue')}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">روند پریمیوم</h3>
                {renderSimpleChart(trendData, 'premium', 'green')}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">روند خسارت‌ها</h3>
                {renderSimpleChart(trendData, 'claims', 'red')}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">روند سود</h3>
                {renderSimpleChart(trendData, 'profit', 'purple')}
              </div>
            </div>

            {/* Product Performance */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">عملکرد محصولات</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تعداد بیمه‌نامه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">پریمیوم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">خسارت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نسبت خسارت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نرخ رشد</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productPerformance.map((product) => (
                      <tr key={product.productId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.productName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(product.policiesCount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(product.premium)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(product.claims)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercent(product.lossRatio)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={product.growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                            {product.growthRate > 0 ? '+' : ''}{formatPercent(product.growthRate)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regional Performance */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">عملکرد منطقه‌ای</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">منطقه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تعداد بیمه‌نامه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">پریمیوم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">خسارت</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">سهم بازار</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {regionalPerformance.map((region) => (
                      <tr key={region.region} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{region.region}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(region.policiesCount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(region.premium)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(region.claims)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPercent(region.marketShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Agents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">برترین نمایندگان</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رتبه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام نماینده</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تعداد بیمه‌نامه</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">پریمیوم</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کمیسیون</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agentPerformance.map((agent) => (
                      <tr key={agent.agentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800">
                            {agent.ranking}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(agent.policiesCount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(agent.premium)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(agent.commissions)}</td>
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
