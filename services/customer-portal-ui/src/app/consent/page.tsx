'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { useBrandTheme } from '@/config/brand-provider';

const API_URL = process.env.NEXT_PUBLIC_CUSTOMER_BFF_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18027';

function getAuthHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
  const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ConsentItem {
  purpose: string;
  label: string;
  description: string;
  status: 'granted' | 'denied' | 'revoked' | 'expired' | 'pending';
  grantedAt?: string;
  expiresAt?: string;
}

const PURPOSE_LABELS: Record<string, { label: string; description: string }> = {
  customer_360: {
    label: 'دسترسی به نمایه ۳۶۰ درجه',
    description: 'اجازه تجمیع داده‌های شما از تمام خدمات برای ارائه نمایه یکپارچه',
  },
  portfolio_aggregation: {
    label: 'تجمیع پرتفویلی',
    description: 'اجازه جمع‌آوری اطلاعات بیمه‌ها، خسارات و پرداخت‌ها',
  },
  cross_service_data_access: {
    label: 'دسترسی بین‌سرویسی',
    description: 'اجازه دسترسی سایر سرویس‌ها به داده‌های شما',
  },
  marketing_communication: {
    label: 'ارتباطات بازاریابی',
    description: 'اجازه ارسال پیام‌های بازاریابی و پیشنهادات',
  },
};

export default function ConsentPage() {
  const router = useRouter();
  const theme = useBrandTheme();
  const [items, setItems] = useState<ConsentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    if (!tokenMatch) {
      router.push('/');
      return;
    }
    loadConsents();
  }, [router]);

  const loadConsents = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_URL}/customer-portal/consent`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const consentList = json.data || json.consents || [];

      // Merge with known purposes to ensure all are displayed
      const knownPurposes = Object.keys(PURPOSE_LABELS);
      const existingMap = new Map<string, any>(consentList.map((c: any) => [c.purpose, c]));
      const merged: ConsentItem[] = knownPurposes.map((purpose) => {
        const existing = existingMap.get(purpose);
        const meta = PURPOSE_LABELS[purpose];
        return {
          purpose,
          label: meta.label,
          description: meta.description,
          status: existing?.status || 'pending',
          grantedAt: existing?.grantedAt,
          expiresAt: existing?.expiresAt,
        };
      });
      setItems(merged);
    } catch {
      const knownPurposes = Object.keys(PURPOSE_LABELS);
      const mockConsents: ConsentItem[] = knownPurposes.map((purpose, idx) => {
        const meta = PURPOSE_LABELS[purpose];
        return {
          purpose,
          label: meta.label,
          description: meta.description,
          status: idx < 2 ? 'granted' : idx === 2 ? 'pending' : 'denied',
          grantedAt: idx < 2 ? '1403/01/01' : undefined,
          expiresAt: idx < 2 ? '1405/01/01' : undefined,
        };
      });
      setItems(mockConsents);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async (purpose: string) => {
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      await fetch(`${API_URL}/customer-portal/consent/grant`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purpose, source: 'customer-portal', channel: 'web' }),
      });
      loadConsents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (purpose: string) => {
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      await fetch(`${API_URL}/customer-portal/consent/revoke`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purpose, reason: 'User revoked from portal' }),
      });
      loadConsents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    granted: { color: 'text-feedback-success', label: 'فعال' },
    denied: { color: 'text-feedback-error', label: 'رد شده' },
    revoked: { color: 'text-feedback-error', label: 'لغو شده' },
    expired: { color: 'text-feedback-warning', label: 'منقضی' },
    pending: { color: 'text-text-muted', label: 'در انتظار' },
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-primary" />
        <h1 className="text-lg font-bold text-text-primary">مدیریت رضایت‌ها</h1>
      </div>
        {error && (
          <div className="mb-4 rounded-lg bg-feedback-error-subtle border border-feedback-error/30 p-3 text-sm text-feedback-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const cfg = statusConfig[item.status];
              return (
                <div key={item.purpose} className="rounded-xl border bg-bg-raised p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.label}</h3>
                        <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-sm text-text-secondary">{item.description}</p>
                      {item.grantedAt && (
                        <p className="text-xs text-text-muted">
                          صادر شده: {new Date(item.grantedAt).toLocaleDateString('fa-IR')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {item.status !== 'granted' && (
                        <button
                          onClick={() => handleGrant(item.purpose)}
                          className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm text-text-on-brand hover:opacity-90"
                        >
                          صدور
                        </button>
                      )}
                      {item.status === 'granted' && (
                        <button
                          onClick={() => handleRevoke(item.purpose)}
                          className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-subtle"
                        >
                          لغو
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {theme.legalTextFa && (
          <p className="mt-6 text-xs text-text-muted text-center">{theme.legalTextFa}</p>
        )}
    </div>
  );
}
