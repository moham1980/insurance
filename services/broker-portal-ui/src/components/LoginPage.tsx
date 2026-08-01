import * as React from 'react';
import { Briefcase, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui';

export function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const authUrl = process.env.NEXT_PUBLIC_BROKER_BFF_URL || 'http://localhost:3030';
      const res = await fetch(`${authUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'نام کاربری یا رمز عبور اشتباه است' }));
        throw new Error(err.message || 'نام کاربری یا رمز عبور اشتباه است');
      }
      const data = await res.json();
      const token = data?.data?.token || data?.token || data?.data?.accessToken;
      if (!token) throw new Error('توکن دریافت نشد');
      onLogin(token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-secondary/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border-default bg-bg-raised/95 p-8 backdrop-blur-xl shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary shadow-lg">
              <Briefcase className="h-8 w-8 text-text-on-brand" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">پورتال کارگزاری</h1>
            <p className="mt-2 text-sm text-text-muted">سامانه مدیریت بیمه‌گری کارگزاری</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">نام کاربری</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری خود را وارد کنید"
                  className="w-full rounded-lg border border-border-default bg-bg-raised py-3 pr-11 pl-4 text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور"
                  className="w-full rounded-lg border border-border-default bg-bg-raised py-3 pr-11 pl-11 text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-feedback-error/30 bg-feedback-error-subtle px-4 py-2.5 text-sm text-feedback-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (!username && !password)}
              fullWidth
              size="lg"
              isLoading={loading}
            >
              {loading ? 'در حال ورود...' : 'ورود به پورتال'}
            </Button>
          </form>

          <div className="mt-6 border-t border-border-subtle pt-4 text-center">
            <p className="text-xs text-text-muted">
              © ۱۴۰۳ سامانه مدیریت کارگزاری بیمه
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
