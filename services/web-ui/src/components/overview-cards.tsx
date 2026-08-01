'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type HealthResult = {
  name: string;
  ok: boolean;
  ms: number;
};

const services = [
  { name: 'API Gateway', path: '/health' },
  { name: 'Claims', path: '/claims/health' },
  { name: 'Documents', path: '/documents/health' },
  { name: 'Fraud', path: '/fraud/health' },
  { name: 'Orchestrator', path: '/orchestrations/health' },
  { name: 'Auth', path: '/auth/health' },
  { name: 'Feature Flags', path: '/flags/health' },
];

export function OverviewCards() {
  const [items, setItems] = useState<HealthResult[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      const results: HealthResult[] = [];
      for (const s of services) {
        const start = performance.now();
        try {
          const res = await apiFetch<any>(s.path);
          const ms = Math.round(performance.now() - start);
          results.push({ name: s.name, ok: (res as any).success !== false, ms });
        } catch {
          const ms = Math.round(performance.now() - start);
          results.push({ name: s.name, ok: false, ms });
        }
      }

      if (alive) setItems(results);
    }

    run();
    const id = setInterval(run, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((x) => (
        <div key={x.name} className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{x.name}</div>
            <div className={x.ok ? 'text-sm text-feedback-success' : 'text-sm text-feedback-error'}>{x.ok ? 'OK' : 'DOWN'}</div>
          </div>
          <div className="mt-2 text-xs text-text-muted">{x.ms}ms</div>
        </div>
      ))}
    </div>
  );
}
