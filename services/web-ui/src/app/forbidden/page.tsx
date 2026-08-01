'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { clearAuthState } from '@/lib/api';
import { Card } from '@insurance/design-system';

export default function ForbiddenPage() {
  return (
    <main className="p-6" dir="rtl">
      <Card className="mx-auto max-w-xl p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-feedback-error-subtle">
          <AlertTriangle className="h-7 w-7 text-feedback-error" />
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
      </Card>
    </main>
  );
}
