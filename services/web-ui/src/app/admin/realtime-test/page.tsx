'use client';

import { useState, useEffect } from 'react';
import { useRealtime, getRealtimeManager } from '@/lib/realtime';
import { apiFetch } from '@/lib/api';
import { getAuthUser } from '@/lib/api';
import { enterprisePermissionsForRoles, hasEnterprisePermission } from '@/lib/enterprise-rbac';

type TestEvent = {
  type: string;
  data: any;
  timestamp: string;
  correlationId?: string;
};

export default function RealtimeTestPage() {
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const authUser = getAuthUser();
  const perms = enterprisePermissionsForRoles(authUser?.roles);
  const canTest = hasEnterprisePermission(perms, 'admin:users:view'); // Using admin permission for testing

  // Subscribe to all events for testing
  useRealtime(['*'], (event) => {
    setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
  });

  useEffect(() => {
    const manager = getRealtimeManager();
    setIsConnected(manager.isConnectionActive());

    const interval = setInterval(() => {
      setIsConnected(manager.isConnectionActive());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function sendTestEvent() {
    if (!testMessage.trim()) return;

    try {
      // Send a test event via API (this would normally be sent from backend)
      const res = await apiFetch('/admin/test-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'test:message',
          data: { message: testMessage, timestamp: new Date().toISOString() },
        }),
      });

      if (res.success) {
        setTestMessage('');
      }
    } catch (error) {
      console.error('Failed to send test event:', error);
    }
  }

  function clearEvents() {
    setEvents([]);
  }

  const eventTypes = [...new Set(events.map((e) => e.type))];

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">تست اتصال زنده (Realtime)</h1>
          <p className="mt-1 text-sm text-neutral-600">تست و نمایش رویدادهای زنده از طریق SSE</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearEvents}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
          >
            پاک کردن رویدادها
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4">
          <h2 className="text-sm font-semibold mb-3">وضعیت اتصال</h2>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-sm">{isConnected ? 'متصل' : 'قطع'}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-600">
            تعداد رویدادهای دریافت شده: {events.length}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <h2 className="text-sm font-semibold mb-3">ارسال رویداد تست</h2>
          <div className="flex gap-2">
            <input
              className="rounded-xl border px-3 py-2 text-sm flex-1"
              placeholder="پیام تست..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendTestEvent()}
            />
            <button
              type="button"
              onClick={sendTestEvent}
              disabled={!testMessage.trim() || !isConnected}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              ارسال
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="text-sm font-semibold mb-3">فیلتر رویدادها</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEvents(events.filter(() => true))}
            className="rounded-xl border px-3 py-1 text-xs hover:bg-neutral-50"
          >
            همه ({events.length})
          </button>
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setEvents(events.filter((e) => e.type === type))}
              className="rounded-xl border px-3 py-1 text-xs hover:bg-neutral-50"
            >
              {type} ({events.filter((e) => e.type === type).length})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {events.map((event, index) => (
          <div key={`${event.timestamp}-${index}`} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-neutral-100 px-2 py-1 rounded">
                    {event.type}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {new Date(event.timestamp).toLocaleTimeString('fa-IR')}
                  </span>
                  {event.correlationId && (
                    <span className="text-xs text-neutral-600">
                      ID: {event.correlationId}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-neutral-700">
                  {typeof event.data === 'string'
                    ? event.data
                    : JSON.stringify(event.data, null, 2)}
                </div>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center text-sm text-neutral-600 py-8">
            هنوز رویدادی دریافت نشده است
          </div>
        )}
      </div>
    </main>
  );
}
