'use client';

import { useState, useEffect, useCallback } from 'react';
import { customer360Api } from '../lib/api';
import { Shield, Check, X, RefreshCw, AlertCircle } from 'lucide-react';

interface ConsentRecord {
  consentId: string;
  purpose: string;
  status: 'granted' | 'denied' | 'revoked' | 'expired';
  grantedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  source: string;
  channel: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  marketing: 'ارسال پیشنهادها و تبلیغات',
  analytics: 'تحلیل رفتار و بهبود خدمات',
  fraud_detection: 'تشخیص تقلب',
  third_party: 'اشتراک‌گذاری با طرف‌های ثالث',
  affiliates: 'اشتراک‌گذاری با شرکت‌های وابسته',
  data_processing: 'پردازش داده‌ها',
  data_sharing: 'اشتراک‌گذاری داده‌ها',
};

export default function ConsentManager({ customerId }: { customerId: string }) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const loadConsents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await customer360Api.listConsents(customerId);
      const rows = Array.isArray(response) ? response : response?.data || [];
      setConsents(rows);
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت رضایت‌ها');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  const handleGrant = async (purpose: string) => {
    try {
      setLoading(true);
      await customer360Api.recordConsent(customerId, { purpose, status: 'granted' });
      await loadConsents();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت رضایت');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (consentId: string) => {
    try {
      setLoading(true);
      await customer360Api.revokeConsent(customerId, consentId, revokeReason);
      setRevokeReason('');
      await loadConsents();
    } catch (err: any) {
      setError(err.message || 'خطا در لغو رضایت');
    } finally {
      setLoading(false);
    }
  };

  const activePurposes = new Set(consents.filter((c) => c.status === 'granted').map((c) => c.purpose));

  const predefinedPurposes = ['marketing', 'analytics', 'fraud_detection', 'third_party', 'affiliates'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">مدیریت رضایت‌ها</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && consents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> در حال بارگذاری...
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">رضایت‌های فعال</h3>
            {consents.length === 0 ? (
              <p className="text-sm text-gray-500">هیچ رضایت ثبت‌شده‌ای وجود ندارد.</p>
            ) : (
              <ul className="space-y-2">
                {consents.map((consent) => (
                  <li key={consent.consentId} className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{PURPOSE_LABELS[consent.purpose] || consent.purpose}</p>
                      <p className="text-xs text-gray-500">وضعیت: {consent.status}</p>
                      {consent.expiresAt && <p className="text-xs text-gray-500">انقضا: {new Date(consent.expiresAt).toLocaleDateString('fa-IR')}</p>}
                    </div>
                    {consent.status === 'granted' && (
                      <button
                        onClick={() => handleRevoke(consent.consentId)}
                        disabled={loading}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> لغو
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">افزودن رضایت</h3>
            <div className="flex flex-wrap gap-2">
              {predefinedPurposes
                .filter((p) => !activePurposes.has(p))
                .map((purpose) => (
                  <button
                    key={purpose}
                    onClick={() => handleGrant(purpose)}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> {PURPOSE_LABELS[purpose] || purpose}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
