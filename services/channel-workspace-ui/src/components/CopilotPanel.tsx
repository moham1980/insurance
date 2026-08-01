import * as React from 'react';
import { Sparkles, Send, X, Lightbulb, TrendingUp, FileText, ShieldAlert } from 'lucide-react';
import { postBFF } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestions = [
  { icon: TrendingUp, text: 'تحلیل عملکرد این ماه' },
  { icon: FileText, text: 'بیمه‌نامه‌های در حال انقضا' },
  { icon: ShieldAlert, text: 'خسارت‌های نیازمند پیگیری' },
  { icon: Lightbulb, text: 'پیشنهاد فروش متقاطع' },
];

export function CopilotPanel({ open, onClose, endpoint = '/api/v1/channel/copilot/chat' }: { open: boolean; onClose: () => void; endpoint?: string }) {
  const [messages, setMessages] = React.useState<Message[]>([
    { role: 'assistant', content: 'سلام! من دستیار هوشمند فضای کاری کانال هستم. چطور می‌توانم کمک کنم؟' },
  ]);
  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setTyping(true);

    try {
      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await postBFF(endpoint, { message: text, conversationHistory });
      const answer = res?.data?.answer || res?.data?.text || 'پاسخی دریافت نشد. لطفاً دوباره تلاش کنید.';
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      const errMsg = e?.message?.includes('HTTP')
        ? 'خطا در ارتباط با سرویس هوش مصنوعی. لطفاً دوباره تلاش کنید.'
        : 'سرویس هوش مصنوعی در دسترس نیست. لطفاً بعداً تلاش کنید.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setTyping(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col bg-bg-raised shadow-2xl" dir="rtl">
      <div className="flex items-center justify-between border-b border-border-default bg-gradient-to-l from-brand-primary to-brand-secondary px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-raised/20">
            <Sparkles className="h-5 w-5 text-text-on-brand" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-on-brand">دستیار هوشمند</p>
            <p className="text-[10px] text-text-on-brand/80">فضای کاری کانال</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-text-on-brand/80 hover:bg-bg-raised/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-brand-primary/10 text-text-primary rounded-bl-sm'
                : 'bg-bg-subtle text-text-primary rounded-br-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-br-sm bg-bg-subtle px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="mb-2 text-xs font-medium text-text-muted">پیشنهادها:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.text} onClick={() => send(s.text)}
                  className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-right text-xs text-text-primary hover:bg-brand-primary/10 hover:border-brand-primary/30">
                  <Icon className="h-3.5 w-3.5 text-brand-primary" />
                  {s.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-border-default p-3">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="سوال خود را بنویسید..."
            className="flex-1 rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
          <button type="submit" disabled={!input.trim() || typing}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-text-on-brand disabled:opacity-40 hover:opacity-90">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
