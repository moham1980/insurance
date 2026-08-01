'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { CopilotChat } from '@insurance/design-system'
import type { ChatMessage } from '@insurance/design-system'

const SUGGESTIONS = [
  'چگونه خسارت ثبت کنم؟',
  'بیمه‌نامه‌های من کدامند؟',
  'نحوه تمدید بیمه‌نامه',
  'وضعیت خسارت من چیست؟',
  'پرداخت اقساط',
  'ثبت شکایت',
]

const MOCK_RESPONSES: Record<string, { content: string; sources?: { title: string; url?: string }[] }> = {
  'خسارت': {
    content: 'برای ثبت خسارت جدید، می‌توانید از بخش «ثبت خسارت» (FNOL) استفاده کنید. مراحل به این صورت است:\n\n۱. انتخاب بیمه‌نامه مربوطه\n۲. وارد کردن جزئیات حادثه (تاریخ، ساعت، محل)\n۳. وارد کردن اطلاعات راننده و شاهدان\n۴. بارگذاری مدارک و تصاویر\n\nپس از ثبت، کارشناس خسارت به پرونده شما اختصاص می‌یابد و طی ۴۸ ساعت با شما تماس می‌گیرد.',
    sources: [{ title: 'راهنمای ثبت خسارت', url: '/fnol' }],
  },
  'بیمه‌نامه': {
    content: 'شما می‌توانید تمام بیمه‌نامه‌های خود را در بخش «بیمه‌نامه‌های من» مشاهده کنید. در حال حاضر ۳ بیمه‌نامه فعال دارید:\n\n• بیمه شخص ثالث خودرو - INS-1403-7845129\n• بیمه آتش‌سوزی منزل - INS-1403-8821456\n• بیمه درمان تکمیلی - INS-1403-9933887\n\nبرای مشاهده جزئیات هر بیمه‌نامه، روی آن کلیک کنید.',
    sources: [{ title: 'لیست بیمه‌نامه‌ها', url: '/policies' }],
  },
  'تمدید': {
    content: 'برای تمدید بیمه‌نامه، دو راه وجود دارد:\n\n۱. تمدید مستقیم: از بخش «تمدید»، بیمه‌نامه مورد نظر را انتخاب کرده و تاریخ‌های جدید را وارد کنید.\n\n۲. مقایسه قیمت‌ها: از بخش «مقایسه تمدید»، می‌توانید قیمت‌های مختلف شرکت‌های بیمه را مقایسه کرده و بهترین پیشنهاد را انتخاب کنید.\n\nبیمه‌نامه خودرو شما ۱۴ روز دیگر منقضی می‌شود. پیشنهاد می‌کنیم از همین حالا اقدام کنید.',
    sources: [
      { title: 'تمدید بیمه‌نامه', url: '/renewal' },
      { title: 'مقایسه قیمت‌ها', url: '/renewal-comparison' },
    ],
  },
  'وضعیت': {
    content: 'خسارت CLM-1403-92145 شما در مرحله «در حال بررسی» است. کارشناس اختصاصی شما آقای رضا احمدی است.\n\nمراحل طی شده:\n✓ ثبت اولیه خسارت\n✓ انتساب کارشناس\n✓ بازرسی صحنه حادثه\n• در حال بررسی مدارک\n○ تأیید خسارت\n○ پرداخت\n\nپیش‌بینی می‌شود طی ۳ تا ۵ روز کاری نتیجه بررسی اعلام شود.',
    sources: [{ title: 'جزئیات خسارت', url: '/claims' }],
  },
  'پرداخت': {
    content: 'برای مشاهده و پرداخت اقساط حق بیمه، به بخش «پرداخت‌ها» مراجعه کنید.\n\nشما ۱ پرداخت سررسید شده دارید:\n• مبلغ: ۴،۸۵۰،۰۰۰ تومان\n• مربوط به: بیمه شخص ثالث خودرو\n• تاریخ سررسید: ۱۴۰۳/۰۷/۰۱\n\nمی‌توانید پرداخت را به صورت آنلاین انجام دهید.',
    sources: [{ title: 'پرداخت‌ها', url: '/payments' }],
  },
  'شکایت': {
    content: 'برای ثبت شکایت، به بخش «شکایات» مراجعه کنید. شما می‌توانید شکایت خود را در ۳ مرحله ثبت کنید:\n\n۱. انتخاب موضوع و دسته\n۲. شرح شکایت و جزئیات\n۳. بارگذاری مدارک (در صورت نیاز)\n\nپس از ثبت، شکایت شما طی ۷۲ ساعت بررسی و پاسخ داده می‌شود.',
    sources: [{ title: 'ثبت شکایت', url: '/complaints' }],
  },
}

function findMockResponse(text: string): { content: string; sources?: { title: string; url?: string }[] } {
  const lower = text.toLowerCase()
  for (const [keyword, response] of Object.entries(MOCK_RESPONSES)) {
    if (lower.includes(keyword.toLowerCase())) {
      return response
    }
  }
  return {
    content: 'سوال شما را دریافت کردم. در حال حاضر می‌توانم در زمینه‌های زیر کمک کنم:\n\n• ثبت و پیگیری خسارت\n• مشاهده بیمه‌نامه‌ها\n• تمدید و مقایسه قیمت‌ها\n• پرداخت‌ها و اقساط\n• ثبت شکایت\n\nلطفاً سوال خود را در یکی از این زمینه‌ها بپرسید یا برای مسائل پیچیده‌تر با کارشناس انسان ارتباط برقرار کنید.',
  }
}

async function callChatAPI(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ answer: string; sources?: { title: string; url?: string }[] }> {
  const response = await fetch('/api/portal/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory: history.slice(-10),
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data?.error?.message || 'API error')
  }

  const apiSources = (data.data.sources || []).map((s: any) => ({
    title: s.source,
    url: s.url,
  }))

  return {
    answer: data.data.answer,
    sources: apiSources.length > 0 ? apiSources : undefined,
  }
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'سلام! من دستیار هوشمند بیمه پلاس هستم. \n\nمی‌توانم در زمینه‌های زیر به شما کمک کنم:\n• ثبت و پیگیری خسارت\n• مشاهده بیمه‌نامه‌ها\n• تمدید و مقایسه قیمت‌ها\n• پرداخت‌ها\n• ثبت شکایت\n\nسوال خود را بپرسید یا از پیشنهادهای زیر استفاده کنید.',
      timestamp: Date.now(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [usingMock, setUsingMock] = useState(false)
  const hasUserSent = useRef(false)
  const messagesRef = useRef<ChatMessage[]>([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    hasUserSent.current = true
    setIsTyping(true)

    // Build conversation history for API
    const history = messagesRef.current
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

    try {
      const response = await callChatAPI(text, history)
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now(),
        sources: response.sources,
      }
      setMessages((prev) => [...prev, botMsg])
      setUsingMock(false)
    } catch {
      // Fallback to mock response if API is unavailable
      const mockResponse = findMockResponse(text)
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        role: 'assistant',
        content: mockResponse.content,
        timestamp: Date.now(),
        sources: mockResponse.sources,
      }
      setMessages((prev) => [...prev, botMsg])
      setUsingMock(true)
    } finally {
      setIsTyping(false)
    }
  }, [])

  const handleEscalate = useCallback(() => {
    const escalateMsg: ChatMessage = {
      id: `e-${Date.now()}`,
      role: 'assistant',
      content: 'درخواست شما برای ارتباط با کارشناس انسان ثبت شد. \n\nکارشناسان ما در ساعات اداری (۸ تا ۲۰) در دسترس هستند و به‌زودی با شما تماس خواهند گرفت. \n\nدر صورت فوریت، با شماره ۰۲۱-۸۸۷۷۶۶۵۵ تماس بگیرید.',
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, escalateMsg])
  }, [])

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {usingMock && (
        <div className="mx-auto mb-2 max-w-2xl rounded-lg border border-feedback-warning/30 bg-feedback-warning-subtle px-4 py-2 text-center text-xs text-feedback-warning">
          سرویس هوش مصنوعی در حال حاضر در دسترس نیست. پاسخ‌ها از حالت پیش‌فرض ارائه می‌شود.
        </div>
      )}
      <CopilotChat
        messages={messages}
        onSend={handleSend}
        onEscalate={handleEscalate}
        isLoading={isTyping}
        piiWarning
        suggestions={hasUserSent.current ? undefined : SUGGESTIONS}
        modelVersion="بیمه پلاس v۲.۰"
        className="flex-1"
      />
    </div>
  )
}
