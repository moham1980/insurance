'use client';

import Link from 'next/link';
import { clearAuthState } from '@/lib/api';

export default function ForbiddenPage() {
  return (
    <main className="p-6" dir="rtl">
      <div className="mx-auto max-w-xl rounded-2xl border border-border-default bg-bg-raised p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-feedback-error-subtle">
          <svg className="h-7 w-7 text-feedback-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM12 3l9.75 16.5H2.25L12 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-text-primary">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-text-muted">شما مجوز کافی برای مشاهده این صفحه یا انجام این عملیات را ندارید.</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl border border-border-default bg-bg-base px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-subtle">
            بازگشت به داشبورد
          </Link>
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
            className="rounded-xl border border-border-default bg-bg-base px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-subtle"
          >
            ورود با حساب دیگر
          </button>
        </div>
      </div>
    </main>
  );
}
