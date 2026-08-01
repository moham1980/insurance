'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, Eye, EyeOff, Sparkles, TrendingUp, Users, FileText } from 'lucide-react';
import { Button } from '@insurance/design-system';
import { loginBFF } from '@/lib/api';

export default function ChannelLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginBFF(username, password);
      const token = result?.data?.token || result?.token || result?.data?.accessToken;
      if (!token) throw new Error('توکن دریافت نشد');
      document.cookie = `auth-token=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=lax`;
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به سیستم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4">
        <div className="rounded-3xl border border-border-default bg-bg-raised p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary shadow-lg shadow-brand-primary/30">
              <Shield className="h-8 w-8 text-text-on-brand" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-text-primary">پورتال کانال فروش</h1>
            <p className="mt-2 text-sm text-text-muted">ورود به سیستم مدیریت کانال فروش بیمه</p>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-subtle p-3">
              <Users className="h-5 w-5 text-brand-primary" />
              <span className="text-[10px] text-text-muted">۱۴۲ مشتری</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-subtle p-3">
              <FileText className="h-5 w-5 text-brand-primary" />
              <span className="text-[10px] text-text-muted">۲۳۴ بیمه‌نامه</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-subtle p-3">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
              <span className="text-[10px] text-text-muted">+۱۲٪ رشد</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-feedback-error/30 bg-feedback-error-subtle px-4 py-3 text-sm text-feedback-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">نام کاربری</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری خود را وارد کنید"
                  className="w-full rounded-xl border border-border-default bg-bg-subtle px-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور خود را وارد کنید"
                  className="w-full rounded-xl border border-border-default bg-bg-subtle px-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-text-on-brand shadow-lg shadow-brand-primary/30 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-on-brand/30 border-t-text-on-brand" />
                  در حال ورود...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  ورود به پورتال
                </>
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-text-muted">
            © ۱۴۰۳ سامانه مدیریت کانال فروش بیمه
          </p>
        </div>
      </div>
    </div>
  );
}
