import { OverviewCards } from '@/components/overview-cards';

export default function Page() {
  return (
    <main className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">داشبورد عملیات</h1>
          <p className="text-sm text-neutral-600">نمای کلی سرویس‌ها و مسیرهای عملیاتی</p>
        </div>
      </div>

      <div className="mt-6">
        <OverviewCards />
      </div>
    </main>
  );
}
