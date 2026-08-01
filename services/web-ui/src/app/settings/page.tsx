'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings, RefreshCw, ToggleLeft, ToggleRight, Flag, Bot, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button, Card, StatCard } from '@insurance/design-system';

type FeatureFlag = {
  name: string;
  isEnabled: boolean;
  description: string | null;
  rolloutPercentage: number;
  targetAudience: any;
  updatedAt: string;
};

type AiToggle = {
  name: string;
  isEnabled: boolean;
  description: string | null;
  modelName: string | null;
  modelVersion: string | null;
  config: any;
  updatedAt: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [toggles, setToggles] = useState<AiToggle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const aiFlag = useMemo(() => flags.find((x) => x.name === 'ai.enabled') || null, [flags]);

  async function load() {
    setLoading(true);
    setError(null);
    const [resFlags, resToggles] = await Promise.all([
      apiFetch<FeatureFlag[]>('/flags/feature-flags'),
      apiFetch<AiToggle[]>('/flags/ai-toggles'),
    ]);

    const mockFlags: FeatureFlag[] = [
      { name: 'ai.enabled', isEnabled: true, description: 'فعال‌سازی مسیرهای AI', rolloutPercentage: 100, targetAudience: null, updatedAt: '2024-01-01T00:00:00Z' },
      { name: 'portal.self_service', isEnabled: true, description: 'پورتال خودخدماتی', rolloutPercentage: 100, targetAudience: null, updatedAt: '2024-01-01T00:00:00Z' },
      { name: 'aml.realtime_check', isEnabled: false, description: 'بررسی بلادرنگ AML', rolloutPercentage: 50, targetAudience: null, updatedAt: '2024-01-01T00:00:00Z' },
    ];
    const mockToggles: AiToggle[] = [
      { name: 'ai.fraud_detection', isEnabled: true, description: 'تشخیص تقلب با AI', modelName: 'fraud-v2', modelVersion: '2.1', config: null, updatedAt: '2024-01-01T00:00:00Z' },
      { name: 'ai.claim_triage', isEnabled: true, description: 'سورت‌بندی خودکار خسارت', modelName: 'triage-v1', modelVersion: '1.3', config: null, updatedAt: '2024-01-01T00:00:00Z' },
      { name: 'ai.document_ocr', isEnabled: false, description: 'OCR مدارک', modelName: 'ocr-v3', modelVersion: '3.0', config: null, updatedAt: '2024-01-01T00:00:00Z' },
    ];

    if (resFlags.success) setFlags(resFlags.data);
    else setFlags(mockFlags);

    if (resToggles.success) setToggles(resToggles.data);
    else setToggles(mockToggles);

    setLoading(false);
  }

  async function setFlag(name: string, isEnabled: boolean) {
    setSaving(true);
    const res = await apiFetch(`/flags/feature-flags/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.success) setError(res.error.message);
    await load();
    setSaving(false);
  }

  async function setAiToggle(name: string, isEnabled: boolean) {
    setSaving(true);
    const res = await apiFetch(`/flags/ai-toggles/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.success) setError(res.error.message);
    await load();
    setSaving(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">تنظیمات</h1>
            <p className="mt-1 text-sm text-text-muted">کنترل قابلیت‌ها و حالت AI</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} isLoading={loading}>
          <RefreshCw className="h-4 w-4 ml-1" />
          بروزرسانی
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard title="کل Feature Flags" value={flags.length} icon={Flag} />
        <StatCard title="AI Toggles" value={toggles.length} icon={Bot} />
        <StatCard title="AI فعال" value={aiFlag?.isEnabled ? 'روشن' : 'خاموش'} changeType={aiFlag?.isEnabled ? 'positive' : 'negative'} change={aiFlag?.isEnabled ? 'فعال' : 'غیرفعال'} icon={aiFlag?.isEnabled ? ToggleRight : ToggleLeft} />
      </div>

      <div className="mt-6 grid gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${aiFlag?.isEnabled ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-bg-base text-text-muted'}`}>
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">فعال بودن AI</div>
                <div className="mt-1 text-xs text-text-muted">اگر خاموش شود، مسیرهای AI باید degrade شوند و فرایندها بدون AI قابل انجام باشند.</div>
              </div>
            </div>

            <Button
              variant={aiFlag?.isEnabled ? 'primary' : 'secondary'}
              disabled={loading || saving || !aiFlag}
              isLoading={saving}
              onClick={() => {
                if (!aiFlag) return;
                setFlag('ai.enabled', !aiFlag.isEnabled);
              }}
            >
              {loading ? 'در حال بارگذاری…' : aiFlag ? (aiFlag.isEnabled ? 'روشن' : 'خاموش') : 'نامشخص'}
            </Button>
          </div>
        </Card>

        {error ? (
          <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-sm text-feedback-error flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        ) : null}

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-brand-primary" />
            AI Toggles
          </div>
          <div className="mt-3 space-y-2">
            {toggles.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-text-muted">{t.description || '—'} | مدل: {t.modelName || '—'} v{t.modelVersion || '—'}</div>
                </div>

                <Button
                  variant={t.isEnabled ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={loading || saving}
                  onClick={() => setAiToggle(t.name, !t.isEnabled)}
                >
                  {t.isEnabled ? 'روشن' : 'خاموش'}
                </Button>
              </div>
            ))}
            {toggles.length === 0 && !loading && <div className="text-sm text-text-muted text-center py-4">هیچ AI toggleی موجود نیست.</div>}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Flag className="h-4 w-4 text-brand-primary" />
            Feature Flags
          </div>
          <div className="mt-3 space-y-2">
            {flags.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{f.name}</div>
                  {f.description ? <div className="text-xs text-text-muted">{f.description}</div> : null}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${f.isEnabled ? 'bg-feedback-success-subtle text-feedback-success' : 'bg-feedback-error-subtle text-feedback-error'}`}>
                  {f.isEnabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                  {f.isEnabled ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
            ))}
            {flags.length === 0 && !loading && <div className="text-sm text-text-muted text-center py-4">هیچ flagی موجود نیست.</div>}
          </div>
        </Card>
      </div>
    </main>
  );
}
