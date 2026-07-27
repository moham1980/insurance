'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 ${sizeClasses[size]}`} />
      {text && <span className="text-sm text-neutral-600">{text}</span>}
    </div>
  );
}

interface LoadingOverlayProps {
  loading: boolean;
  text?: string;
}

export function LoadingOverlay({ loading, text = 'در حال بارگذاری...' }: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
        <span className="text-sm text-neutral-600">{text}</span>
      </div>
    </div>
  );
}
