import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Send, Mic } from 'lucide-react';

export interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, placeholder = 'پیام خود را بنویسید...', disabled, className }: ChatInputProps) {
  const [text, setText] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-border-default bg-bg-raised px-3 py-2',
        className
      )}
    >
      <button
        type="button"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-subtle"
        aria-label="ضبط صدا"
      >
        <Mic className="h-4 w-4" />
      </button>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary text-text-on-brand transition-opacity hover:opacity-90 disabled:opacity-40"
        aria-label="ارسال"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
