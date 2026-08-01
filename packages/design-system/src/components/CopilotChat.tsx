'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { Button } from './Button';
import { ChatBubble, type ChatMessage } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { Sparkles, Shield, AlertCircle } from 'lucide-react';

export interface CopilotChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onEscalate?: () => void;
  isLoading?: boolean;
  piiWarning?: boolean;
  className?: string;
  suggestions?: string[];
  modelVersion?: string;
}

export function CopilotChat({
  messages,
  onSend,
  onEscalate,
  isLoading,
  piiWarning = true,
  className,
  suggestions,
  modelVersion,
}: CopilotChatProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className={cn('flex h-full flex-col rounded-xl border border-border-default bg-bg-base', className)}>
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">دستیار هوشمند</h3>
            {modelVersion && <p className="text-caption text-text-muted">مدل: {modelVersion}</p>}
          </div>
        </div>
        {onEscalate && (
          <Button variant="ghost" size="sm" onClick={onEscalate}>
            <Shield className="ml-1 h-4 w-4" />
            ارتباط با انسان
          </Button>
        )}
      </div>

      {piiWarning && (
        <div className="flex items-center gap-2 bg-warning/10 px-4 py-2 text-caption text-warning">
          <AlertCircle className="h-3.5 w-3.5" />
          اطلاعات هویتی و مالی قبل از ارسال anonymize می‌شوند.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-text-muted">
            سوال خود را بپرسید یا از پیشنهادها استفاده کنید.
          </div>
        )}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-text-muted">
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand-primary" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand-primary [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand-primary [animation-delay:300ms]" />
            <span className="text-caption">در حال فکر کردن...</span>
          </div>
        )}
      </div>

      {suggestions && suggestions.length > 0 && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border-default px-4 py-3">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onSend(suggestion)}
              className="rounded-full border border-border-default bg-bg-subtle px-3 py-1.5 text-body-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border-default p-4">
        <ChatInput onSend={onSend} disabled={isLoading} />
      </div>
    </div>
  );
}
