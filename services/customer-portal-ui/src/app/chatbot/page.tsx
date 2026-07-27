'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatBubble, ChatInput } from '@insurance/design-system'
import type { ChatMessage } from '@insurance/design-system'
import { Sparkles } from 'lucide-react'

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'سلام! من دستیار هوشمند بیمه پلاس هستم. چطور می‌توانم کمکتان کنم؟',
      timestamp: Date.now(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    // TODO: Integrate with backend LLM API in Phase 3+
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: 'متوجه شدم. لطفاً با پشتیبانی تماس بگیرید یا از بخش «ثبت خسارت» استفاده کنید.',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border-default bg-bg-raised p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">دستیار هوشمند</h2>
          <p className="text-xs text-text-muted">آنلاین</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border-default bg-bg-raised p-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex gap-2 px-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-text-muted" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3">
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  )
}
