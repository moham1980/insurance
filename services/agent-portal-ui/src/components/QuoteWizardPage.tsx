import * as React from 'react';
import {
  Sparkles, ChevronLeft, ChevronRight, Check, User, Car, Home,
  Heart, Shield, Brain, TrendingUp, Calculator, FileText,
} from 'lucide-react';

type Step = 0 | 1 | 2 | 3 | 4;

const productTypes = [
  { id: 'auto', label: 'بیمه خودرو', icon: Car, color: 'from-brand-primary to-brand-primary' },
  { id: 'home', label: 'بیمه آتش‌سوزی', icon: Home, color: 'from-feedback-warning to-feedback-error' },
  { id: 'life', label: 'بیمه عمر', icon: Heart, color: 'from-feedback-error to-brand-accent' },
  { id: 'health', label: 'بیمه درمان', icon: Shield, color: 'from-feedback-success to-brand-primary' },
];

const mockAIRecommendation = `بر اساس اطلاعات وارد شده:
• ریسک منطقه: متوسط
• سابقه بیمه‌گذار: ۳ سال بدون خسارت
• پیشنهاد پوشش: پایه + حوادث راننده
• تخفیف پیشنهادی: ۱۵٪ (سابقه خوب)
• حق بیمه تخمینی: ۳٬۲۰۰٬۰۰۰ تا ۴٬۸۰۰٬۰۰۰ تومان

این مشتری واجد شرایط تخفیف وفاداری است.`;

export function QuoteWizardPage({ onClose }: { onClose: () => void }) {
  const [step, setStep] = React.useState<Step>(0);
  const [product, setProduct] = React.useState('');
  const [customer, setCustomer] = React.useState({ name: '', nationalId: '', phone: '', age: '' });
  const [details, setDetails] = React.useState({ coverage: '', deductible: '', duration: '12' });
  const [aiAnalyzing, setAiAnalyzing] = React.useState(false);
  const [aiResult, setAiResult] = React.useState('');

  const steps = ['محصول', 'مشتری', 'جزئیات', 'تحلیل AI', 'نتیجه'];
  const stepIcons = [FileText, User, Shield, Brain, Check];

  const handleAnalyze = () => {
    setAiAnalyzing(true);
    setTimeout(() => {
      setAiResult(mockAIRecommendation);
      setAiAnalyzing(false);
      setStep(4);
    }, 2000);
  };

  const canProceed = () => {
    if (step === 0) return !!product;
    if (step === 1) return !!customer.name && !!customer.nationalId;
    if (step === 2) return !!details.coverage;
    return true;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ویزارد قیمت‌گذاری هوشمند</h1>
          <p className="mt-1 text-sm text-text-muted">صدور پیشنهاد قیمت با کمک هوش مصنوعی</p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-muted hover:bg-bg-base">
          بستن
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-raised p-4">
        {steps.map((label, i) => {
          const Icon = stepIcons[i];
          const isActive = step === i;
          const isDone = step > i;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                  isDone ? 'bg-feedback-success text-text-on-brand' :
                  isActive ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-text-on-brand shadow-lg shadow-brand-primary/30' :
                  'bg-bg-base text-text-muted'
                }`}>
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-brand-primary' : isDone ? 'text-feedback-success' : 'text-text-muted'}`}>{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full ${step > i ? 'bg-feedback-success' : 'bg-bg-base'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-border-default bg-bg-raised p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">انتخاب نوع بیمه</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
              {productTypes.map(p => {
                const Icon = p.icon;
                const isSelected = product === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setProduct(p.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      isSelected ? 'border-brand-primary bg-brand-primary-subtle' : 'border-border-default hover:border-border-default'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.color}`}>
                      <Icon className="h-6 w-6 text-text-on-brand" />
                    </div>
                    <span className="text-sm font-medium text-text-secondary">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">اطلاعات مشتری</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">نام و نام خانوادگی</label>
                <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="نام مشتری"
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">کد ملی</label>
                <input value={customer.nationalId} onChange={e => setCustomer({ ...customer, nationalId: e.target.value })}
                  placeholder="کد ملی ۱۰ رقمی"
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">شماره تماس</label>
                <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">سن</label>
                <input value={customer.age} onChange={e => setCustomer({ ...customer, age: e.target.value })}
                  placeholder="سن بیمه‌گذار"
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">جزئیات پوشش</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">نوع پوشش</label>
                <select value={details.coverage} onChange={e => setDetails({ ...details, coverage: e.target.value })}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
                  <option value="">انتخاب...</option>
                  <option value="basic">پایه</option>
                  <option value="standard">استاندارد</option>
                  <option value="comprehensive">جامع</option>
                  <option value="premium">پریمیوم</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">فرانشیز</label>
                <select value={details.deductible} onChange={e => setDetails({ ...details, deductible: e.target.value })}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
                  <option value="">انتخاب...</option>
                  <option value="0">بدون فرانشیز</option>
                  <option value="500000">۵۰۰٬۰۰۰ تومان</option>
                  <option value="1000000">۱٬۰۰۰٬۰۰۰ تومان</option>
                  <option value="2000000">۲٬۰۰۰٬۰۰۰ تومان</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">مدت بیمه (ماه)</label>
                <select value={details.duration} onChange={e => setDetails({ ...details, duration: e.target.value })}
                  className="w-full rounded-lg border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none">
                  <option value="6">۶ ماه</option>
                  <option value="12">۱۲ ماه</option>
                  <option value="24">۲۴ ماه</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">تحلیل هوش مصنوعی</h2>
            <div className="flex flex-col items-center justify-center py-8">
              {aiAnalyzing ? (
                <>
                  <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-border-default border-t-brand-primary" />
                    <Brain className="absolute inset-0 m-auto h-6 w-6 text-brand-primary" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-text-secondary">در حال تحلیل اطلاعات...</p>
                  <p className="mt-1 text-xs text-text-muted">بررسی سابقه، ارزیابی ریسک و محاسبه قیمت</p>
                </>
              ) : (
                <button onClick={handleAnalyze}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-6 py-3 text-sm font-semibold text-text-on-brand shadow-lg shadow-brand-primary/25 hover:opacity-90">
                  <Sparkles className="h-5 w-5" />
                  اجرای تحلیل هوش مصنوعی
                </button>
              )}
            </div>
          </div>
        )}

        {step === 4 && aiResult && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">نتیجه تحلیل</h2>
            <div className="rounded-xl border border-brand-primary/30 bg-gradient-to-l from-brand-primary-subtle to-brand-secondary-subtle p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex-shrink-0">
                  <Brain className="h-5 w-5 text-text-on-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-primary">پیشنهاد هوش مصنوعی</p>
                  <pre className="mt-2 whitespace-pre-line text-sm text-brand-primary">{aiResult}</pre>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border-default p-4 text-center">
                <Calculator className="mx-auto h-6 w-6 text-brand-primary" />
                <p className="mt-2 text-xs text-text-muted">حداقل حق بیمه</p>
                <p className="text-sm font-bold text-text-primary">۳٬۲۰۰٬۰۰۰ ت</p>
              </div>
              <div className="rounded-xl border border-border-default p-4 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-feedback-success" />
                <p className="mt-2 text-xs text-text-muted">حداکثر حق بیمه</p>
                <p className="text-sm font-bold text-text-primary">۴٬۸۰۰٬۰۰۰ ت</p>
              </div>
              <div className="rounded-xl border border-border-default p-4 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-feedback-warning" />
                <p className="mt-2 text-xs text-text-muted">تخفیف پیشنهادی</p>
                <p className="text-sm font-bold text-text-primary">۱۵٪</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary py-2.5 text-sm font-semibold text-text-on-brand hover:opacity-90">
                ایجاد پیشنهاد قیمت
              </button>
              <button onClick={() => { setStep(0); setAiResult(''); }}
                className="rounded-lg border border-border-default px-4 py-2.5 text-sm text-text-muted hover:bg-bg-base">
                شروع مجدد
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex justify-between">
          <button
            onClick={() => step > 0 && setStep((step - 1) as Step)}
            disabled={step === 0}
            className="flex items-center gap-1 rounded-lg border border-border-default px-4 py-2 text-sm text-text-muted disabled:opacity-40 hover:bg-bg-base"
          >
            <ChevronRight className="h-4 w-4" /> قبلی
          </button>
          <button
            onClick={() => canProceed() && setStep((step + 1) as Step)}
            disabled={!canProceed()}
            className="flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-text-on-brand disabled:opacity-40 hover:opacity-90"
          >
            بعدی <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
