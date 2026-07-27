'use client';

import { useState } from 'react';

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
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm ${
              danger
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
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
