import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Shield, FileText, Activity, Users } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface DashboardStats {
  totalPolicies: number;
  activePolicies: number;
  pendingPolicies: number;
  totalClaims: number;
  pendingClaims: number;
  totalCommission: number;
  pendingCommission: number;
  monthlyPremium: number;
  monthlyIssuance: number;
}

interface PremiumTrendData {
  month: string;
  premium: number;
  policies: number;
}

interface CommissionHistoryData {
  month: string;
  commission: number;
  paid: number;
  pending: number;
}

interface PolicyPortfolioData {
  product: string;
  count: number;
  premium: number;
}

export default function EnhancedDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [premiumTrends, setPremiumTrends] = useState<PremiumTrendData[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistoryData[]>([]);
  const [policyPortfolio, setPolicyPortfolio] = useState<PolicyPortfolioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [statsData, trendsData, commissionData, portfolioData] = await Promise.all([
        agentPortalAPI.getDashboardStats(),
        agentPortalAPI.getPremiumTrends(12),
        agentPortalAPI.getCommissionHistory(12),
        agentPortalAPI.getPolicyPortfolio(),
      ]);

      setStats(statsData);
      setPremiumTrends(trendsData);
      setCommissionHistory(commissionData);
      setPolicyPortfolio(portfolioData);
      setLastUpdate(new Date());
      setIsOnline(true);
    } catch (err) {
      setError('خطا در بارگذاری داده‌های داشبورد');
      setIsOnline(false);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Set up SSE for real-time updates
    const eventSource = agentPortalAPI.connectEventSource((data) => {
      console.log('Real-time update received:', data);
      if (data.type === 'stats_update') {
        setStats(data.payload);
      } else if (data.type === 'policy_update') {
        loadDashboardData();
      }
    });

    // Auto-refresh every 5 minutes
    const refreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(refreshInterval);
    };
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">داشبورد نماینده</h1>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="animate-pulse flex space-x-4">
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">داشبورد نماینده</h1>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">داشبورد نماینده</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              آخرین بروزرسانی: {lastUpdate.toLocaleString('fa-IR')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`h-2 w-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isOnline ? 'آنلاین' : 'آفلاین'}
          </div>
          <button
            onClick={loadDashboardData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="بروزرسانی"
          >
            <Activity className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="بیمه‌نامه‌های فعال"
          value={stats?.activePolicies?.toLocaleString('fa-IR') || '۰'}
          change={`از ${stats?.totalPolicies?.toLocaleString('fa-IR') || '۰'} کل`}
          icon={Shield}
          color="blue"
        />
        <StatCard
          title="پریمیوم ماهانه"
          value={`${(stats?.monthlyPremium || 0).toLocaleString('fa-IR')} تومان`}
          change={`${stats?.monthlyIssuance?.toLocaleString('fa-IR') || '۰'} صدور این ماه`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="کمیسیون قابل پرداخت"
          value={`${(stats?.pendingCommission || 0).toLocaleString('fa-IR')} تومان`}
          change={`کل: ${(stats?.totalCommission || 0).toLocaleString('fa-IR')} تومان`}
          icon={DollarSign}
          color="yellow"
        />
        <StatCard
          title="خسارت‌های ثبت شده"
          value={stats?.totalClaims?.toLocaleString('fa-IR') || '۰'}
          change={`${stats?.pendingClaims?.toLocaleString('fa-IR') || '۰'} در انتظار`}
          icon={FileText}
          color="red"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Premium Trends Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">روند پریمیوم (۱۲ ماه گذشته)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={premiumTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="premium" stroke="#0088FE" name="پریمیوم (تومان)" />
              <Line type="monotone" dataKey="policies" stroke="#00C49F" name="تعداد بیمه‌نامه" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Commission History Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">تاریخچه کمیسیون (۱۲ ماه گذشته)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={commissionHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="commission" fill="#0088FE" name="کل کمیسیون" />
              <Bar dataKey="paid" fill="#00C49F" name="پرداخت شده" />
              <Bar dataKey="pending" fill="#FFBB28" name="در انتظار" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Portfolio Pie Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">سبد بیمه‌نامه‌ها</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={policyPortfolio}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ product, percent }) => `${product} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {policyPortfolio.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Policy Portfolio Bar Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">پریمیوم به تفکیک محصول</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={policyPortfolio} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="product" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="premium" fill="#0088FE" name="پریمیوم (تومان)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">خلاصه وضعیت</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="بیمه‌نامه‌های در انتظار" value={stats?.pendingPolicies?.toLocaleString('fa-IR') || '۰'} />
          <QuickStat label="خسارت‌های در انتظار" value={stats?.pendingClaims?.toLocaleString('fa-IR') || '۰'} />
          <QuickStat label="کمیسیون پرداخت شده" value={`${((stats?.totalCommission || 0) - (stats?.pendingCommission || 0)).toLocaleString('fa-IR')} تومان`} />
          <QuickStat label="نرخ تبدیل" value={`${((stats?.activePolicies || 0) / (stats?.totalPolicies || 1) * 100).toFixed(1)}%`} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{change}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
