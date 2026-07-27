import * as React from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-desc' : undefined}
      >
        {title && (
          <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
        )}
        {description && (
          <p id="dialog-desc" className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
