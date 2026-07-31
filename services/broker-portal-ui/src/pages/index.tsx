import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, ShieldAlert, CreditCard, Scale,
  RefreshCw, Gavel, Briefcase, BarChart3, Users, LogOut, Loader2,
  AlertCircle, ChevronLeft, Check, X, Plus
} from 'lucide-react';
import { brokerApi } from '../lib/api';

type Page = 'dashboard' | 'claims' | 'policies' | 'payments' | 'underwriting' | 'collections' | 'regulatory';

const navItems: { key: Page; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'claims', label: 'خسارت‌ها', icon: ShieldAlert },
  { key: 'policies', label: 'بیمه‌نامه‌ها', icon: FileText },
  { key: 'payments', label: 'پرداخت‌ها', icon: CreditCard },
  { key: 'underwriting', label: 'بیمه‌نامه‌گذاری', icon: Scale },
  { key: 'collections', label: 'وصول مطالبات', icon: RefreshCw },
  { key: 'regulatory', label: 'نظارتی', icon: Gavel },
];

export default function BrokerPortal() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    if (tokenMatch) {
      setToken(decodeURIComponent(tokenMatch[2]));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (t: string) => {
    setToken(t);
    setIsLoggedIn(true);
    document.cookie = `auth-token=${encodeURIComponent(t)}; path=/; max-age=86400`;
  };

  const handleLogout = () => {
    document.cookie = 'auth-token=; Max-Age=0; path=/';
    setToken('');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary-600" />
              <span className="text-lg font-bold text-gray-900">پرتال کارگزاری</span>
            </div>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setCurrentPage(item.key)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      currentPage === item.key ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 ml-1.5" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 ml-1.5" />
                خروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'claims' && <ClaimsPage />}
        {currentPage === 'policies' && <PoliciesPage />}
        {currentPage === 'payments' && <PaymentsPage />}
        {currentPage === 'underwriting' && <UnderwritingPage />}
        {currentPage === 'collections' && <CollectionsPage />}
        {currentPage === 'regulatory' && <RegulatoryPage />}
      </main>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <div className="flex items-center gap-2 mb-6">
          <Briefcase className="h-8 w-8 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">پرتال کارگزاری</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">برای ورود توکن احراز هویت خود را وارد کنید</p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Bearer token"
          className="w-full border border-gray-300 rounded-md p-2 text-sm mb-4"
        />
        <button
          onClick={() => onLogin(token)}
          disabled={!token}
          className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          ورود
        </button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      <AlertCircle className="h-5 w-5" />
      {error}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    open: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
      {status || '-'}
    </span>
  );
}

function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    brokerApi.getDashboard().then(r => setData(r.data)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBanner error={error} />;

  const stats = data || {};
  const cards = [
    { label: 'قراردادهای فعال', value: stats.activeAgreements ?? '-', icon: Briefcase },
    { label: 'بیمه‌نامه‌ها', value: stats.activePolicies ?? '-', icon: FileText },
    { label: 'خسارت‌های جاری', value: stats.activeClaims ?? '-', icon: ShieldAlert },
    { label: 'پرداخت‌ها', value: stats.totalPayments ?? '-', icon: CreditCard },
    { label: 'درخواست‌های بیمه‌نامه‌گذاری', value: stats.underwritingRequests ?? '-', icon: Scale },
    { label: 'وصول مطالبات', value: stats.collectionsPlans ?? '-', icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">داشبورد کارگزاری</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{c.label}</p>
                  <p className="text-xl font-bold text-gray-900">{c.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    brokerApi.listClaims().then(r => setClaims(r.data?.rows || r.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await brokerApi.approveClaim(id, { approved: true });
      const r = await brokerApi.listClaims();
      setClaims(r.data?.rows || r.data || []);
      setSelectedClaim(null);
    } catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionLoading(true);
    try {
      await brokerApi.rejectClaim(id, { reason });
      const r = await brokerApi.listClaims();
      setClaims(r.data?.rows || r.data || []);
      setSelectedClaim(null);
    } catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  if (selectedClaim) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedClaim(null)} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <ClaimDetail claim={selectedClaim} onApprove={handleApprove} onReject={handleReject} actionLoading={actionLoading} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">خسارت‌ها</h1>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : claims.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <ShieldAlert className="mx-auto mb-2 h-10 w-10 opacity-50" />
          خسارتی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مشتری</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاریخ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {claims.map((c) => (
                <tr key={c.id} onClick={() => setSelectedClaim(c)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.claimNumber || c.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.customerName || c.partyName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.claimType || c.type || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.createdAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClaimDetail({ claim, onApprove, onReject, actionLoading }: { claim: any; onApprove: (id: string) => void; onReject: (id: string, reason: string) => void; actionLoading: boolean }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">جزئیات خسارت</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">شماره:</span> <span className="font-medium">{claim.claimNumber || claim.id}</span></div>
          <div><span className="text-gray-500">وضعیت:</span> <StatusBadge status={claim.status} /></div>
          <div><span className="text-gray-500">نوع:</span> <span className="font-medium">{claim.claimType || '-'}</span></div>
          <div><span className="text-gray-500">مبلغ:</span> <span className="font-medium">{claim.amount ? `${Number(claim.amount).toLocaleString('fa-IR')} تومان` : '-'}</span></div>
          <div><span className="text-gray-500">تاریخ:</span> <span className="font-medium">{claim.createdAt || '-'}</span></div>
          <div><span className="text-gray-500">شرح:</span> <span className="font-medium">{claim.description || '-'}</span></div>
        </div>
      </div>
      {showReject ? (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">دلیل رد</h3>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={3} />
          <div className="flex gap-2">
            <button onClick={() => setShowReject(false)} className="px-3 py-1.5 text-sm text-gray-600 rounded">انصراف</button>
            <button onClick={() => onReject(claim.id, rejectReason)} disabled={actionLoading || !rejectReason} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded disabled:opacity-50">
              {actionLoading ? 'در حال...' : 'رد خسارت'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onApprove(claim.id)} disabled={actionLoading} className="flex items-center gap-1 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            <Check className="h-4 w-4" /> {actionLoading ? 'در حال...' : 'تأیید خسارت'}
          </button>
          <button onClick={() => setShowReject(true)} disabled={actionLoading} className="flex items-center gap-1 px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
            <X className="h-4 w-4" /> رد خسارت
          </button>
        </div>
      )}
    </div>
  );
}

function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [endorsements, setEndorsements] = useState<any[]>([]);

  useEffect(() => {
    brokerApi.listPolicies().then(r => setPolicies(r.data?.rows || r.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleSelectPolicy = async (p: any) => {
    setSelectedPolicy(p);
    try {
      const r = await brokerApi.listPolicyEndorsements(p.id);
      setEndorsements(r.data?.rows || r.data || []);
    } catch { setEndorsements([]); }
  };

  if (selectedPolicy) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedPolicy(null)} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">جزئیات بیمه‌نامه</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">شماره:</span> <span className="font-medium">{selectedPolicy.policyNumber || selectedPolicy.id}</span></div>
            <div><span className="text-gray-500">وضعیت:</span> <StatusBadge status={selectedPolicy.status} /></div>
            <div><span className="text-gray-500">محصول:</span> <span className="font-medium">{selectedPolicy.product || '-'}</span></div>
            <div><span className="text-gray-500">پریمیوم:</span> <span className="font-medium">{selectedPolicy.premium ? `${Number(selectedPolicy.premium).toLocaleString('fa-IR')}` : '-'}</span></div>
            <div><span className="text-gray-500">شروع:</span> <span className="font-medium">{selectedPolicy.startDate || '-'}</span></div>
            <div><span className="text-gray-500">پایان:</span> <span className="font-medium">{selectedPolicy.endDate || '-'}</span></div>
          </div>
        </div>
        {endorsements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">الحاقیه‌ها</h3>
            <div className="space-y-2">
              {endorsements.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-sm text-gray-700">{e.endorsementType || e.type || '-'}</span>
                  <StatusBadge status={e.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">بیمه‌نامه‌ها</h1>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : policies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
          بیمه‌نامه‌ای یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">محصول</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">پایان</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((p) => (
                <tr key={p.id} onClick={() => handleSelectPolicy(p)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.policyNumber || p.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.product || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.endDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    brokerApi.listPayments(statusFilter ? { status: statusFilter } : undefined)
      .then(r => setPayments(r.data?.rows || r.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">پرداخت‌ها</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">همه</option>
          <option value="paid">پرداخت شده</option>
          <option value="pending">در انتظار</option>
          <option value="overdue">سررسید گذشته</option>
        </select>
      </div>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <CreditCard className="mx-auto mb-2 h-10 w-10 opacity-50" />
          پرداختی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شناسه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">بیمه‌نامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاریخ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.policyId || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.amount ? `${Number(p.amount).toLocaleString('fa-IR')}` : '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.dueDate || p.createdAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UnderwritingPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [appealReason, setAppealReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    brokerApi.listUnderwriting().then(r => setRequests(r.data?.rows || r.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleAppeal = async () => {
    if (!selected || !appealReason) return;
    setActionLoading(true);
    try {
      await brokerApi.appealUnderwriting(selected.id, appealReason);
      const r = await brokerApi.listUnderwriting();
      setRequests(r.data?.rows || r.data || []);
      setSelected(null);
      setAppealReason('');
    } catch (e: any) { setError(e.message); } finally { setActionLoading(false); }
  };

  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">جزئیات درخواست بیمه‌نامه‌گذاری</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">شناسه:</span> <span className="font-medium">{selected.id}</span></div>
            <div><span className="text-gray-500">وضعیت:</span> <StatusBadge status={selected.status} /></div>
            <div><span className="text-gray-500">بیمه‌نامه:</span> <span className="font-medium">{selected.policyId || '-'}</span></div>
            <div><span className="text-gray-500">تصمیم:</span> <span className="font-medium">{selected.decision || '-'}</span></div>
          </div>
          {selected.reason && <p className="mt-3 text-sm text-gray-600">{selected.reason}</p>}
        </div>
        {selected.status?.toLowerCase() === 'rejected' && (
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">درخواست تجدید نظر</h3>
            <textarea value={appealReason} onChange={e => setAppealReason(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={3} placeholder="دلیل تجدید نظر..." />
            <button onClick={handleAppeal} disabled={actionLoading || !appealReason} className="px-4 py-2 text-sm bg-primary-600 text-white rounded disabled:opacity-50">
              {actionLoading ? 'در حال...' : 'ثبت درخواست'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">بیمه‌نامه‌گذاری</h1>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <Scale className="mx-auto mb-2 h-10 w-10 opacity-50" />
          درخواستی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شناسه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">بیمه‌نامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تصمیم</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.policyId || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.decision || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CollectionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [installments, setInstallments] = useState<any[]>([]);

  useEffect(() => {
    brokerApi.listCollectionsPlans().then(r => setPlans(r.data?.rows || r.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = async (p: any) => {
    setSelectedPlan(p);
    try {
      const r = await brokerApi.listCollectionsInstallments(p.id);
      setInstallments(r.data?.rows || r.data || []);
    } catch { setInstallments([]); }
  };

  if (selectedPlan) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedPlan(null)} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">جزئیات طرح وصول</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">شناسه:</span> <span className="font-medium">{selectedPlan.id}</span></div>
            <div><span className="text-gray-500">بیمه‌نامه:</span> <span className="font-medium">{selectedPlan.policyId || '-'}</span></div>
            <div><span className="text-gray-500">وضعیت:</span> <StatusBadge status={selectedPlan.status} /></div>
            <div><span className="text-gray-500">مبلغ کل:</span> <span className="font-medium">{selectedPlan.totalAmount ? `${Number(selectedPlan.totalAmount).toLocaleString('fa-IR')}` : '-'}</span></div>
          </div>
        </div>
        {installments.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">اقساط</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">قسط</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">سررسید</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {installments.map((inst, idx) => (
                  <tr key={inst.id || idx}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{inst.installmentNumber || idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{inst.amount ? `${Number(inst.amount).toLocaleString('fa-IR')}` : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{inst.dueDate || '-'}</td>
                    <td className="px-6 py-4"><StatusBadge status={inst.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">وصول مطالبات</h1>
      {error && <ErrorBanner error={error} />}
      {loading ? <Loading /> : plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <RefreshCw className="mx-auto mb-2 h-10 w-10 opacity-50" />
          طرح وصولی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شناسه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">بیمه‌نامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ کل</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((p) => (
                <tr key={p.id} onClick={() => handleSelectPlan(p)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.policyId || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.totalAmount ? `${Number(p.totalAmount).toLocaleString('fa-IR')}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RegulatoryPage() {
  const [tab, setTab] = useState<'license' | 'sanhab' | 'warehouse'>('license');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [licenseData, setLicenseData] = useState({ brokerCentralCode: '', licenseNumber: '' });
  const [sanhabData, setSanhabData] = useState({ nationalId: '', inquiryType: '' });
  const [warehouseData, setWarehouseData] = useState({ nationalId: '', licenseNumber: '', warehouseId: '' });

  const handleValidateLicense = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await brokerApi.validateBrokerLicense(licenseData);
      setResult(r.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleSanhabInquiry = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await brokerApi.sanhabInquiry(sanhabData);
      setResult(r.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleWarehouseInquiry = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await brokerApi.warehouseFireInquiry(warehouseData);
      setResult(r.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">امور نظارتی</h1>
      <div className="flex gap-1 border-b">
        {[
          { key: 'license' as const, label: 'اعتبارسنجی پروانه' },
          { key: 'sanhab' as const, label: 'استعلام سنهاب' },
          { key: 'warehouse' as const, label: 'استعلام آتش‌سوزی انبار' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner error={error} />}

      {tab === 'license' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">کد مرکزی کارگزاری</label>
              <input value={licenseData.brokerCentralCode} onChange={e => setLicenseData({ ...licenseData, brokerCentralCode: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">شماره پروانه</label>
              <input value={licenseData.licenseNumber} onChange={e => setLicenseData({ ...licenseData, licenseNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
          </div>
          <button onClick={handleValidateLicense} disabled={loading} className="px-4 py-2 text-sm bg-primary-600 text-white rounded disabled:opacity-50">
            {loading ? 'در حال...' : 'اعتبارسنجی'}
          </button>
        </div>
      )}

      {tab === 'sanhab' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">کد ملی</label>
              <input value={sanhabData.nationalId} onChange={e => setSanhabData({ ...sanhabData, nationalId: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">نوع استعلام</label>
              <select value={sanhabData.inquiryType} onChange={e => setSanhabData({ ...sanhabData, inquiryType: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm">
                <option value="">انتخاب...</option>
                <option value="CLAIM_HISTORY">تاریخچه خسارت</option>
                <option value="POLICY_STATUS">وضعیت بیمه‌نامه</option>
              </select>
            </div>
          </div>
          <button onClick={handleSanhabInquiry} disabled={loading} className="px-4 py-2 text-sm bg-primary-600 text-white rounded disabled:opacity-50">
            {loading ? 'در حال...' : 'استعلام'}
          </button>
        </div>
      )}

      {tab === 'warehouse' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500">کد ملی</label>
              <input value={warehouseData.nationalId} onChange={e => setWarehouseData({ ...warehouseData, nationalId: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">شماره پروانه</label>
              <input value={warehouseData.licenseNumber} onChange={e => setWarehouseData({ ...warehouseData, licenseNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">شناسه انبار</label>
              <input value={warehouseData.warehouseId} onChange={e => setWarehouseData({ ...warehouseData, warehouseId: e.target.value })}
                className="w-full border border-gray-300 rounded-md p-2 text-sm" />
            </div>
          </div>
          <button onClick={handleWarehouseInquiry} disabled={loading} className="px-4 py-2 text-sm bg-primary-600 text-white rounded disabled:opacity-50">
            {loading ? 'در حال...' : 'استعلام'}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">نتیجه</h3>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
