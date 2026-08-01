import * as React from 'react';
import { Shield, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';

export function AgentLoginPage({ onLogin }: { onLogin: (token: string, agentId: string, partnerId: string, tenantId: string) => void }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await agentPortalAPI.login(username, password);
      onLogin(result.token, result.agentId, result.partnerId, result.tenantId);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به سیستم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-base via-bg-subtle to-bg-base" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-border-default bg-bg-raised/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary shadow-lg shadow-brand-primary/30">
              <Shield className="h-8 w-8 text-text-on-brand" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-text-on-brand">پورتال نماینده</h1>
            <p className="mt-2 text-sm text-text-muted">ورود به سیستم مدیریت نمایندگی</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-feedback-error/30 bg-feedback-error/10 px-4 py-3 text-sm text-feedback-error">
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
                  className="w-full rounded-xl border border-border-default bg-bg-base px-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
                  className="w-full rounded-xl border border-border-default bg-bg-base px-11 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-3 text-sm font-semibold text-text-on-brand shadow-lg shadow-brand-primary/30 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
            © ۱۴۰۳ سامانه مدیریت نمایندگی بیمه
          </p>
        </div>
      </div>
    </div>
  );
}
