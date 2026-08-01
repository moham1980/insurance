'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type SLAConfig = {
  id: string;
  name: string;
  entityType: 'claim' | 'policy' | 'complaint' | 'payment';
  slaHours: number;
  warningThreshold: number;
  criticalThreshold: number;
  businessHoursOnly: boolean;
  active: boolean;
  description?: string;
};

type SMSTemplate = {
  id: string;
  name: string;
  templateCode: string;
  category: 'policy_issued' | 'claim_submitted' | 'complaint_received' | 'installment_due' | 'otp' | 'general';
  content: string;
  variables: string[];
  provider: 'kavenegar' | 'twilio' | 'melli-payamak';
  active: boolean;
  language: 'fa' | 'en';
};

type FiscalPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  year: number;
  quarter?: number;
  description?: string;
};

type OrgSetting = {
  id: string;
  key: string;
  value: string;
  category: 'general' | 'notification' | 'payment' | 'compliance';
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
};

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'sla' | 'sms' | 'fiscal' | 'general'>('sla');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // SLA state
  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([]);
  const [editingSLA, setEditingSLA] = useState<SLAConfig | null>(null);

  // SMS Templates state
  const [smsTemplates, setSmsTemplates] = useState<SMSTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);

  // Fiscal Period state
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriod[]>([]);
  const [editingPeriod, setEditingPeriod] = useState<FiscalPeriod | null>(null);

  // General Settings state
  const [orgSettings, setOrgSettings] = useState<OrgSetting[]>([]);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'settings:manage')) { router.push('/forbidden'); return; }
    fetchAllData();
  }, [router, activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'sla':
          await fetchSLAConfigs();
          break;
        case 'sms':
          await fetchSMSTemplates();
          break;
        case 'fiscal':
          await fetchFiscalPeriods();
          break;
        case 'general':
          await fetchOrgSettings();
          break;
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت داده‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchSLAConfigs = async () => {
    try {
      const res = await apiFetch<SLAConfig[]>('/admin/settings/sla');
      if (res.success) setSlaConfigs(res.data);
      else setSlaConfigs(getMockSLAConfigs());
    } catch (e: any) {
      console.error('Failed to fetch SLA configs:', e);
      setSlaConfigs(getMockSLAConfigs());
    }
  };

  const fetchSMSTemplates = async () => {
    try {
      const res = await apiFetch<SMSTemplate[]>('/admin/settings/sms-templates');
      if (res.success) setSmsTemplates(res.data);
      else setSmsTemplates(getMockSMSTemplates());
    } catch (e: any) {
      console.error('Failed to fetch SMS templates:', e);
      setSmsTemplates(getMockSMSTemplates());
    }
  };

  const fetchFiscalPeriods = async () => {
    try {
      const res = await apiFetch<FiscalPeriod[]>('/admin/settings/fiscal-periods');
      if (res.success) setFiscalPeriods(res.data);
      else setFiscalPeriods(getMockFiscalPeriods());
    } catch (e: any) {
      console.error('Failed to fetch fiscal periods:', e);
      setFiscalPeriods(getMockFiscalPeriods());
    }
  };

  const fetchOrgSettings = async () => {
    try {
      const res = await apiFetch<OrgSetting[]>('/admin/settings/general');
      if (res.success) setOrgSettings(res.data);
      else setOrgSettings(getMockOrgSettings());
    } catch (e: any) {
      console.error('Failed to fetch org settings:', e);
      setOrgSettings(getMockOrgSettings());
    }
  };

  const getMockSLAConfigs = (): SLAConfig[] => [
    {
      id: '1',
      name: 'SLA خسارت ساده',
      entityType: 'claim',
      slaHours: 72,
      warningThreshold: 48,
      criticalThreshold: 60,
      businessHoursOnly: true,
      active: true,
      description: 'برای خسارت‌های ساده با مبلغ کمتر از ۵۰ میلیون ریال',
    },
    {
      id: '2',
      name: 'SLA خسارت پیچیده',
      entityType: 'claim',
      slaHours: 168,
      warningThreshold: 120,
      criticalThreshold: 144,
      businessHoursOnly: true,
      active: true,
      description: 'برای خسارت‌های پیچیده با مبلغ بیشتر از ۵۰ میلیون ریال',
    },
    {
      id: '3',
      name: 'SLA صدور بیمه‌نامه',
      entityType: 'policy',
      slaHours: 24,
      warningThreshold: 18,
      criticalThreshold: 21,
      businessHoursOnly: false,
      active: true,
      description: 'زمان استاندارد برای صدور بیمه‌نامه',
    },
    {
      id: '4',
      name: 'SLA رسیدگی به شکایت',
      entityType: 'complaint',
      slaHours: 120,
      warningThreshold: 96,
      criticalThreshold: 108,
      businessHoursOnly: true,
      active: true,
      description: 'زمان استاندارد برای رسیدگی به شکایات مشتریان',
    },
  ];

  const getMockSMSTemplates = (): SMSTemplate[] => [
    {
      id: '1',
      name: 'صدور بیمه‌نامه',
      templateCode: 'POLICY_ISSUED',
      category: 'policy_issued',
      content: 'بیمه‌نامه شماره {policyNumber} با موفقیت صادر شد. مبلغ: {premium} ریال. تاریخ شروع: {startDate}',
      variables: ['policyNumber', 'premium', 'startDate'],
      provider: 'kavenegar',
      active: true,
      language: 'fa',
    },
    {
      id: '2',
      name: 'ثبت خسارت',
      templateCode: 'CLAIM_SUBMITTED',
      category: 'claim_submitted',
      content: 'خسارت شماره {claimNumber} ثبت شد. کارشناس مربوطه در اسرع وقت با شما تماس خواهد گرفت.',
      variables: ['claimNumber'],
      provider: 'kavenegar',
      active: true,
      language: 'fa',
    },
    {
      id: '3',
      name: 'دریافت شکایت',
      templateCode: 'COMPLAINT_RECEIVED',
      category: 'complaint_received',
      content: 'شکایت شما با شماره {complaintId} دریافت شد. کد پیگیری: {trackingCode}',
      variables: ['complaintId', 'trackingCode'],
      provider: 'kavenegar',
      active: true,
      language: 'fa',
    },
    {
      id: '4',
      name: 'یادآوری قسط',
      templateCode: 'INSTALLMENT_DUE',
      category: 'installment_due',
      content: 'یادآوری: قسط بیمه‌نامه {policyNumber} به مبلغ {amount} ریال در تاریخ {dueDate} سررسید است.',
      variables: ['policyNumber', 'amount', 'dueDate'],
      provider: 'kavenegar',
      active: true,
      language: 'fa',
    },
    {
      id: '5',
      name: 'کد OTP',
      templateCode: 'OTP',
      category: 'otp',
      content: 'کد تأیید شما: {otp}. این کد ۵ دقیقه معتبر است.',
      variables: ['otp'],
      provider: 'kavenegar',
      active: true,
      language: 'fa',
    },
  ];

  const getMockFiscalPeriods = (): FiscalPeriod[] => [
    {
      id: '1',
      name: 'سال مالی ۱۴۰۳ - فصل ۱',
      startDate: '1403-01-01',
      endDate: '1403-03-31',
      status: 'closed',
      year: 1403,
      quarter: 1,
      description: 'سه ماهه اول سال مالی',
    },
    {
      id: '2',
      name: 'سال مالی ۱۴۰۳ - فصل ۲',
      startDate: '1403-04-01',
      endDate: '1403-06-31',
      status: 'closed',
      year: 1403,
      quarter: 2,
      description: 'سه ماهه دوم سال مالی',
    },
    {
      id: '3',
      name: 'سال مالی ۱۴۰۳ - فصل ۳',
      startDate: '1403-07-01',
      endDate: '1403-09-30',
      status: 'open',
      year: 1403,
      quarter: 3,
      description: 'سه ماهه سوم سال مالی (فعال)',
    },
    {
      id: '4',
      name: 'سال مالی ۱۴۰۳ - فصل ۴',
      startDate: '1403-10-01',
      endDate: '1403-12-29',
      status: 'locked',
      year: 1403,
      quarter: 4,
      description: 'سه ماهه چهارم سال مالی (قفل شده)',
    },
  ];

  const getMockOrgSettings = (): OrgSetting[] => [
    {
      id: '1',
      key: 'company_name',
      value: 'شرکت بیمه نمونه',
      category: 'general',
      description: 'نام شرکت',
      type: 'string',
    },
    {
      id: '2',
      key: 'default_currency',
      value: 'IRR',
      category: 'general',
      description: 'ارز پیش‌فرض',
      type: 'string',
    },
    {
      id: '3',
      key: 'notification_enabled',
      value: 'true',
      category: 'notification',
      description: 'فعال بودن اطلاع‌رسانی',
      type: 'boolean',
    },
    {
      id: '4',
      key: 'payment_timeout_hours',
      value: '72',
      category: 'payment',
      description: 'مهلت پرداخت (ساعت)',
      type: 'number',
    },
    {
      id: '5',
      key: 'aml_threshold',
      value: '100000000',
      category: 'compliance',
      description: 'آستانه AML (ریال)',
      type: 'number',
    },
  ];

  const handleSaveSLA = async (sla: SLAConfig) => {
    setSaving(true);
    setError(null);
    try {
      const method = sla.id ? 'PUT' : 'POST';
      const url = sla.id ? `/admin/settings/sla/${sla.id}` : '/admin/settings/sla';
      const res = await apiFetch<SLAConfig>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sla),
      });
      if (res.success) {
        setSuccess('تنظیمات SLA با موفقیت ذخیره شد');
        await fetchSLAConfigs();
        setEditingSLA(null);
      } else {
        setError(res.error?.message || 'خطا در ذخیره تنظیمات');
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (template: SMSTemplate) => {
    setSaving(true);
    setError(null);
    try {
      const method = template.id ? 'PUT' : 'POST';
      const url = template.id ? `/admin/settings/sms-templates/${template.id}` : '/admin/settings/sms-templates';
      const res = await apiFetch<SMSTemplate>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (res.success) {
        setSuccess('قالب پیامک با موفقیت ذخیره شد');
        await fetchSMSTemplates();
        setEditingTemplate(null);
      } else {
        setError(res.error?.message || 'خطا در ذخیره قالب');
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در ذخیره قالب');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePeriod = async (period: FiscalPeriod) => {
    setSaving(true);
    setError(null);
    try {
      const method = period.id ? 'PUT' : 'POST';
      const url = period.id ? `/admin/settings/fiscal-periods/${period.id}` : '/admin/settings/fiscal-periods';
      const res = await apiFetch<FiscalPeriod>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(period),
      });
      if (res.success) {
        setSuccess('دوره مالی با موفقیت ذخیره شد');
        await fetchFiscalPeriods();
        setEditingPeriod(null);
      } else {
        setError(res.error?.message || 'خطا در ذخیره دوره مالی');
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در ذخیره دوره مالی');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSetting = async (setting: OrgSetting) => {
    setSaving(true);
    setError(null);
    try {
      const method = setting.id ? 'PUT' : 'POST';
      const url = setting.id ? `/admin/settings/general/${setting.id}` : '/admin/settings/general';
      const res = await apiFetch<OrgSetting>(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setting),
      });
      if (res.success) {
        setSuccess('تنظیم با موفقیت ذخیره شد');
        await fetchOrgSettings();
      } else {
        setError(res.error?.message || 'خطا در ذخیره تنظیمات');
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSLA = async (id: string) => {
    if (!confirm('آیا از حذف این تنظیم SLA مطمئن هستید؟')) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/admin/settings/sla/${id}`, { method: 'DELETE' });
      if (res.success) {
        setSuccess('تنظیم SLA با موفقیت حذف شد');
        await fetchSLAConfigs();
      } else {
        setError(res.error?.message || 'خطا در حذف تنظیمات');
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در حذف تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('آیا از حذف این قالب پیامک مطمئن هستید؟')) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/admin/settings/sms-templates/${id}`, { method: 'DELETE' });
      if (res.success) {
        setSuccess('قالب پیامک با موفقیت حذف شد');
        await fetchSMSTemplates();
      } else {
        setError(res.error?.message || 'خطا در حذف قالب');
      }
    } catch (e: any) {
      setError(e?.message || 'خطا در حذف قالب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="bg-bg-raised shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-text-primary">تنظیمات سازمانی</h1>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-primary"
            >
              بازگشت
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-border-default mb-6">
          <nav className="-mb-px flex space-x-8 space-x-reverse">
            {[
              { id: 'sla' as const, label: 'تنظیمات SLA' },
              { id: 'sms' as const, label: 'قالب‌های پیامک' },
              { id: 'fiscal' as const, label: 'دوره‌های مالی' },
              { id: 'general' as const, label: 'تنظیمات عمومی' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-default'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md border border-feedback-success/30 bg-feedback-success-subtle p-4 text-sm text-feedback-success">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-text-muted">در حال بارگذاری...</p>
          </div>
        ) : (
          <>
            {/* SLA Configurations */}
            {activeTab === 'sla' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-text-primary">تنظیمات SLA</h2>
                  <button
                    onClick={() => setEditingSLA({
                      id: '',
                      name: '',
                      entityType: 'claim',
                      slaHours: 72,
                      warningThreshold: 48,
                      criticalThreshold: 60,
                      businessHoursOnly: true,
                      active: true,
                    })}
                    className="rounded-md bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90"
                  >
                    افزودن SLA جدید
                  </button>
                </div>

                <div className="bg-bg-raised rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-border-default">
                    <thead className="bg-bg-base">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نام</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نوع موجودیت</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">SLA (ساعت)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">هشدار</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">بحرانی</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">وضعیت</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-bg-raised divide-y divide-border-default">
                      {slaConfigs.map((sla) => (
                        <tr key={sla.id} className="hover:bg-bg-base">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{sla.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{sla.entityType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{sla.slaHours} ساعت</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{sla.warningThreshold} ساعت</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{sla.criticalThreshold} ساعت</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sla.active ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-bg-base text-text-primary'}`}>
                              {sla.active ? 'فعال' : 'غیرفعال'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 space-x-reverse">
                            <button onClick={() => setEditingSLA(sla)} className="text-brand-primary hover:text-brand-primary">ویرایش</button>
                            <button onClick={() => handleDeleteSLA(sla.id)} className="text-feedback-error hover:text-feedback-error">حذف</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingSLA && (
                  <div className="bg-bg-raised rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                      {editingSLA.id ? 'ویرایش SLA' : 'افزودن SLA جدید'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">نام</label>
                        <input
                          type="text"
                          value={editingSLA.name}
                          onChange={(e) => setEditingSLA({ ...editingSLA, name: e.target.value })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">نوع موجودیت</label>
                        <select
                          value={editingSLA.entityType}
                          onChange={(e) => setEditingSLA({ ...editingSLA, entityType: e.target.value as any })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        >
                          <option value="claim">خسارت</option>
                          <option value="policy">بیمه‌نامه</option>
                          <option value="complaint">شکایت</option>
                          <option value="payment">پرداخت</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">SLA (ساعت)</label>
                        <input
                          type="number"
                          value={editingSLA.slaHours}
                          onChange={(e) => setEditingSLA({ ...editingSLA, slaHours: Number(e.target.value) })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">آستانه هشدار (ساعت)</label>
                        <input
                          type="number"
                          value={editingSLA.warningThreshold}
                          onChange={(e) => setEditingSLA({ ...editingSLA, warningThreshold: Number(e.target.value) })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">آستانه بحرانی (ساعت)</label>
                        <input
                          type="number"
                          value={editingSLA.criticalThreshold}
                          onChange={(e) => setEditingSLA({ ...editingSLA, criticalThreshold: Number(e.target.value) })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="businessHours"
                          checked={editingSLA.businessHoursOnly}
                          onChange={(e) => setEditingSLA({ ...editingSLA, businessHoursOnly: e.target.checked })}
                          className="rounded border-border-default"
                        />
                        <label htmlFor="businessHours" className="mr-2 text-sm text-text-secondary">فقط ساعات کاری</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="active"
                          checked={editingSLA.active}
                          onChange={(e) => setEditingSLA({ ...editingSLA, active: e.target.checked })}
                          className="rounded border-border-default"
                        />
                        <label htmlFor="active" className="mr-2 text-sm text-text-secondary">فعال</label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-text-secondary mb-1">توضیحات</label>
                      <textarea
                        value={editingSLA.description || ''}
                        onChange={(e) => setEditingSLA({ ...editingSLA, description: e.target.value })}
                        className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="mt-4 flex justify-end space-x-3 space-x-reverse">
                      <button
                        onClick={() => setEditingSLA(null)}
                        className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-base"
                        disabled={saving}
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => handleSaveSLA(editingSLA)}
                        className="rounded-md bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90"
                        disabled={saving}
                      >
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SMS Templates */}
            {activeTab === 'sms' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-text-primary">قالب‌های پیامک</h2>
                  <button
                    onClick={() => setEditingTemplate({
                      id: '',
                      name: '',
                      templateCode: '',
                      category: 'general',
                      content: '',
                      variables: [],
                      provider: 'kavenegar',
                      active: true,
                      language: 'fa',
                    })}
                    className="rounded-md bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90"
                  >
                    افزودن قالب جدید
                  </button>
                </div>

                <div className="bg-bg-raised rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-border-default">
                    <thead className="bg-bg-base">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نام</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">کد</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">دسته‌بندی</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">ارائه‌دهنده</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">زبان</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">وضعیت</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-bg-raised divide-y divide-border-default">
                      {smsTemplates.map((template) => (
                        <tr key={template.id} className="hover:bg-bg-base">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{template.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted font-mono">{template.templateCode}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{template.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{template.provider}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{template.language}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${template.active ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-bg-base text-text-primary'}`}>
                              {template.active ? 'فعال' : 'غیرفعال'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 space-x-reverse">
                            <button onClick={() => setEditingTemplate(template)} className="text-brand-primary hover:text-brand-primary">ویرایش</button>
                            <button onClick={() => handleDeleteTemplate(template.id)} className="text-feedback-error hover:text-feedback-error">حذف</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingTemplate && (
                  <div className="bg-bg-raised rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                      {editingTemplate.id ? 'ویرایش قالب' : 'افزودن قالب جدید'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">نام</label>
                        <input
                          type="text"
                          value={editingTemplate.name}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">کد قالب</label>
                        <input
                          type="text"
                          value={editingTemplate.templateCode}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, templateCode: e.target.value })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">دسته‌بندی</label>
                        <select
                          value={editingTemplate.category}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        >
                          <option value="policy_issued">صدور بیمه‌نامه</option>
                          <option value="claim_submitted">ثبت خسارت</option>
                          <option value="complaint_received">دریافت شکایت</option>
                          <option value="installment_due">یادآوری قسط</option>
                          <option value="otp">کد OTP</option>
                          <option value="general">عمومی</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">ارائه‌دهنده</label>
                        <select
                          value={editingTemplate.provider}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, provider: e.target.value as any })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        >
                          <option value="kavenegar">کاوه‌نگار</option>
                          <option value="twilio">Twilio</option>
                          <option value="melli-payamak">ملی پیامک</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">زبان</label>
                        <select
                          value={editingTemplate.language}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, language: e.target.value as any })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        >
                          <option value="fa">فارسی</option>
                          <option value="en">انگلیسی</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="templateActive"
                          checked={editingTemplate.active}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, active: e.target.checked })}
                          className="rounded border-border-default"
                        />
                        <label htmlFor="templateActive" className="mr-2 text-sm text-text-secondary">فعال</label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-text-secondary mb-1">محتوای پیامک</label>
                      <textarea
                        value={editingTemplate.content}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                        className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        rows={4}
                        placeholder="از متغیرها با فرمت {variableName} استفاده کنید"
                      />
                      <p className="text-xs text-text-muted mt-1">متغیرها: {editingTemplate.variables.join(', ')}</p>
                    </div>
                    <div className="mt-4 flex justify-end space-x-3 space-x-reverse">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-base"
                        disabled={saving}
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => handleSaveTemplate(editingTemplate)}
                        className="rounded-md bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90"
                        disabled={saving}
                      >
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fiscal Periods */}
            {activeTab === 'fiscal' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-text-primary">دوره‌های مالی</h2>
                  <button
                    onClick={() => setEditingPeriod({
                      id: '',
                      name: '',
                      startDate: '',
                      endDate: '',
                      status: 'open',
                      year: new Date().getFullYear(),
                      description: '',
                    })}
                    className="rounded-md bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90"
                  >
                    افزودن دوره جدید
                  </button>
                </div>

                <div className="bg-bg-raised rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-border-default">
                    <thead className="bg-bg-base">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">نام</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">سال</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">تاریخ شروع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">تاریخ پایان</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">وضعیت</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-bg-raised divide-y divide-border-default">
                      {fiscalPeriods.map((period) => (
                        <tr key={period.id} className="hover:bg-bg-base">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{period.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{period.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{period.startDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{period.endDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              period.status === 'open' ? 'bg-feedback-success-subtle text-feedback-success' :
                              period.status === 'closed' ? 'bg-bg-base text-text-primary' :
                              'bg-feedback-error-subtle text-feedback-error'
                            }`}>
                              {period.status === 'open' ? 'باز' : period.status === 'closed' ? 'بسته' : 'قفل شده'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button onClick={() => setEditingPeriod(period)} className="text-brand-primary hover:text-brand-primary">ویرایش</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingPeriod && (
                  <div className="bg-bg-raised rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">
                      {editingPeriod.id ? 'ویرایش دوره مالی' : 'افزودن دوره مالی جدید'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">نام</label>
                        <input
                          type="text"
                          value={editingPeriod.name}
                          onChange={(e) => setEditingPeriod({ ...editingPeriod, name: e.target.value })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">سال</label>
                        <input
                          type="number"
                          value={editingPeriod.year}
                          onChange={(e) => setEditingPeriod({ ...editingPeriod, year: Number(e.target.value) })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">تاریخ شروع</label>
                        <input
                          type="date"
                          value={editingPeriod.startDate}
                          onChange={(e) => setEditingPeriod({ ...editingPeriod, startDate: e.target.value })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">تاریخ پایان</label>
                        <input
                          type="date"
                          value={editingPeriod.endDate}
                          onChange={(e) => setEditingPeriod({ ...editingPeriod, endDate: e.target.value })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">وضعیت</label>
                        <select
                          value={editingPeriod.status}
                          onChange={(e) => setEditingPeriod({ ...editingPeriod, status: e.target.value as any })}
                          className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        >
                          <option value="open">باز</option>
                          <option value="closed">بسته</option>
                          <option value="locked">قفل شده</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-text-secondary mb-1">توضیحات</label>
                      <textarea
                        value={editingPeriod.description || ''}
                        onChange={(e) => setEditingPeriod({ ...editingPeriod, description: e.target.value })}
                        className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="mt-4 flex justify-end space-x-3 space-x-reverse">
                      <button
                        onClick={() => setEditingPeriod(null)}
                        className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-base"
                        disabled={saving}
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => handleSavePeriod(editingPeriod)}
                        className="rounded-md bg-brand-primary px-4 py-2 text-sm text-text-on-brand hover:opacity-90"
                        disabled={saving}
                      >
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-text-primary">تنظیمات عمومی</h2>
                <div className="bg-bg-raised rounded-lg shadow">
                  <div className="divide-y divide-border-default">
                    {orgSettings.map((setting) => (
                      <div key={setting.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-text-secondary mb-1">{setting.description}</label>
                            <p className="text-xs text-text-muted mb-2">{setting.key}</p>
                            {setting.type === 'boolean' ? (
                              <input
                                type="checkbox"
                                checked={setting.value === 'true'}
                                onChange={(e) => handleSaveSetting({ ...setting, value: e.target.checked.toString() })}
                                className="rounded border-border-default"
                              />
                            ) : (
                              <input
                                type={setting.type === 'number' ? 'number' : 'text'}
                                value={setting.value}
                                onChange={(e) => handleSaveSetting({ ...setting, value: e.target.value })}
                                className="w-full max-w-md rounded-md border border-border-default px-3 py-2 text-sm"
                              />
                            )}
                          </div>
                          <div className="mr-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-bg-base text-text-primary`}>
                              {setting.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
