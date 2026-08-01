import * as React from 'react';
import { DollarSign, TrendingUp, Award, Target, Trophy, Star } from 'lucide-react';
import { Loading, ErrorBanner, StatusBadge, PageHeader, Table, TableRow, TableCell, Card } from './ui';
import { mockCommissions, mockCommissionHistory, formatToman } from '../lib/mock-data';
import { agentPortalAPI } from '../lib/api';

export function AgentCommissionsPage() {
  const [commissions, setCommissions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    agentPortalAPI.getCommissions()
      .then(data => setCommissions(Array.isArray(data) ? data : []))
      .catch(() => { setCommissions(mockCommissions); })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.commissionAmount, 0);
  const totalPending = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commissionAmount, 0);
  const totalAll = totalPaid + totalPending;
  const achievementRate = Math.round((totalPaid / (totalAll || 1)) * 100);

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="کمیسیون‌ها" subtitle="مدیریت و پیگیری کمیسیون‌های نمایندگی" /><Loading /></div>;
  if (error) return <div className="space-y-4" dir="rtl"><PageHeader title="کمیسیون‌ها" subtitle="مدیریت و پیگیری کمیسیون‌های نمایندگی" /><ErrorBanner error={error} /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="کمیسیون‌ها" subtitle="مدیریت و پیگیری کمیسیون‌های نمایندگی" />

      {/* Summary Cards with Gamification */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-success-subtle">
              <DollarSign className="h-6 w-6 text-feedback-success" />
            </div>
            <p className="mt-3 text-sm text-text-muted">کل کمیسیون</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{formatToman(totalAll)}</p>
          </div>
          <div className="h-1 bg-gradient-to-l from-feedback-success to-brand-primary" />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary-subtle">
              <TrendingUp className="h-6 w-6 text-brand-primary" />
            </div>
            <p className="mt-3 text-sm text-text-muted">پرداخت شده</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{formatToman(totalPaid)}</p>
          </div>
          <div className="h-1 bg-gradient-to-l from-brand-primary to-brand-primary" />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-warning-subtle">
              <Target className="h-6 w-6 text-feedback-warning" />
            </div>
            <p className="mt-3 text-sm text-text-muted">در انتظار</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{formatToman(totalPending)}</p>
          </div>
          <div className="h-1 bg-gradient-to-l from-feedback-warning to-feedback-warning" />
        </Card>

        {/* Gamification Badge */}
        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-feedback-warning">
              <Trophy className="h-6 w-6 text-text-on-brand" />
            </div>
            <p className="mt-3 text-sm text-text-muted">نرخ دستیابی</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{achievementRate}%</p>
            <div className="mt-2 flex items-center gap-1">
              <Star className="h-3 w-3 fill-feedback-warning text-feedback-warning" />
              <Star className="h-3 w-3 fill-feedback-warning text-feedback-warning" />
              <Star className="h-3 w-3 fill-feedback-warning text-feedback-warning" />
              <Star className="h-3 w-3 fill-feedback-warning text-feedback-warning" />
              <Star className="h-3 w-3 text-text-secondary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-feedback-warning" />
            <h3 className="text-sm font-semibold text-text-primary">پیشرفت تحقق کمیسیون</h3>
          </div>
          <span className="text-sm font-bold text-text-primary">{formatToman(totalPaid)} / {formatToman(totalAll)}</span>
        </div>
        <div className="mt-4 h-4 rounded-full bg-bg-base overflow-hidden">
          <div
            className="flex h-full items-center justify-end rounded-full bg-gradient-to-l from-feedback-success via-brand-secondary to-brand-primary pr-2"
            style={{ width: `${achievementRate}%` }}
          >
            <span className="text-[10px] font-bold text-text-on-brand">{achievementRate}%</span>
          </div>
        </div>
      </Card>

      {/* Commission History Mini Chart */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">روند ۶ ماه اخیر</h3>
        <div className="flex items-end gap-3 h-32">
          {mockCommissionHistory.map((t, i) => {
            const maxCom = Math.max(...mockCommissionHistory.map(c => c.commission));
            const heightPct = (t.commission / maxCom) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-text-muted">{formatToman(t.commission).replace(' تومان', '')}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-primary to-brand-secondary" style={{ height: `${heightPct}%` }} />
                <span className="text-[10px] text-text-muted">{t.month}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Commission Table */}
      <Table headers={['بیمه‌نامه', 'نرخ کمیسیون', 'مبلغ کمیسیون', 'تاریخ سررسید', 'وضعیت']}>
        {commissions.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium text-text-primary">{c.policyNumber}</TableCell>
            <TableCell>
              <span className="inline-flex items-center rounded-lg bg-brand-primary-subtle px-2 py-0.5 text-xs font-medium text-brand-primary">
                {(c.commissionRate * 100).toFixed(0)}%
              </span>
            </TableCell>
            <TableCell className="font-medium text-text-primary">{formatToman(c.commissionAmount)}</TableCell>
            <TableCell className="text-text-muted">{c.dueDate}</TableCell>
            <TableCell><StatusBadge status={c.status} /></TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
