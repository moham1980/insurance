'use client';

import { useState } from 'react';
import { Card } from '@insurance/design-system';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'تأیید',
  cancelText = 'انصراف',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg-overlay" onClick={onCancel} />
      <Card className="relative w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-base"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm ${
              danger
                ? 'bg-feedback-error text-text-on-brand hover:opacity-90'
                : 'bg-brand-primary text-text-on-brand hover:opacity-90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </Card>
    </div>
  );
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  function confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) {
    setConfig(options);
    setIsOpen(true);
  }

  function handleConfirm() {
    config?.onConfirm();
    setIsOpen(false);
    setConfig(null);
  }

  function handleCancel() {
    setIsOpen(false);
    setConfig(null);
  }

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
