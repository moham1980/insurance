import { useState, useEffect } from 'react';
import { StatCard, ProgressBar, Card } from '@insurance/design-system';
import { DollarSign, TrendingUp, Target, Award, Loader2 } from 'lucide-react';
import { agentPortalAPI } from '../../lib/api';
import { mockCommissions, mockDashboardStats } from '../../lib/mock-data';

interface CommissionItem {
  id: string;
  policyNumber: string;
  commissionRate: number;
  commissionAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
}

interface DashboardStats {
  totalCommission: number;
  pendingCommission: number;
  monthlyPremium: number;
  monthlyIssuance: number;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const [commissionsData, statsData] = await Promise.all([
          agentPortalAPI.getCommissions(),
          agentPortalAPI.getDashboardStats(),
        ]);
        setCommissions(commissionsData || []);
        setStats(statsData);
      } catch {
        setCommissions(mockCommissions);
        setStats(mockDashboardStats);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="mr-2 text-sm text-text-secondary">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-feedback-error">
        <p className="font-semibold">خطا در بارگذاری داده</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const totalCommission = stats?.totalCommission ?? commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const pendingTotal = stats?.pendingCommission ?? commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commissionAmount, 0);
  const paidTotal = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">گزارش کمیسیون</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل کمیسیون" value={`${totalCommission.toLocaleString('fa-IR')} تومان`} change="+۱۲٪ نسبت به ماه قبل" changeType="positive" icon={DollarSign} />
        <StatCard title="کمیسیون در انتظار" value={`${pendingTotal.toLocaleString('fa-IR')} تومان`} change="+۵٪" changeType="warning" icon={TrendingUp} />
        <StatCard title="کمیسیون پرداخت‌شده" value={`${paidTotal.toLocaleString('fa-IR')} تومان`} change="+۱۵٪" changeType="positive" icon={Award} />
        <StatCard title="هدف سالانه" value="۷۵٪" change="۳ ماه باقی‌مانده" changeType="neutral" icon={Target} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">پیشرفت اهداف ماهانه</h2>
          <div className="space-y-4">
            <ProgressBar label="بیمه خودرو" value={85} color="brand" />
            <ProgressBar label="بیمه عمر" value={62} color="success" />
            <ProgressBar label="بیمه آتش‌سوزی" value={45} color="warning" />
            <ProgressBar label="بیمه مسئولیت" value={30} color="brand" />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">لیست کمیسیون‌ها</h2>
          {commissions.length === 0 ? (
            <p className="text-sm text-text-muted">هیچ کمیسیونی یافت نشد</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {commissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-bg-subtle">
                  <span className="text-text-secondary">{c.policyNumber}</span>
                  <span className="text-text-primary font-medium">{c.commissionAmount.toLocaleString('fa-IR')} تومان</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'PAID' ? 'bg-feedback-success-subtle text-feedback-success' : c.status === 'PENDING' ? 'bg-feedback-warning-subtle text-feedback-warning' : 'bg-feedback-error-subtle text-feedback-error'}`}>
                    {c.status === 'PAID' ? 'پرداخت‌شده' : c.status === 'PENDING' ? 'در انتظار' : 'لغو شده'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

