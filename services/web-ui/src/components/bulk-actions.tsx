'use client';

import { useState } from 'react';

type BulkAction = {
  id: string;
  label: string;
  confirm?: boolean;
  confirmText?: string;
  danger?: boolean;
};

interface BulkActionsProps {
  selectedCount: number;
  actions: BulkAction[];
  onAction: (actionId: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function BulkActions({ selectedCount, actions, onAction, onClear, disabled = false }: BulkActionsProps) {
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  const action = actions.find((a) => a.id === confirmingAction);

  function handleActionClick(actionId: string) {
    const act = actions.find((a) => a.id === actionId);
    if (act?.confirm) {
      setConfirmingAction(actionId);
    } else {
      onAction(actionId);
    }
  }

  function handleConfirm() {
    if (confirmingAction) {
      onAction(confirmingAction);
      setConfirmingAction(null);
    }
  }

  function handleCancel() {
    setConfirmingAction(null);
  }

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-40">
      <div className="rounded-2xl border bg-white p-4 shadow-2xl">
        {confirmingAction && action ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold">{action.label}</div>
              {action.confirmText && <div className="mt-1 text-xs text-neutral-600">{action.confirmText}</div>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`rounded-xl px-3 py-2 text-sm ${
                  action.danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                تأیید
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold">
              {selectedCount} مورد انتخاب شده
            </div>
            <div className="flex gap-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleActionClick(action.id)}
                  disabled={disabled}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    action.danger
                      ? 'border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50'
                      : 'border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50'
                  }`}
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onClear}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
              >
                پاک کردن
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
