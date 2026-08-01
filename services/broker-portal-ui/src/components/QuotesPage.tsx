import * as React from 'react';
import { GitCompare, Check, Star, Award, TrendingUp } from 'lucide-react';
import { Card, StatusBadge, PageHeader, Button, Loading } from './ui';
import { mockQuotes, formatToman } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

export function QuotesPage() {
  const [quotes, setQuotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    brokerApi.listSubmissions()
      .then(async (r) => {
        const subs = r.data?.rows || r.data || [];
        if (subs.length > 0) {
          const qRes = await brokerApi.getQuotes(subs[0].id);
          setQuotes(qRes.data?.rows || qRes.data || []);
        } else {
          setQuotes(mockQuotes);
        }
      })
      .catch(() => { setQuotes(mockQuotes); })
      .finally(() => setLoading(false));
  }, []);

  const selected = quotes.find((q) => q.id === selectedId);

  if (loading) {
    return (
      <div dir="rtl" className="space-y-6">
        <PageHeader title="مقایسه قیمت‌ها" subtitle="مقایسه پیشنهادهای قیمت‌گذاری بیمه‌گران" />
        <Loading />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="مقایسه قیمت‌ها"
        subtitle="مقایسه پیشنهادهای قیمت‌گذاری بیمه‌گران"
        action={
          <Button className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            درخواست قیمت جدید
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map((q) => {
          const isSelected = q.id === selectedId;
          const isBestScore = q.score === Math.max(...quotes.map((x) => x.score));
          const isBestPrice = q.premium === Math.min(...quotes.map((x) => x.premium));
          return (
            <Card
              key={q.id}
              className={`relative overflow-hidden transition-all ${isSelected ? 'ring-2 ring-brand-primary shadow-lg' : 'hover:shadow-md'}`}
            >
              {isBestScore && (
                <div className="absolute left-0 top-0 rounded-bl-lg bg-gradient-to-l from-feedback-warning to-brand-accent px-3 py-1 text-xs font-medium text-text-on-brand">
                  <Award className="inline h-3 w-3 ml-1" />
                  بهترین امتیاز
                </div>
              )}
              {isBestPrice && !isBestScore && (
                <div className="absolute left-0 top-0 rounded-bl-lg bg-gradient-to-l from-feedback-success to-brand-secondary px-3 py-1 text-xs font-medium text-text-on-brand">
                  <TrendingUp className="inline h-3 w-3 ml-1" />
                  بهترین قیمت
                </div>
              )}
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-subtle">
                    <span className="text-lg font-bold text-text-secondary">{q.carrierName.charAt(4)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{q.carrierName}</h3>
                    <p className="text-xs text-text-muted">{q.id}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2.5">
                    <span className="text-sm text-text-secondary">حق بیمه</span>
                    <span className="text-lg font-bold text-text-primary">{formatToman(q.premium)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">مبلغ پوشش</span>
                    <span className="text-sm font-medium text-text-primary">{q.coverage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">فرانشیز</span>
                    <span className="text-sm font-medium text-text-primary">{q.deductible}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">امتیاز</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-feedback-warning" />
                      <span className="text-sm font-bold text-text-primary">{q.score}</span>
                      <span className="text-xs text-text-muted">/۱۰۰</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-bg-subtle">
                  <div
                    className={`h-full rounded-full ${q.score >= 85 ? 'bg-feedback-success' : q.score >= 70 ? 'bg-feedback-warning' : 'bg-feedback-error'}`}
                    style={{ width: `${q.score}%` }}
                  />
                </div>

                <button
                  onClick={() => setSelectedId(q.id)}
                  className={`mt-4 w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-brand-primary text-text-on-brand'
                      : 'border border-border-default text-text-primary hover:bg-bg-subtle'
                  }`}
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" />
                      انتخاب شده
                    </span>
                  ) : (
                    'انتخاب'
                  )}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {selected && (
        <Card className="border-2 border-brand-primary p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">صدور بیمه‌نامه</h3>
              <p className="mt-1 text-sm text-text-muted">
                پیشنهاد {selected.carrierName} با حق بیمه {formatToman(selected.premium)} انتخاب شد
              </p>
            </div>
            <Button className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              صدور بیمه‌نامه
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
