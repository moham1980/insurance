'use client'

import { useState, useCallback } from 'react'
import { CopilotChat } from '@insurance/design-system'
import type { ChatMessage } from '@insurance/design-system'

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

  const handleEscalate = useCallback(() => {
    const escalateMsg: ChatMessage = {
      id: `e-${Date.now()}`,
      role: 'assistant',
      content: 'درخواست شما برای ارتباط با کارشناس انسان ثبت شد. به‌زودی با شما تماس گرفته خواهد شد.',
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, escalateMsg])
  }, [])

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <CopilotChat
        messages={messages}
        onSend={handleSend}
        onEscalate={handleEscalate}
        isLoading={isTyping}
        piiWarning
        className="flex-1"
      />
    </div>
  )
}
