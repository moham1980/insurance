import * as React from 'react';
import { Briefcase, TrendingUp } from 'lucide-react';
import { Card, PageHeader, Loading } from './ui';
import { mockPolicyPortfolio, formatToman } from '../lib/mock-data';
import { agentPortalAPI } from '../lib/api';

export function AgentPortfolioPage() {
  const [loading, setLoading] = React.useState(true);
  const [portfolio, setPortfolio] = React.useState(mockPolicyPortfolio);

  React.useEffect(() => {
    agentPortalAPI.getPolicyPortfolio()
      .then(data => setPortfolio(Array.isArray(data) ? data : mockPolicyPortfolio))
      .catch(() => setPortfolio(mockPolicyPortfolio))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4" dir="rtl"><PageHeader title="پورتفولیو" subtitle="نمای کلی پورتفولیو بیمه‌نامه‌ها" /><Loading /></div>;

  const totalPolicies = portfolio.reduce((s, p) => s + p.count, 0);
  const totalPremium = portfolio.reduce((s, p) => s + p.premium, 0);
  const colors = ['from-brand-primary to-brand-primary', 'from-feedback-success to-feedback-success', 'from-feedback-warning to-feedback-warning', 'from-brand-secondary to-brand-secondary', 'from-feedback-error to-feedback-error'];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="پورتفولیو" subtitle="نمای کلی پورتفولیو بیمه‌نامه‌ها" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary-subtle">
            <Briefcase className="h-6 w-6 text-brand-primary" />
          </div>
          <p className="mt-3 text-sm text-text-muted">تعداد کل بیمه‌نامه‌ها</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalPolicies}</p>
        </Card>
        <Card className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-success-subtle">
            <TrendingUp className="h-6 w-6 text-feedback-success" />
          </div>
          <p className="mt-3 text-sm text-text-muted">کل حق بیمه</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{formatToman(totalPremium)}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {portfolio.map((p, i) => {
          const pct = Math.round((p.count / totalPolicies) * 100);
          return (
            <Card key={i} className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-l ${colors[i % colors.length]}`} />
              <div className="p-5">
                <h3 className="text-sm font-semibold text-text-primary">{p.product}</h3>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-text-muted">تعداد</p>
                    <p className="text-xl font-bold text-text-primary">{p.count}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-text-muted">حق بیمه</p>
                    <p className="text-sm font-medium text-text-secondary">{formatToman(p.premium)}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-bg-base overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-l ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-text-muted">{pct}% از کل</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
