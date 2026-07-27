'use client';

import Link from 'next/link';
import { clearAuthState } from '@/lib/api';

export default function ForbiddenPage() {
  return (
    <main className="p-6">
      <div className="mx-auto max-w-xl rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-neutral-600">شما مجوز کافی برای مشاهده این صفحه یا انجام این عملیات را ندارید.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50">
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
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          >
            ورود با حساب دیگر
          </button>
        </div>
      </div>
    </main>
  );
}
