import * as React from 'react';
import {
  TrendingUp, DollarSign, Shield, FileText, Activity, Target,
  Award, Clock, ChevronLeft, Zap, ArrowUpRight,
} from 'lucide-react';
import { Card } from './ui';
import {
  mockDashboardStats, mockPremiumTrends, mockCommissionHistory,
  mockPolicyPortfolio, mockNbaActions, formatToman,
} from '../lib/mock-data';

export function AgentDashboardPage() {
  const stats = mockDashboardStats;
  const maxPremium = Math.max(...mockPremiumTrends.map((t) => t.premium));
  const maxCommission = Math.max(...mockCommissionHistory.map((t) => t.commission));
  const totalPortfolio = mockPolicyPortfolio.reduce((sum, p) => sum + p.count, 0);

  const cards = [
    { label: 'بیمه‌نامه‌های فعال', value: stats.activePolicies, change: '+۱۲%', icon: FileText, color: 'from-brand-primary to-brand-primary', bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
    { label: 'خسارت‌های جاری', value: stats.pendingClaims, change: '-۳%', icon: Shield, color: 'from-feedback-warning to-feedback-warning', bg: 'bg-feedback-warning-subtle', textColor: 'text-feedback-warning' },
    { label: 'کمیسیون کل', value: formatToman(stats.totalCommission), change: '+۸%', icon: DollarSign, color: 'from-feedback-success to-feedback-success', bg: 'bg-feedback-success-subtle', textColor: 'text-feedback-success' },
    { label: 'صدور ماهانه', value: stats.monthlyIssuance + ' بیمه‌نامه', change: '+۵%', icon: TrendingUp, color: 'from-brand-secondary to-brand-secondary', bg: 'bg-brand-secondary-subtle', textColor: 'text-brand-secondary' },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">داشبورد نماینده</h1>
        <p className="mt-1 text-sm text-text-muted">نمای کلی عملکرد و فعالیت‌های نمایندگی</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                    <Icon className={`h-6 w-6 ${c.textColor}`} />
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-feedback-success-subtle px-2 py-0.5 text-xs font-medium text-feedback-success">
                    <ArrowUpRight className="h-3 w-3" />
                    {c.change}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-muted">{c.label}</p>
                <p className="mt-1 text-xl font-bold text-text-primary">{c.value}</p>
              </div>
              <div className={`h-1 bg-gradient-to-l ${c.color}`} />
            </Card>
          );
        })}
      </div>

      {/* Target Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">پیشرفت هدف ماهانه</h3>
            <p className="mt-1 text-xs text-text-muted">هدف صدور: ۳۰ بیمه‌نامه</p>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand-primary" />
            <span className="text-2xl font-bold text-text-primary">{stats.targetProgress}%</span>
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-bg-base">
          <div
            className="flex h-full items-center justify-end rounded-full bg-gradient-to-l from-brand-primary to-brand-primary pr-2"
            style={{ width: `${stats.targetProgress}%` }}
          >
            <span className="text-[10px] font-bold text-text-on-brand">{stats.monthlyIssuance}/۳۰</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Premium Trends Chart */}
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">روند حق بیمه</h3>
            <TrendingUp className="h-5 w-5 text-text-muted" />
          </div>
          <div className="space-y-3">
            {mockPremiumTrends.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-20 text-xs text-text-muted">{t.month}</span>
                <div className="flex-1">
                  <div className="h-7 rounded-lg bg-bg-base overflow-hidden">
                    <div
                      className="flex h-full items-center rounded-lg bg-gradient-to-l from-brand-primary to-brand-secondary px-2"
                      style={{ width: `${(t.premium / maxPremium) * 100}%` }}
                    >
                      <span className="text-[10px] font-medium text-text-on-brand">{formatToman(t.premium)}</span>
                    </div>
                  </div>
                </div>
                <span className="w-12 text-xs font-medium text-text-muted">{t.policies} مورد</span>
              </div>
            ))}
          </div>
        </Card>

        {/* NBA Actions */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-feedback-warning" />
            <h3 className="text-sm font-semibold text-text-primary">اقدامات پیشنهادی هوشمند</h3>
          </div>
          <div className="space-y-3">
            {mockNbaActions.map((a) => {
              const priorityColor = a.priority === 'بحرانی' ? 'border-r-feedback-error bg-feedback-error-subtle' :
                a.priority === 'بالا' ? 'border-r-feedback-warning bg-feedback-warning-subtle' : 'border-r-brand-primary bg-brand-primary-subtle';
              return (
                <div key={a.id} className={`rounded-xl border-r-4 ${priorityColor} p-3`}>
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-semibold text-text-primary">{a.title}</h4>
                    <span className="text-[10px] font-medium text-text-muted">{a.priority}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">{a.description}</p>
                  <button className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand-primary hover:text-brand-primary">
                    {a.action}
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Commission History */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">تاریخچه کمیسیون</h3>
            <DollarSign className="h-5 w-5 text-text-muted" />
          </div>
          <div className="space-y-3">
            {mockCommissionHistory.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-20 text-xs text-text-muted">{t.month}</span>
                <div className="flex-1">
                  <div className="h-6 rounded-lg bg-bg-base overflow-hidden">
                    <div
                      className="flex h-full items-center rounded-lg bg-gradient-to-l from-feedback-success to-brand-secondary px-2"
                      style={{ width: `${(t.commission / maxCommission) * 100}%` }}
                    >
                      <span className="text-[10px] font-medium text-text-on-brand">{formatToman(t.commission)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="rounded bg-feedback-success-subtle px-1.5 py-0.5 text-[10px] text-feedback-success">{formatToman(t.paid)}</span>
                  {t.pending > 0 && <span className="rounded bg-feedback-warning-subtle px-1.5 py-0.5 text-[10px] text-feedback-warning">{formatToman(t.pending)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Portfolio Distribution */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">توزیع پورتفولیو</h3>
            <Activity className="h-5 w-5 text-text-muted" />
          </div>
          <div className="space-y-3">
            {mockPolicyPortfolio.map((p, i) => {
              const colors = ['bg-brand-primary', 'bg-feedback-success', 'bg-feedback-warning', 'bg-brand-secondary', 'bg-feedback-error'];
              const percentage = Math.round((p.count / totalPortfolio) * 100);
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-text-secondary">{p.product}</span>
                    <span className="text-text-muted">{p.count} بیمه‌نامه ({percentage}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-bg-base overflow-hidden">
                    <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
