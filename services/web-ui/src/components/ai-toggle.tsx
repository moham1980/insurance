'use client';

import { useEffect, useMemo, useState } from 'react';

// AI toggle now uses cookies instead of localStorage for security
const COOKIE_KEY = 'x-ai-enabled';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=86400; samesite=lax${secure}`;
}

export function AiToggle() {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    const raw = getCookie(COOKIE_KEY);
    if (raw === 'true') setEnabled(true);
    if (raw === 'false') setEnabled(false);
  }, []);

  const label = useMemo(() => (enabled ? 'AI: روشن' : 'AI: خاموش'), [enabled]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        setCookie(COOKIE_KEY, next ? 'true' : 'false');
      }}
      className={
        'inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors ' +
        (enabled ? 'bg-brand-primary text-text-on-brand border-brand-primary' : 'bg-bg-raised text-text-primary border-border-default hover:bg-bg-base')
      }
      aria-pressed={enabled}
    >
      {label}
    </button>
  );
}
