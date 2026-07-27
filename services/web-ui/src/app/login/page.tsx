'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <main className="p-6">
      <div className="mx-auto max-w-md rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">ورود</h1>
        <p className="mt-1 text-sm text-neutral-600">برای دسترسی به بخش‌های مدیریتی، وارد شوید.</p>

        <div className="mt-6 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-neutral-600">نام کاربری</span>
            <input className="rounded-xl border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs text-neutral-600">رمز عبور</span>
            <input
              type="password"
              className="rounded-xl border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <div className="text-sm text-rose-600">{error}</div> : null}

          <button
            type="button"
            onClick={submit}
            disabled={loading || !username || !password}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'در حال ورود…' : 'ورود'}
          </button>
        </div>
      </div>
    </main>
  );
}
