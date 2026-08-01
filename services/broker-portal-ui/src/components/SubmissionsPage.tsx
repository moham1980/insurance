import * as React from 'react';
import { FileStack, Plus, ChevronLeft, User, Shield, FileText, Check, ArrowLeft } from 'lucide-react';
import { Table, TableRow, TableCell, StatusBadge, PageHeader, EmptyState, Card, Button, Loading } from './ui';
import { CarrierSelector, type CarrierOption } from '@insurance/design-system';
import { mockSubmissions } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

const mockCarriers: CarrierOption[] = [
  { carrierOrganizationId: 'c-001', carrierName: 'بیمه ایران', description: 'نمایندگی کلیه رشته‌های بیمه‌ای', enabled: true, inAgreement: true, bindingAuthority: true, lineOfBusiness: ['ثالثی', 'حوادث', 'آتش‌سوزی'], quoteCount: 3 },
  { carrierOrganizationId: 'c-002', carrierName: 'بیمه آسیه', description: 'بیمه‌گر تخصصی حوادث و مهندسی', enabled: true, inAgreement: true, bindingAuthority: true, lineOfBusiness: ['ثالثی', 'مهندسی', 'حوادث'], quoteCount: 2 },
  { carrierOrganizationId: 'c-003', carrierName: 'بیمه پاسارگاد', description: 'پوشش گسترده بیمه‌های شخصی', enabled: true, inAgreement: true, bindingAuthority: false, lineOfBusiness: ['ثالثی', 'آتش‌سوزی'], quoteCount: 1 },
  { carrierOrganizationId: 'c-004', carrierName: 'بیمه البرز', description: 'بیمه‌گر شمال کشور', enabled: true, inAgreement: false, bindingAuthority: false, lineOfBusiness: ['ثالثی'], quoteCount: 0 },
  { carrierOrganizationId: 'c-005', carrierName: 'بیمه دانا', description: 'بیمه‌های عمر و درمان', enabled: true, inAgreement: true, bindingAuthority: true, lineOfBusiness: ['حوادث', 'درمان'], quoteCount: 2 },
];

export function SubmissionsPage() {
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showWizard, setShowWizard] = React.useState(false);

  React.useEffect(() => {
    brokerApi.listSubmissions()
      .then(r => setSubmissions(r.data?.rows || r.data || []))
      .catch(() => { setSubmissions(mockSubmissions); })
      .finally(() => setLoading(false));
  }, []);

  if (showWizard) {
    return <SubmissionWizard onClose={() => setShowWizard(false)} onComplete={(s) => { setSubmissions([s, ...submissions]); setShowWizard(false); }} />;
  }

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="درخواست‌های قیمت‌گذاری"
        subtitle="مدیریت درخواست‌های بیمه‌ای مشتریان"
        action={
          <Button onClick={() => setShowWizard(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            درخواست جدید
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : submissions.length === 0 ? (
        <EmptyState icon={FileStack} title="درخواستی یافت نشد" description="برای شروع یک درخواست قیمت‌گذاری جدید ایجاد کنید" />
      ) : (
        <Table headers={['شماره درخواست', 'مشتری', 'محصول', 'وضعیت', 'تاریخ ایجاد']}>
          {submissions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium text-text-primary">{s.submissionNumber}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-text-muted" />
                  {s.customerName}
                </div>
              </TableCell>
              <TableCell>{s.productName}</TableCell>
              <TableCell><StatusBadge status={s.status} /></TableCell>
              <TableCell className="text-text-muted">{s.createdAt}</TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}

function SubmissionWizard({ onClose, onComplete }: { onClose: () => void; onComplete: (s: any) => void }) {
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState({
    customerName: '',
    nationalId: '',
    phone: '',
    productType: 'ثالثی شخصی',
    vehicleType: 'سواری شخصی',
    vehicleYear: '',
    coverageAmount: '',
    deductible: '',
    notes: '',
  });

  const [selectedCarriers, setSelectedCarriers] = React.useState<string[]>([]);

  const steps = [
    { title: 'اطلاعات مشتری', icon: User },
    { title: 'مشخصات بیمه', icon: Shield },
    { title: 'انتخاب بیمه‌گر', icon: Shield },
    { title: 'بازبینی و ارسال', icon: FileText },
  ];

  const canProceed = () => {
    if (step === 0) return formData.customerName && formData.phone;
    if (step === 1) return formData.productType && formData.vehicleType;
    if (step === 2) return selectedCarriers.length > 0;
    return true;
  };

  const handleSubmit = () => {
    onComplete({
      id: `SUB-${Date.now()}`,
      submissionNumber: `S-1403-${String(Date.now()).slice(-3)}`,
      customerName: formData.customerName,
      productName: formData.productType,
      status: 'در انتظار قیمت‌گذاری',
      createdAt: new Date().toLocaleDateString('fa-IR'),
    });
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
          <ChevronLeft className="h-4 w-4" />
          بازگشت
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">درخواست قیمت‌گذاری جدید</h1>
        <p className="mt-1 text-sm text-text-muted">مراحل تکمیل درخواست بیمه</p>
      </div>

      <Card className="p-6">
        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isComplete = i < step;
            const isCurrent = i === step;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all ${
                      isComplete ? 'border-feedback-success bg-feedback-success text-text-on-brand' :
                      isCurrent ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' :
                      'border-border-default bg-bg-subtle text-text-muted'
                    }`}
                  >
                    {isComplete ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-text-primary' : 'text-text-muted'}`}>{s.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full ${i < step ? 'bg-feedback-success' : 'bg-border-default'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">نام و نام خانوادگی *</label>
                <input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="مثلاً: علی محمدی"
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">کد ملی</label>
                <input
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  placeholder="XXXXXXXXXX"
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">شماره موبایل *</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="09XXXXXXXXX"
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">نوع بیمه</label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option>ثالثی شخصی</option>
                  <option>آتش‌سوزی مسکونی</option>
                  <option>حوادث انفرادی</option>
                  <option>مهندسی</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">نوع وسیله</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option>سواری شخصی</option>
                  <option>سواری تجاری</option>
                  <option>وانت</option>
                  <option>کامیون</option>
                  <option>موتور</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">سال ساخت</label>
                <input
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                  placeholder="مثلاً: 1402"
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">مبلغ پوشش (تومان)</label>
                <input
                  value={formData.coverageAmount}
                  onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                  placeholder="مثلاً: 100000000"
                  className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">انتخاب بیمه‌گرهای هدف برای استعلام قیمت</label>
              <p className="mb-3 text-xs text-text-muted">بیمه‌گرهایی که قرارداد توزیع فعال دارند قابل انتخاب هستند. حداقل یک بیمه‌گر انتخاب کنید.</p>
            </div>
            <CarrierSelector
              carriers={mockCarriers}
              selected={selectedCarriers}
              onChange={setSelectedCarriers}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border-default bg-bg-subtle p-4">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">بازبینی اطلاعات</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm">
                  <span className="text-text-muted">نام مشتری:</span>
                  <span className="font-medium text-text-primary">{formData.customerName || '—'}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm">
                  <span className="text-text-muted">کد ملی:</span>
                  <span className="font-medium text-text-primary">{formData.nationalId || '—'}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm">
                  <span className="text-text-muted">موبایل:</span>
                  <span className="font-medium text-text-primary">{formData.phone || '—'}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm">
                  <span className="text-text-muted">نوع بیمه:</span>
                  <span className="font-medium text-text-primary">{formData.productType}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm">
                  <span className="text-text-muted">نوع وسیله:</span>
                  <span className="font-medium text-text-primary">{formData.vehicleType}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm">
                  <span className="text-text-muted">سال ساخت:</span>
                  <span className="font-medium text-text-primary">{formData.vehicleYear || '—'}</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-raised px-3 py-2 text-sm sm:col-span-2">
                  <span className="text-text-muted">بیمه‌گرهای انتخابی:</span>
                  <span className="font-medium text-text-primary">{selectedCarriers.length} بیمه‌گر</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onClose()}>
            {step === 0 ? 'انصراف' : 'مرحله قبل'}
          </Button>
          {step < steps.length - 1 ? (
            <Button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
            >
              مرحله بعد
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleSubmit}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              ارسال درخواست
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
