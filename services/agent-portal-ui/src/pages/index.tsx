import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LogIn, Shield, DollarSign, FileText, LogOut, Briefcase, Target } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';
import EnhancedDashboard from '../components/EnhancedDashboard';
import PortfolioPage from './portfolio';
import LeadsPage from './leads';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function AgentPortal() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    // Check if user is already logged in (token in cookie)
    const tokenMatch = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )auth-token=([^;]+)')) : null;
    const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
    const agentId = getCookie('agent_id');
    const partnerId = getCookie('partner_id');
    const tenantId = getCookie('tenant_id');
    if (token && agentId && partnerId) {
      agentPortalAPI.setAuth(token, agentId, partnerId, tenantId || undefined);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (token: string, agentId: string, partnerId: string, tenantId: string) => {
    document.cookie = `auth-token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax${process.env.NODE_ENV === 'production' ? '; secure' : ''}`;
    document.cookie = `agent_id=${encodeURIComponent(agentId)}; path=/; max-age=86400; samesite=lax`;
    document.cookie = `partner_id=${encodeURIComponent(partnerId)}; path=/; max-age=86400; samesite=lax`;
    document.cookie = `tenant_id=${encodeURIComponent(tenantId)}; path=/; max-age=86400; samesite=lax`;
    agentPortalAPI.setAuth(token, agentId, partnerId, tenantId);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    document.cookie = 'auth-token=; Max-Age=0; path=/';
    document.cookie = 'agent_id=; Max-Age=0; path=/';
    document.cookie = 'partner_id=; Max-Age=0; path=/';
    document.cookie = 'tenant_id=; Max-Age=0; path=/';
    agentPortalAPI.clearAuth();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">پرتال نماینده</span>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'dashboard' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="h-5 w-5 ml-2" />
                داشبورد
              </button>
              <button
                onClick={() => setCurrentPage('policies')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'policies' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-5 w-5 ml-2" />
                بیمه‌نامه‌ها
              </button>
              <button
                onClick={() => setCurrentPage('commissions')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'commissions' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="h-5 w-5 ml-2" />
                کمیسیون‌ها
              </button>
              <button
                onClick={() => setCurrentPage('portfolio')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'portfolio' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="h-5 w-5 ml-2" />
                پورتفولیو
              </button>
              <button
                onClick={() => setCurrentPage('leads')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'leads' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Target className="h-5 w-5 ml-2" />
                سرنخ‌ها
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 ml-2" />
                خروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentPage === 'dashboard' && <EnhancedDashboard />}
        {currentPage === 'policies' && <PoliciesPage />}
        {currentPage === 'commissions' && <CommissionsPage />}
        {currentPage === 'portfolio' && <PortfolioPage />}
        {currentPage === 'leads' && <LeadsPage />}
      </main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (token: string, agentId: string, partnerId: string, tenantId: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await agentPortalAPI.login(username, password);
      onLogin(result.token, result.agentId, result.partnerId, result.tenantId);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به سیستم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <Shield className="h-16 w-16 text-primary-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">پرتال نماینده</h2>
          <p className="mt-2 text-gray-600">ورود به سیستم</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              نام کاربری
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                در حال ورود...
              </div>
            ) : (
              'ورود'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPolicies() {
      try {
        setLoading(true);
        const data = await agentPortalAPI.getPolicies();
        setPolicies(data);
      } catch (err) {
        setError('خطا در بارگذاری بیمه‌نامه‌ها');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">بیمه‌نامه‌ها</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">بیمه‌نامه‌ها</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">بیمه‌نامه‌ها</h1>
      {policies.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          هیچ بیمه‌نامه‌ای یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">بیمه‌گذار</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">پریمیوم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ شروع</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <PolicyRow
                  key={policy.id}
                  number={policy.policyNumber}
                  type={policy.product}
                  customer={policy.customerName}
                  status={policy.status}
                  premium={policy.premium}
                  startDate={policy.issueDate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CommissionsPage() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCommissions() {
      try {
        setLoading(true);
        const data = await agentPortalAPI.getCommissions();
        setCommissions(data);
      } catch (err) {
        setError('خطا در بارگذاری کمیسیون‌ها');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCommissions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">کمیسیون‌ها</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">کمیسیون‌ها</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">کمیسیون‌ها</h1>
      {commissions.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          هیچ کمیسیونی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">بیمه‌نامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نرخ کمیسیون</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبلغ کمیسیون</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ سررسید</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions.map((commission) => (
                <CommissionRow
                  key={commission.id}
                  policy={commission.policyNumber}
                  rate={(commission.commissionRate * 100).toFixed(0) + '%'}
                  amount={commission.commissionAmount.toLocaleString('fa-IR') + ' تومان'}
                  dueDate={commission.dueDate}
                  status={commission.status}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PolicyRow({ number, type, customer, status, premium, startDate }: { number: string; type: string; customer: string; status: string; premium: number; startDate: string }) {
  const statusColors: Record<string, string> = {
    'ACTIVE': 'bg-green-100 text-green-800',
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'EXPIRED': 'bg-gray-100 text-gray-800',
    'CANCELLED': 'bg-red-100 text-red-800',
  };
  const statusLabels: Record<string, string> = {
    'ACTIVE': 'فعال',
    'PENDING': 'در انتظار',
    'EXPIRED': 'منقضی',
    'CANCELLED': 'لغو شده',
  };
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{number}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
          {statusLabels[status] || status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{premium.toLocaleString('fa-IR')} تومان</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{startDate}</td>
    </tr>
  );
}

function CommissionRow({ policy, rate, amount, dueDate, status }: { policy: string; rate: string; amount: string; dueDate: string; status: string }) {
  const statusColors: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'PAID': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
  };
  const statusLabels: Record<string, string> = {
    'PENDING': 'در انتظار',
    'PAID': 'پرداخت شده',
    'CANCELLED': 'لغو شده',
  };
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{policy}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{amount}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dueDate}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
          {statusLabels[status] || status}
        </span>
      </td>
    </tr>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
