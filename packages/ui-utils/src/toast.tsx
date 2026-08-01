'use client';
import * as React from 'react';
import { useReducedMotion } from './hooks';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 5000 };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => removeToast(toast.id), toast.duration)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  const value = React.useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const typeStyles: Record<ToastType, string> = {
  success: 'border-l-feedback-success bg-feedback-success-subtle text-feedback-success',
  error: 'border-l-feedback-error bg-feedback-error-subtle text-feedback-error',
  warning: 'border-l-feedback-warning bg-feedback-warning-subtle text-feedback-warning',
  info: 'border-l-feedback-info bg-feedback-info-subtle text-feedback-info',
};

export function ToastViewport() {
  const { toasts } = useToast();
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="اعلان‌ها"
      className="fixed left-4 top-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm rounded-md border-l-4 p-3 shadow-2 ${typeStyles[toast.type]} ${reducedMotion ? '' : 'animate-slide-in-right'}`}
          role="status"
        >
          <div className="text-sm font-medium">{toast.title}</div>
          {toast.description && <div className="mt-1 text-xs opacity-90">{toast.description}</div>}
        </div>
      ))}
    </div>
  );
}
