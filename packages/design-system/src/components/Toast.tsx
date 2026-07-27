import * as React from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  onClose?: () => void;
}

const variantClasses: Record<ToastVariant, string> = {
  default: 'bg-background border-border text-foreground',
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
};

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-md border p-4 shadow-lg ${variantClasses[variant]}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="mt-1 text-xs opacity-80">{description}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export function ToastViewport({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2" dir="rtl">
      {children}
    </div>
  );
}
