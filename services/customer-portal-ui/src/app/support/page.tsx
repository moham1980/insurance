'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Headphones, MessageSquare, Ticket, FileQuestion, ChevronRight, Search, Plus, Clock, CheckCircle, AlertCircle, Phone, Mail } from 'lucide-react'
import { Card } from '@insurance/design-system'

const MOCK_TICKETS = [
  {
    id: 'TKT-1403-001',
    subject: 'مشکل در پرداخت قسط دوم',
    category: 'پرداخت',
    status: 'open',
    priority: 'high',
    createdAt: '۱۴۰۳/۰۶/۱۵',
    lastUpdate: '۱۴۰۳/۰۶/۱۶',
    description: 'هنگام پرداخت قسط بیمه خودرو، خطای درگاه بانکی دریافت کردم.',
  },
  {
    id: 'TKT-1403-002',
    subject: 'درخواست تغییر شماره تماس',
    category: 'پروفایل',
    status: 'resolved',
    priority: 'medium',
    createdAt: '۱۴۰۳/۰۶/۱۰',
    lastUpdate: '۱۴۰۳/۰۶/۱۲',
    description: 'شماره تماس من تغییر کرده و نیاز به به‌روزرسانی در پروفایل دارم.',
  },
  {
    id: 'TKT-1403-003',
    subject: 'استعلام وضعیت خسارت CLM-1403-92145',
    category: 'خسارت',
    status: 'in_progress',
    priority: 'medium',
    createdAt: '۱۴۰۳/۰۶/۱۸',
    lastUpdate: '۱۴۰۳/۰۶/۱۸',
    description: 'خسارت من در حال بررسی است و می‌خواهم بدانم چه مرحله‌ای دارد.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'چگونه بیمه‌نامه خود را تمدید کنم؟',
    a: 'برای تمدید بیمه‌نامه، به بخش «تمدید» مراجعه کنید. می‌توانید قیمت‌های مختلف شرکت‌های بیمه را مقایسه کرده و بهترین پیشنهاد را انتخاب کنید.',
  },
  {
    q: 'مدارک لازم برای ثبت خسارت چیست؟',
    a: 'برای ثبت خسارت به این مدارک نیاز دارید: تصویر بیمه‌نامه، تصویر کارت ملی، گواهی عدم خلافی (برای خودرو)، و تصاویر صحنه حادثه.',
  },
  {
    q: 'چمدان زمان طول می‌کشد تا خسارت من پرداخت شود؟',
    a: 'پس از ثبت خسارت و بازرسی، طی ۳ تا ۵ روز کاری نتیجه بررسی اعلام می‌شود و در صورت تأیید، پرداخت ظرف ۷۲ ساعت انجام می‌گیرد.',
  },
  {
    q: 'چگونه شکایت ثبت کنم؟',
    a: 'برای ثبت شکایت به بخش «ثبت شکایت» مراجعه کنید. شکایت شما طی ۷۲ ساعت بررسی و پاسخ داده می‌شود.',
  },
  {
    q: 'آیا می‌توانم بیمه‌نامه خود را اصلاح کنم؟',
    a: 'بله، از بخش «اصلاح بیمه‌نامه» می‌توانید درخواست الحاقیه ثبت کنید. تغییرات پس از تأیید شرکت بیمه اعمال می‌شود.',
  },
  {
    q: 'چگونه رضایت داده‌های خود را مدیریت کنم؟',
    a: 'از بخش «رضایت‌ها» می‌توانید رضایت‌های داده‌ای خود را مشاهده، فعال یا غیرفعال کنید.',
  },
]

const CATEGORIES = ['همه', 'پرداخت', 'خسارت', 'پروفایل', 'بیمه‌نامه', 'فنی']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'باز', color: 'bg-brand-primary/10 text-brand-primary', icon: AlertCircle },
  in_progress: { label: 'در حال بررسی', color: 'bg-feedback-warning-subtle text-feedback-warning', icon: Clock },
  resolved: { label: 'حل شده', color: 'bg-feedback-success-subtle text-feedback-success', icon: CheckCircle },
}

export default function SupportPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tickets' | 'chat' | 'faq'>('tickets')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('همه')
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null)

  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: '',
  })

  const filteredTickets = MOCK_TICKETS.filter(t => {
    const matchesSearch = !searchQuery || t.subject.includes(searchQuery) || t.id.includes(searchQuery)
    const matchesCategory = selectedCategory === 'همه' || t.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreateTicket = () => {
    if (!newTicket.subject || !newTicket.description) return
    setShowNewTicket(false)
    setNewTicket({ subject: '', category: '', priority: 'medium', description: '' })
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
          <Headphones className="h-6 w-6 text-brand-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-primary">پشتیبانی</h1>
          <p className="text-sm text-text-secondary">تیکت، چت زنده و سوالات متداول</p>
        </div>
      </div>

        {/* Quick Contact Cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="tel:02188776655" className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-raised p-4 transition-colors hover:border-brand-primary/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-feedback-success-subtle">
              <Phone className="h-5 w-5 text-feedback-success" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">تلفن پشتیبانی</p>
              <p className="text-sm font-bold text-text-primary" dir="ltr">۰۲۱-۸۸۷۷۶۶۵۵</p>
            </div>
          </a>
          <a href="mailto:support@bimehplus.ir" className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-raised p-4 transition-colors hover:border-brand-primary/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
              <Mail className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">ایمیل پشتیبانی</p>
              <p className="text-sm font-bold text-text-primary" dir="ltr">support@bimehplus.ir</p>
            </div>
          </a>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-bg-base p-1">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === 'tickets' ? 'bg-bg-raised text-text-primary shadow-1' : 'text-text-secondary'
            }`}
          >
            <Ticket className="h-4 w-4" />
            تیکت‌ها
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === 'chat' ? 'bg-bg-raised text-text-primary shadow-1' : 'text-text-secondary'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            چت زنده
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              activeTab === 'faq' ? 'bg-bg-raised text-text-primary shadow-1' : 'text-text-secondary'
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            سوالات متداول
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'tickets' && (
          <div>
            {/* Search + New Ticket */}
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی تیکت..."
                  className="w-full rounded-lg border border-border-default bg-bg-raised py-2.5 pr-10 pl-4 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowNewTicket(true)}
                className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-on-brand transition-colors hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                تیکت جدید
              </button>
            </div>

            {/* Category Filter */}
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-brand-primary text-text-on-brand'
                      : 'bg-bg-raised text-text-secondary hover:bg-brand-primary/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
              {filteredTickets.length === 0 && (
                <Card className="p-8 text-center">
                  <Ticket className="mx-auto mb-3 h-10 w-10 text-text-secondary/40" />
                  <p className="text-sm text-text-secondary">تیکتی یافت نشد</p>
                </Card>
              )}
              {filteredTickets.map(ticket => {
                const statusConf = STATUS_CONFIG[ticket.status]
                const StatusIcon = statusConf.icon
                return (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer p-4 transition-all hover:border-brand-primary/30 hover:shadow-1"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded-md bg-bg-base px-2 py-0.5 text-xs font-mono text-text-secondary" dir="ltr">{ticket.id}</span>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusConf.color}`}>
                            <StatusIcon className="ml-1 inline h-3 w-3" />
                            {statusConf.label}
                          </span>
                          {ticket.priority === 'high' && (
                            <span className="rounded-md bg-feedback-error-subtle px-2 py-0.5 text-xs font-medium text-feedback-error">فوری</span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-text-primary">{ticket.subject}</h3>
                        <p className="mt-1 text-xs text-text-secondary line-clamp-2">{ticket.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-text-secondary" />
                    </div>
                    <div className="flex items-center justify-between border-t border-border-default pt-2 text-xs text-text-secondary">
                      <span>دسته: {ticket.category}</span>
                      <span>آخرین به‌روزرسانی: {ticket.lastUpdate}</span>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* New Ticket Modal */}
            {showNewTicket && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg-overlay p-4 sm:items-center" onClick={() => setShowNewTicket(false)}>
                <div className="w-full max-w-lg rounded-2xl bg-bg-raised p-6 shadow-3" onClick={e => e.stopPropagation()}>
                  <h2 className="mb-4 text-lg font-bold text-text-primary">تیکت جدید</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">موضوع</label>
                      <input
                        type="text"
                        value={newTicket.subject}
                        onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
                        placeholder="موضوع تیکت خود را وارد کنید"
                        className="w-full rounded-lg border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-text-primary">دسته‌بندی</label>
                        <select
                          value={newTicket.category}
                          onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                          className="w-full rounded-lg border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none"
                        >
                          <option value="">انتخاب کنید</option>
                          <option value="پرداخت">پرداخت</option>
                          <option value="خسارت">خسارت</option>
                          <option value="پروفایل">پروفایل</option>
                          <option value="بیمه‌نامه">بیمه‌نامه</option>
                          <option value="فنی">فنی</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-text-primary">اولویت</label>
                        <select
                          value={newTicket.priority}
                          onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as 'low' | 'medium' | 'high' })}
                          className="w-full rounded-lg border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary focus:border-brand-primary focus:outline-none"
                        >
                          <option value="low">کم</option>
                          <option value="medium">متوسط</option>
                          <option value="high">فوری</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">شرح مشکل</label>
                      <textarea
                        value={newTicket.description}
                        onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                        placeholder="مشکل خود را به طور کامل توضیح دهید"
                        rows={4}
                        className="w-full rounded-lg border border-border-default bg-bg-base px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowNewTicket(false)}
                        className="flex-1 rounded-lg border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-base"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={handleCreateTicket}
                        disabled={!newTicket.subject || !newTicket.description}
                        className="flex-1 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-text-on-brand transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        ثبت تیکت
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <Card className="p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary">
                <MessageSquare className="h-8 w-8 text-text-on-brand" />
              </div>
              <h2 className="mb-2 text-lg font-bold text-text-primary">چت زنده با پشتیبانی</h2>
              <p className="mb-4 text-sm text-text-secondary">
                با کارشناسان ما به صورت آنلاین گفتگو کنید. در ساعات اداری (۸ تا ۲۰) پاسخگوی شما هستیم.
              </p>
              <button
                onClick={() => router.push('/chatbot')}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-medium text-text-on-brand transition-colors hover:opacity-90"
              >
                <MessageSquare className="h-4 w-4" />
                شروع چت با هوش مصنوعی
              </button>
              <p className="mt-3 text-xs text-text-secondary">
                هوش مصنوعی ابتدا پاسخ‌گو است. در صورت نیاز به کارشناس انسان، به‌طور خودکار ارجاع داده می‌شود.
              </p>
            </div>

            <div className="border-t border-border-default pt-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
                <Clock className="h-4 w-4 text-text-secondary" />
                ساعات کاری
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded-lg bg-bg-base px-3 py-2">
                  <span className="text-text-secondary">شنبه تا چهارشنبه</span>
                  <span className="font-medium text-text-primary" dir="ltr">۸:۰۰ - ۲۰:۰۰</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-base px-3 py-2">
                  <span className="text-text-secondary">پنجشنبه</span>
                  <span className="font-medium text-text-primary" dir="ltr">۸:۰۰ - ۱۴:۰۰</span>
                </div>
                <div className="flex justify-between rounded-lg bg-bg-base px-3 py-2">
                  <span className="text-text-secondary">تعطیلات</span>
                  <span className="font-medium text-feedback-error">تعطیل</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, idx) => (
              <Card
                key={idx}
                className="overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}
                  className="flex w-full items-center justify-between gap-2 p-4 text-right transition-colors hover:bg-bg-base"
                >
                  <span className="text-sm font-medium text-text-primary">{item.q}</span>
                  <ChevronRight
                    className={`h-5 w-5 shrink-0 text-text-secondary transition-transform ${
                      faqOpenIndex === idx ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {faqOpenIndex === idx && (
                  <div className="border-t border-border-default p-4 text-sm leading-relaxed text-text-secondary">
                    {item.a}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}
