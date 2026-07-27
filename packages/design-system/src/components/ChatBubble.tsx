import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { User, Bot } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: { title: string; url?: string }[];
}

export interface ChatBubbleProps {
  message: ChatMessage;
  className?: string;
}

export function ChatBubble({ message, className }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row', className)}>
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-brand-primary text-text-on-brand' : 'bg-bg-subtle text-text-secondary'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-brand-primary text-text-on-brand rounded-tr-none'
            : 'bg-bg-subtle text-text-primary rounded-tl-none border border-border-default'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-border-default pt-2">
            {message.sources.map((src, i) => (
              <li key={i} className="text-xs text-text-muted">
                {src.url ? (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary">
                    {src.title}
                  </a>
                ) : (
                  src.title
                )}
              </li>
            ))}
          </ul>
        )}
        <time className="mt-1 block text-xs opacity-60" dateTime={new Date(message.timestamp).toISOString()}>
          {new Date(message.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  );
}
