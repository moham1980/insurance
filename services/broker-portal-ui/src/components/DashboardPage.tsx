import * as React from 'react';
import { Briefcase, FileText, ShieldAlert, CreditCard, Scale, RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card, StatCard } from './ui';
import { mockDashboard, formatToman } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

export function DashboardPage({ data }: { data: any }) {
  const [stats, setStats] = React.useState<any>(data || mockDashboard.stats);

  React.useEffect(() => {
    if (!data) {
      brokerApi.getDashboard()
        .then(r => setStats(r.data?.stats || r.data || mockDashboard.stats))
        .catch(() => setStats(mockDashboard.stats));
    }
  }, [data]);

  const cards = [
    { label: 'قراردادهای فعال', value: stats.activeAgreements ?? mockDashboard.stats.activeAgreements, icon: Briefcase },
    { label: 'بیمه‌نامه‌های فعال', value: stats.activePolicies ?? mockDashboard.stats.activePolicies, icon: FileText },
    { label: 'خسارت‌های جاری', value: stats.openClaims ?? stats.activeClaims ?? mockDashboard.stats.openClaims, icon: ShieldAlert },
    { label: 'پرداخت‌های در انتظار', value: stats.pendingPayments ?? stats.totalPayments ?? mockDashboard.stats.pendingPayments, icon: CreditCard },
    { label: 'درخواست‌های بیمه‌نامه‌گذاری', value: stats.underwritingQueue ?? stats.underwritingRequests ?? mockDashboard.stats.underwritingQueue, icon: Scale },
    { label: 'وصول مطالبات', value: stats.pendingCollections ?? stats.collectionsPlans ?? mockDashboard.stats.pendingCollections, icon: RefreshCw },
  ];

  const trends = mockDashboard.trends;
  const maxPremium = Math.max(...trends.map((t) => t.premium));
  const maxPolicies = Math.max(...trends.map((t) => t.policies));

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">داشبورد کارگزاری</h1>
        <p className="mt-1 text-sm text-text-muted">نمای کلی عملکرد کارگزاری</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const value = typeof c.value === 'number' ? new Intl.NumberFormat('fa-IR').format(c.value) : c.value;
          return (
            <StatCard
              key={c.label}
              title={c.label}
              value={value}
              icon={Icon}
              className="border border-border-default"
            />
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">روند صدور بیمه‌نامه</h2>
            <Activity className="h-5 w-5 text-text-muted" />
          </div>
          <div className="space-y-3">
            {trends.map((t) => (
              <div key={t.month} className="flex items-center gap-3">
                <span className="w-20 text-sm text-text-secondary">{t.month}</span>
                <div className="flex-1">
                  <div className="h-8 rounded-lg bg-bg-subtle overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-brand-primary to-brand-secondary rounded-lg flex items-center justify-start pr-2"
                      style={{ width: `${(t.policies / maxPolicies) * 100}%` }}
                    >
                      <span className="text-xs font-medium text-text-on-brand">{t.policies}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">روند حق بیمه</h2>
            <TrendingUp className="h-5 w-5 text-feedback-success" />
          </div>
          <div className="space-y-3">
            {trends.map((t) => (
              <div key={t.month} className="flex items-center gap-3">
                <span className="w-20 text-sm text-text-secondary">{t.month}</span>
                <div className="flex-1">
                  <div className="h-8 rounded-lg bg-bg-subtle overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-feedback-success to-brand-secondary rounded-lg flex items-center justify-start pr-2"
                      style={{ width: `${(t.premium / maxPremium) * 100}%` }}
                    >
                      <span className="text-xs font-medium text-text-on-brand">{formatToman(t.premium)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">فعالیت‌های اخیر</h2>
        <div className="space-y-3">
          {mockDashboard.recentActivity.map((activity, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-subtle/50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{activity.description}</p>
                <p className="text-xs text-text-muted">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
