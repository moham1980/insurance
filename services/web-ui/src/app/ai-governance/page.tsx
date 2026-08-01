'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Plus, Loader2, AlertCircle, Cpu, ShieldCheck, Activity, Eye, ToggleLeft, ToggleRight, FileText, Clock } from 'lucide-react';
import { apiFetch, getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';
import { Card } from '@insurance/design-system';

interface ModelInventory {
  modelId: string;
  modelName: string;
  modelType: string;
  version: string;
  status: string;
  provider: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const MOCK_MODELS: ModelInventory[] = [
  {
    modelId: 'mdl-001',
    modelName: 'Fraud Detection Model v3',
    modelType: 'classification',
    version: '3.2.1',
    status: 'production',
    provider: 'ecosystem-ai-gateway',
    description: 'مدل تشخیص تقلب مبتنی بر Gradient Boosting برای تحلیل الگوهای خسارت',
    createdBy: 'admin',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-09-15T00:00:00Z',
  },
  {
    modelId: 'mdl-002',
    modelName: 'Quote Recommendation Engine',
    modelType: 'recommendation',
    version: '2.0.0',
    status: 'production',
    provider: 'ecosystem-ai-gateway',
    description: 'موتور پیشنهاد بیمه‌نامه بر اساس پروفایل مشتری و تاریخچه خرید',
    createdBy: 'admin',
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-08-20T00:00:00Z',
  },
  {
    modelId: 'mdl-003',
    modelName: 'OCR Document Extractor',
    modelType: 'extraction',
    version: '1.5.0',
    status: 'staging',
    provider: 'ecosystem-ai-gateway',
    description: 'استخراج خودکار اطلاعات از فرم‌های بیمه و مدارک هویتی',
    createdBy: 'admin',
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z',
  },
  {
    modelId: 'mdl-004',
    modelName: 'Risk Scoring Model',
    modelType: 'scoring',
    version: '4.1.0',
    status: 'production',
    provider: 'ecosystem-ai-gateway',
    description: 'مدل امتیازدهی ریسک برای درخواست‌های بیمه‌گذاری',
    createdBy: 'underwriter',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-09-01T00:00:00Z',
  },
  {
    modelId: 'mdl-005',
    modelName: 'AML Pattern Detector',
    modelType: 'anomaly',
    version: '1.0.0',
    status: 'review',
    provider: 'ecosystem-ai-gateway',
    description: 'تشخیص الگوهای مشکوک پول‌شویی در تراکنش‌های بیمه‌ای',
    createdBy: 'admin',
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-10-15T00:00:00Z',
  },
  {
    modelId: 'mdl-006',
    modelName: 'Customer Churn Predictor',
    modelType: 'prediction',
    version: '0.9.0',
    status: 'deprecated',
    provider: 'ecosystem-ai-gateway',
    description: 'پیش‌بینی احتمال لغو بیمه‌نامه توسط مشتری',
    createdBy: 'admin',
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2024-05-01T00:00:00Z',
  },
];

const STATUS_LABELS: Record<string, string> = {
  production: 'در تولید',
  staging: 'آزمایشی',
  review: 'در بررسی',
  development: 'در توسعه',
  deprecated: 'منسوخ',
  retired: 'بازنشسته',
  approved: 'تأیید شده',
};

const TYPE_LABELS: Record<string, string> = {
  classification: 'طبقه‌بندی',
  recommendation: 'پیشنهاد',
  extraction: 'استخراج',
  scoring: 'امتیازدهی',
  anomaly: 'تشخیص ناهنجاری',
  prediction: 'پیش‌بینی',
};

export default function AiGovernancePage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) { router.push('/login'); return; }
    const perms = enterprisePermissionsForRoles(authUser.roles || []);
    if (!hasEnterprisePermission(perms, 'ai:governance:view')) { router.push('/forbidden'); return; }
    fetchModels();
  }, [router]);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ModelInventory[]>('/api/v1/ai-governance/models');
      if (res.success && res.data) {
        setModels(Array.isArray(res.data) ? res.data : (res.data as any).models || []);
      } else {
        setModels(MOCK_MODELS);
      }
    } catch {
      setModels(MOCK_MODELS);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'production':
        return 'bg-feedback-success-subtle text-feedback-success border border-feedback-success/30';
      case 'review':
      case 'staging':
        return 'bg-feedback-warning-subtle text-feedback-warning border border-feedback-warning/30';
      case 'deprecated':
      case 'retired':
        return 'bg-feedback-error-subtle text-feedback-error border border-feedback-error/30';
      default:
        return 'bg-brand-primary-subtle text-brand-primary border border-brand-primary/30';
    }
  };

  const productionCount = models.filter(m => m.status === 'production').length;
  const stagingCount = models.filter(m => m.status === 'staging' || m.status === 'review').length;
  const deprecatedCount = models.filter(m => m.status === 'deprecated' || m.status === 'retired').length;

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary-subtle">
              <Brain className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
            <h1 className="text-2xl font-bold text-text-primary">حاکمیت هوش مصنوعی</h1>
            <p className="text-sm text-text-muted">مدیریت مدل‌های هوش مصنوعی، نسخه‌گذاری و نظارت</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-on-brand shadow-lg shadow-brand-primary/30 transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            ثبت مدل جدید
          </button>
        </div>

        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">کل مدل‌ها</p>
                <p className="mt-1 text-2xl font-bold text-text-primary">{models.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary-subtle">
                <Cpu className="h-5 w-5 text-brand-primary" />
              </div>
            </div>
          </Card>
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">در تولید</p>
                <p className="mt-1 text-2xl font-bold text-feedback-success">{productionCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-feedback-success-subtle">
                <ShieldCheck className="h-5 w-5 text-feedback-success" />
              </div>
            </div>
          </Card>
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">در بررسی / آزمایشی</p>
                <p className="mt-1 text-2xl font-bold text-feedback-warning">{stagingCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-feedback-warning-subtle">
                <Activity className="h-5 w-5 text-feedback-warning" />
              </div>
            </div>
          </Card>
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-muted">منسوخ / بازنشسته</p>
                <p className="mt-1 text-2xl font-bold text-feedback-error">{deprecatedCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-feedback-error-subtle">
                <AlertCircle className="h-5 w-5 text-feedback-error" />
              </div>
            </div>
          </Card>
        </div>

        {/* Model Inventory */}
        <Card className="shadow-sm">
          <div className="border-b border-border-subtle px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">فهرست مدل‌ها</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
          ) : models.length === 0 ? (
            <div className="py-16 text-center">
              <Brain className="mx-auto h-12 w-12 text-text-muted" />
              <p className="mt-4 text-sm text-text-muted">هنوز مدلی ثبت نشده است.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {models.map((model) => (
                <div key={model.modelId} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-bg-subtle transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-accent-subtle">
                      <Brain className="h-5 w-5 text-brand-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{model.modelName}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          {TYPE_LABELS[model.modelType] || model.modelType}
                        </span>
                        <span>·</span>
                        <span>نسخه {model.version}</span>
                        <span>·</span>
                        <span>{model.provider || 'نامشخص'}</span>
                      </div>
                      {model.description && (
                        <p className="mt-1.5 text-xs text-text-muted leading-relaxed">{model.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(model.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {model.createdBy || 'نامشخص'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-3 py-1 text-xs font-medium ${getStatusColor(model.status)}`}>
                      {STATUS_LABELS[model.status] || model.status}
                    </span>
                    <button className="rounded-lg p-2 text-text-muted hover:bg-bg-base hover:text-text-primary transition-colors" title="مشاهده جزئیات">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-2 text-text-muted hover:bg-bg-base hover:text-text-primary transition-colors" title="فعال/غیرفعال">
                      {model.status === 'production' ? (
                        <ToggleRight className="h-4 w-4 text-feedback-success" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
