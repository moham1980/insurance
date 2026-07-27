'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

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

    if (resFlags.success) {
      setFlags(resFlags.data);
    } else {
      setError(resFlags.error.message);
    }

    if (resToggles.success) {
      setToggles(resToggles.data);
    } else {
      setError(resToggles.error.message);
    }
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
    <main className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">تنظیمات</h1>
          <p className="mt-1 text-sm text-neutral-600">کنترل قابلیت‌ها و حالت AI</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">فعال بودن AI</div>
              <div className="mt-1 text-xs text-neutral-600">اگر خاموش شود، مسیرهای AI باید degrade شوند و فرایندها بدون AI قابل انجام باشند.</div>
            </div>

            <button
              type="button"
              disabled={loading || saving || !aiFlag}
              onClick={() => {
                if (!aiFlag) return;
                setFlag('ai.enabled', !aiFlag.isEnabled);
              }}
              className={
                'inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors ' +
                (aiFlag?.isEnabled ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-800 hover:bg-neutral-50')
              }
            >
              {loading ? 'در حال بارگذاری…' : aiFlag ? (aiFlag.isEnabled ? 'روشن' : 'خاموش') : 'نامشخص'}
            </button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">AI Toggles</div>
          <div className="mt-3 space-y-2">
            {toggles.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-neutral-600">{t.modelName || 'model: -'}</div>
                </div>

                <button
                  type="button"
                  disabled={loading || saving}
                  onClick={() => setAiToggle(t.name, !t.isEnabled)}
                  className={
                    'inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors ' +
                    (t.isEnabled ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-800 hover:bg-neutral-50')
                  }
                >
                  {t.isEnabled ? 'روشن' : 'خاموش'}
                </button>
              </div>
            ))}
            {toggles.length === 0 && !loading && <div className="text-sm text-neutral-600">هیچ AI toggleی موجود نیست.</div>}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">Feature Flags</div>
          <div className="mt-3 space-y-2">
            {flags.map((f) => (
              <div key={f.name} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                <div className="text-sm">{f.name}</div>
                <div className={f.isEnabled ? 'text-xs text-emerald-700' : 'text-xs text-rose-700'}>{f.isEnabled ? 'enabled' : 'disabled'}</div>
              </div>
            ))}
            {flags.length === 0 && !loading && <div className="text-sm text-neutral-600">هیچ flagی موجود نیست.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
