'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useRealtime, getRealtimeManager } from '@/lib/realtime';

export function RealtimeStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastEvent, setLastEvent] = useState<string>('');

  // Subscribe to connection events
  useRealtime(['connection', 'heartbeat'], (event) => {
    if (event.type === 'connection') {
      setStatus('connected');
    } else if (event.type === 'heartbeat') {
      setStatus('connected');
    }
  });

  // Check connection status periodically
  useEffect(() => {
    const manager = getRealtimeManager();
    const checkStatus = () => {
      if (manager.isConnectionActive()) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-feedback-success',
      bgColor: 'bg-feedback-success-subtle',
      text: 'اتصال زنده فعال',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-text-secondary',
      bgColor: 'bg-bg-base',
      text: 'اتصال زنده قطع',
    },
    error: {
      icon: AlertCircle,
      color: 'text-feedback-error',
      bgColor: 'bg-feedback-error-subtle',
      text: 'خطا در اتصال زنده',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${config.bgColor}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
      <span className={`text-xs font-medium ${config.color}`}>{config.text}</span>
      {lastEvent && (
        <span className="text-xs text-text-muted ml-2">
          آخرین رویداد: {new Date(lastEvent).toLocaleTimeString('fa-IR')}
        </span>
      )}
    </div>
  );
}
