'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAuthState } from '@/lib/api';

type AuthUser = {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

function readUser(): AuthUser | null {
  try {
    const match = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^| )auth-user=([^;]+)')) : null;
    if (!match) return null;
    const obj = JSON.parse(decodeURIComponent(match[2]));
    if (!obj || typeof obj !== 'object') return null;
    return obj as AuthUser;
  } catch {
    return null;
  }
}

function hasToken(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const match = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'));
    return !!match && match[2].length > 0;
  } catch {
    return false;
  }
}

export function UserSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setAuthed(hasToken());
      setUser(readUser());
    };

    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, []);

  if (!authed) {
    return (
      <Link href="/login" className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-subtle">
        ورود
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <div className="text-xs font-semibold">
          {user ? `${user.firstName} ${user.lastName}` : 'کاربر'}
        </div>
        <div className="text-[11px] text-text-muted">{user?.roles?.[0] || user?.username || ''}</div>
      </div>

      <button
        type="button"
        onClick={() => {
          clearAuthState();
          try {
            window.location.href = '/login';
          } catch {
            // ignore
          }
        }}
        className="rounded-xl border px-3 py-2 text-sm hover:bg-bg-subtle"
      >
        خروج
      </button>
    </div>
  );
}
