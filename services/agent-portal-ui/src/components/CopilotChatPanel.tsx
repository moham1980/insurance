import * as React from 'react';
import { Sparkles, X, Send, Shield, AlertCircle } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const initialMessages: ChatMessage[] = [
  { role: 'assistant', content: 'سلام! من دستیار هوشمند شما هستم. می‌توانم در مورد بیمه‌نامه‌ها، خسارت‌ها، کمیسیون‌ها و سرنخ‌ها به شما کمک کنم.' },
];

const suggestions = [
  'وضعیت بیمه‌نامه‌های فعال چیست؟',
  'کمیسیون این ماه چقدر است؟',
  'بهترین سرنخ‌های فعالی کدامند؟',
  'خسارت‌های در حال بررسی را نشان بده',
];

const mockResponses: Record<string, string> = {
  'وضعیت بیمه‌نامه‌های فعال چیست؟': 'شما در حال حاضر ۲۳۴ بیمه‌نامه فعال دارید. ۱۸۰ مورد وضعیت «در حال اجرا»، ۳۸ مورد «در انتظار تمدید» و ۱۶ مورد «در انتظار صدور» دارند.',
  'کمیسیون این ماه چقدر است؟': 'کمیسیون این ماه شما: ۲۸٬۴۵۰٬۰۰۰ تومان (پرداخت شده: ۱۸٬۲۰۰٬۰۰۰ تومان، در انتظار: ۱۰٬۲۵۰٬۰۰۰ تومان). رشد ۱۲٪ نسبت به ماه قبل.',
  'بهترین سرنخ‌های فعالی کدامند؟': '۳ سرنخ داغ شما: ۱) علی محمدی - بیمه ثالثی (احتمال ۸۵٪) ۲) مریم احمدی - بیمه آتش‌سوزی (احتمال ۷۰٪) ۳) حسین رضایی - بیمه حوادث (احتمال ۶۵٪).',
  'خسارت‌های در حال بررسی را نشان بده': '۴ خسارت در حال بررسی: CLM-92145 (تصادف، ۱۵ میلیون)، CLM-92147 (آتش‌سوزی، در حال ارزیابی)، CLM-92149 (ثالثی، مستندات ناقص)، CLM-92150 (حوادث، در انتظار کارشناس).',
};

export function CopilotChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const response = mockResponses[msg] || 'متأسفم، در حال حاضر نمی‌توانم به این سؤال پاسخ دهم. لطفاً با پشتیبانی تماس بگیرید.';
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed bottom-0 left-0 z-50 flex h-[32rem] w-96 flex-col rounded-t-2xl border border-border-default bg-bg-raised shadow-2xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default bg-gradient-to-l from-brand-primary to-brand-secondary px-4 py-3 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-raised text-text-on-brand">
            <Sparkles className="h-4 w-4 text-text-on-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-on-brand">دستیار هوشمند</h3>
            <p className="text-[10px] text-brand-primary-subtle">AI Copilot</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-text-on-brand/80 hover:bg-bg-raised/10">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-brand-primary text-text-on-brand rounded-bl-sm'
                : 'bg-bg-base text-text-primary rounded-br-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="rounded-2xl bg-bg-base px-3 py-2">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="border-t border-border-default p-3 space-y-1.5">
          {suggestions.map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="flex w-full items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-xs text-text-muted hover:bg-bg-base">
              <Sparkles className="h-3 w-3 text-brand-primary" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border-default p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="سؤال خود را بنویسید..."
            className="flex-1 rounded-xl border border-border-default px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-text-on-brand hover:opacity-90 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
          <Shield className="h-3 w-3" />
          اطلاعات محرمانه است و توسط AI پردازش می‌شود
        </div>
      </div>
    </div>
  );
}
