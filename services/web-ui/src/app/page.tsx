import { OverviewCards } from '@/components/overview-cards';
import { FileText, ShieldAlert, Scale, TrendingUp, Users, Building2, Gavel, Wallet, BarChart3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@insurance/design-system';

const stats = [
  { label: 'سازمان‌های فعال', value: '۱۲', icon: Building2, bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
  { label: 'قراردادهای توزیع', value: '۳۴', icon: FileText, bg: 'bg-brand-secondary-subtle', textColor: 'text-brand-secondary' },
  { label: 'صف بیمه‌نامه‌گذاری', value: '۱۸', icon: Scale, bg: 'bg-feedback-warning-subtle', textColor: 'text-feedback-warning' },
  { label: 'خسارت‌های باز', value: '۴۷', icon: ShieldAlert, bg: 'bg-feedback-error-subtle', textColor: 'text-feedback-error' },
  { label: 'تسویه پورسانت', value: '۹', icon: Wallet, bg: 'bg-feedback-success-subtle', textColor: 'text-feedback-success' },
  { label: 'گزارش‌های نظارتی', value: '۶', icon: Gavel, bg: 'bg-brand-primary-subtle', textColor: 'text-brand-primary' },
];

const quickLinks = [
  { label: 'مدیریت سازمان', href: '/org-units', icon: Building2, desc: 'تنظیمات tenant و سلسله‌مراتب' },
  { label: 'بیمه‌نامه‌گذاری', href: '/underwriting', icon: Scale, desc: 'صف ارزیابی ریسک و تصمیم‌گیری' },
  { label: 'خسارت‌ها', href: '/claims', icon: ShieldAlert, desc: 'مدیریت پرونده‌های خسارت' },
  { label: 'کلاه‌برداری', href: '/fraud', icon: AlertTriangle, desc: 'پایش و تشخیص تقلب' },
  { label: 'پرداخت‌ها', href: '/payments', icon: Wallet, desc: 'تسویه و وصول مطالبات' },
  { label: 'گزارش‌گیری', href: '/reporting', icon: BarChart3, desc: 'گزارش‌های مدیریتی و BI' },
  { label: 'بیمه‌نامه‌ها', href: '/policies', icon: FileText, desc: 'مدیریت بیمه‌نامه‌های صادر شده' },
  { label: 'ارزیابان خسارت', href: '/loss-adjuster', icon: Users, desc: 'مدیریت ارزیابان و مأموریت‌ها' },
];

const recentActivities = [
  { description: 'صدور بیمه‌نامه B-1403-0456 توسط بیمه ایران', time: '۱۰ دقیقه پیش', status: 'success' },
  { description: 'تأیید خسارت CLM-9231 - مبلغ ۱۲ میلیون تومان', time: '۲۵ دقیقه پیش', status: 'success' },
  { description: 'ارجاع درخواست UW-034 به ارزیاب ارشد', time: '۱ ساعت پیش', status: 'pending' },
  { description: 'گزارش نظارتی ماهانه به بیمه مرکزی ارسال شد', time: '۲ ساعت پیش', status: 'success' },
  { description: 'هشدار تقلب روی خسارت CLM-9235', time: '۳ ساعت پیش', status: 'warning' },
  { description: 'تسویه پورسانت فصل تابستان - ۲۴ بیمه‌نامه', time: '۵ ساعت پیش', status: 'success' },
];

export default function Page() {
  return (
    <main className="p-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">داشبورد عملیات بیمه‌گری</h1>
          <p className="text-sm text-text-muted">نمای کلی سرویس‌ها، صف‌های عملیاتی و فعالیت‌های اخیر</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-border-default bg-bg-raised p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.textColor}`} />
              </div>
              <p className="mt-3 text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="mt-1 text-xs text-text-muted">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-text-primary">دسترسی سریع</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-raised p-4 transition-all hover:border-brand-primary hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary-subtle">
                      <Icon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{link.label}</p>
                      <p className="text-xs text-text-muted">{link.desc}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-text-primary">فعالیت‌های اخیر</h2>
            <Card className="p-4">
              <div className="space-y-3">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 last:pb-0 border-b last:border-b-0 border-border-subtle">
                    <div className="mt-0.5 flex-shrink-0">
                      {activity.status === 'success' && <CheckCircle className="h-5 w-5 text-feedback-success" />}
                      {activity.status === 'pending' && <Clock className="h-5 w-5 text-feedback-warning" />}
                      {activity.status === 'warning' && <AlertTriangle className="h-5 w-5 text-feedback-error" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{activity.description}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-text-primary">وضعیت سرویس‌ها</h2>
          <OverviewCards />
        </div>
      </div>
    </main>
  );
}
