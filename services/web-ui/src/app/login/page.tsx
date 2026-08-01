'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Lock, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type LoginResponse = {
  token: string;
  user: {
    userId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: string[];
    department: string | null;
    orgUnitId: string | null;
    positionTitle: string | null;
    nationalId: string | null;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    const res = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.success) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-secondary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4">
        <div className="rounded-3xl border border-border-default bg-bg-raised p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary shadow-lg shadow-brand-primary/30">
              <Shield className="h-8 w-8 text-text-on-brand" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-text-primary">کنسول عملیات بیمه</h1>
            <p className="mt-2 text-sm text-text-muted">ورود به سیستم مدیریت عملیات بیمه‌گری</p>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-subtle p-3">
              <Building2 className="h-5 w-5 text-brand-primary" />
              <span className="text-[10px] text-text-muted">سازمان‌ها</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-subtle p-3">
              <Shield className="h-5 w-5 text-brand-primary" />
              <span className="text-[10px] text-text-muted">امن</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-subtle p-3">
              <User className="h-5 w-5 text-brand-primary" />
              <span className="text-[10px] text-text-muted">چندنقشی</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-4 py-3 text-sm text-feedback-error">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs font-medium text-text-secondary">نام کاربری</span>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  className="w-full rounded-xl border border-border-default bg-bg-subtle px-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری"
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="text-xs font-medium text-text-secondary">رمز عبور</span>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  className="w-full rounded-xl border border-border-default bg-bg-subtle px-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور"
                />
              </div>
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={loading || !username || !password}
              className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-3 py-3 text-sm font-medium text-text-on-brand disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {loading ? 'در حال ورود…' : 'ورود به سیستم'}
            </button>
          </div>

          <div className="mt-8 text-center text-xs text-text-muted">
            <p>© ۱۴۰۵ کنسول عملیات بیمه - تمامی حقوق محفوظ است</p>
          </div>
        </div>
      </div>
    </div>
  );
}
