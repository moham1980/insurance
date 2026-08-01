'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Clock, CheckCircle, AlertCircle, Loader2,
  ChevronLeft, Plus, FileText, User, Calendar, Building2
} from 'lucide-react'
import { complaintsApi } from '@/lib/api'
import { StatCard, Card } from '@insurance/design-system'

interface Complaint {
  id: string
  complaintNumber: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  description: string
  assignedTo?: string
  policyNumber?: string
  claimNumber?: string
  timeline: Array<{
    status: string
    label: string
    date: string
    note?: string
    completed: boolean
  }>
  responses: Array<{
    id: string
    from: 'customer' | 'agent'
    author: string
    content: string
    timestamp: string
  }>
}

const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 'cmp-001',
    complaintNumber: 'CMP-1403-1122',
    subject: 'تأخیر در پاسخگویی به درخواست خسارت',
    category: 'خدمات کارشناسی',
    status: 'in_progress',
    priority: 'high',
    createdAt: '1403/06/15',
    updatedAt: '1403/06/20',
    description: 'بیش از ۱۰ روز از ثبت خسارت من می‌گذرد و هنوز کارشناسی انجام نشده است. لطفاً پیگیری فرمایید.',
    assignedTo: 'واحد پیگیری شکایات',
    policyNumber: 'INS-1403-7845129',
    claimNumber: 'CLM-1403-92145',
    timeline: [
      { status: 'submitted', label: 'ثبت شکایت', date: '1403/06/15', note: 'شکایت از طریق پرتال ثبت شد', completed: true },
      { status: 'assigned', label: 'انتساب به واحد مربوطه', date: '1403/06/16', note: 'به واحد پیگیری شکایات ارجاع شد', completed: true },
      { status: 'in_progress', label: 'در حال بررسی', date: '1403/06/20', note: 'با واحد خسارت هماهنگی شد', completed: false },
      { status: 'resolved', label: 'پاسخ و حل مشکل', date: '-', completed: false },
    ],
    responses: [
      {
        id: 'resp-1',
        from: 'customer',
        author: 'علی محمدی',
        content: 'بیش از ۱۰ روز از ثبت خسارت من می‌گذرد و هنوز کارشناسی انجام نشده است.',
        timestamp: '1403/06/15 10:30',
      },
      {
        id: 'resp-2',
        from: 'agent',
        author: 'واحد پیگیری شکایات',
        content: 'با سلام و عذرخواهی بابت تأخیر پیش‌آمده. درخواست شما با واحد خسارت هماهنگ شد و کارشناس ظرف ۴۸ ساعت با شما تماس خواهد گرفت.',
        timestamp: '1403/06/20 14:00',
      },
    ],
  },
  {
    id: 'cmp-002',
    complaintNumber: 'CMP-1403-0987',
    subject: 'مبلغ حق بیمه با صورتحساب مطابقت ندارد',
    category: 'صورتحساب و پرداخت',
    status: 'resolved',
    priority: 'medium',
    createdAt: '1403/05/10',
    updatedAt: '1403/05/18',
    description: 'مبلغ کسر شده از حسابم با صورتحساب بیمه‌نامه مطابقت ندارد. اختلاف ۵۰،۰۰۰ تومان وجود دارد.',
    assignedTo: 'واحد مالی',
    policyNumber: 'INS-1403-8821456',
    timeline: [
      { status: 'submitted', label: 'ثبت شکایت', date: '1403/05/10', completed: true },
      { status: 'assigned', label: 'انتساب به واحد مالی', date: '1403/05/11', completed: true },
      { status: 'in_progress', label: 'بررسی مغایرت', date: '1403/05/14', completed: true },
      { status: 'resolved', label: 'حل مشکل', date: '1403/05/18', note: 'مبلغ مغایرت به حساب شما بازگردانده شد', completed: true },
    ],
    responses: [
      {
        id: 'resp-3',
        from: 'customer',
        author: 'علی محمدی',
        content: 'مبلغ کسر شده با صورتحساب مطابقت ندارد.',
        timestamp: '1403/05/10 09:00',
      },
      {
        id: 'resp-4',
        from: 'agent',
        author: 'واحد مالی',
        content: 'با بررسی صورت گرفت، مغایرت به دلیل خطای سیستمی بود. مبلغ ۵۰،۰۰۰ تومان به حساب شما بازگردانده شد. عذرخواهی می‌کنیم.',
        timestamp: '1403/05/18 11:30',
      },
    ],
  },
  {
    id: 'cmp-003',
    complaintNumber: 'CMP-1403-0765',
    subject: 'درخواست اصلاح اطلاعات بیمه‌نامه',
    category: 'اصلاح بیمه‌نامه',
    status: 'submitted',
    priority: 'low',
    createdAt: '1403/07/25',
    updatedAt: '1403/07/25',
    description: 'نام بیمه‌گذار در بیمه‌نامه به اشتباه ثبت شده است. درخواست اصلاح دارم.',
    policyNumber: 'INS-1403-9933887',
    timeline: [
      { status: 'submitted', label: 'ثبت شکایت', date: '1403/07/25', completed: true },
      { status: 'assigned', label: 'انتساب به واحد مربوطه', date: '-', completed: false },
      { status: 'in_progress', label: 'در حال بررسی', date: '-', completed: false },
      { status: 'resolved', label: 'پاسخ و حل مشکل', date: '-', completed: false },
    ],
    responses: [],
  },
]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: 'ثبت شده', color: 'text-feedback-info', bg: 'bg-feedback-info-subtle' },
  assigned: { label: 'ارجاع داده شده', color: 'text-feedback-info', bg: 'bg-feedback-info-subtle' },
  in_progress: { label: 'در حال بررسی', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle' },
  resolved: { label: 'حل شده', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle' },
  rejected: { label: 'رد شده', color: 'text-feedback-error', bg: 'bg-feedback-error-subtle' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: 'فوری', color: 'text-feedback-error' },
  medium: { label: 'متوسط', color: 'text-feedback-warning' },
  low: { label: 'عادی', color: 'text-text-muted' },
}

export default function ComplaintListPage() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadComplaints()
  }, [])

  const loadComplaints = async () => {
    try {
      setLoading(true)
      const response = await complaintsApi.list()
      if (response?.data && response.data.length > 0) {
        setComplaints(response.data)
      } else {
        setComplaints(MOCK_COMPLAINTS)
      }
    } catch {
      setComplaints(MOCK_COMPLAINTS)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filterStatus === 'all'
    ? complaints
    : complaints.filter((c) => c.status === filterStatus)

  const stats = {
    total: complaints.length,
    inProgress: complaints.filter((c) => c.status === 'in_progress' || c.status === 'submitted' || c.status === 'assigned').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="mr-2 text-sm text-text-secondary">در حال بارگذاری...</span>
      </div>
    )
  }

  if (selectedComplaint) {
    const status = statusConfig[selectedComplaint.status] || statusConfig.submitted
    const priority = priorityConfig[selectedComplaint.priority] || priorityConfig.low

    return (
      <div className="space-y-4 animate-fade-in">
        <button
          onClick={() => setSelectedComplaint(null)}
          className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4 ml-1" />
          بازگشت به لیست
        </button>

        {/* Complaint Header */}
        <Card className="p-5 shadow-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-text-primary">{selectedComplaint.subject}</h1>
                <p className="text-xs text-text-muted mt-0.5">{selectedComplaint.complaintNumber}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                {status.label}
              </span>
              <span className={`text-xs ${priority.color}`}>{priority.label}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-bg-subtle p-3">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <FileText className="h-3.5 w-3.5" />
                دسته
              </div>
              <p className="mt-1 text-sm font-medium text-text-primary">{selectedComplaint.category}</p>
            </div>
            <div className="rounded-lg bg-bg-subtle p-3">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Calendar className="h-3.5 w-3.5" />
                تاریخ ثبت
              </div>
              <p className="mt-1 text-sm font-medium text-text-primary">{selectedComplaint.createdAt}</p>
            </div>
          </div>

          {selectedComplaint.assignedTo && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-bg-subtle p-3">
              <User className="h-4 w-4 text-text-muted" />
              <span className="text-xs text-text-muted">مسئول پیگیری:</span>
              <span className="text-sm font-medium text-text-primary">{selectedComplaint.assignedTo}</span>
            </div>
          )}

          <div className="mt-3 rounded-lg bg-bg-subtle p-3">
            <p className="text-xs text-text-muted mb-1">شرح شکایت</p>
            <p className="text-sm text-text-secondary leading-6">{selectedComplaint.description}</p>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">مراحل پیگیری</h2>
          <div className="space-y-3">
            {selectedComplaint.timeline?.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    event.completed
                      ? 'bg-feedback-success-subtle text-feedback-success'
                      : idx === selectedComplaint.timeline.findIndex(e => !e.completed)
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'bg-bg-subtle text-text-muted'
                  }`}>
                    {event.completed ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  {idx < selectedComplaint.timeline.length - 1 && (
                    <div className={`w-0.5 ${event.completed ? 'bg-feedback-success' : 'bg-border-default'}`} style={{ minHeight: '20px' }} />
                  )}
                </div>
                <div className={`flex-1 rounded-xl border p-3 ${
                  event.completed
                    ? 'border-border-default bg-bg-raised'
                    : idx === selectedComplaint.timeline.findIndex(e => !e.completed)
                    ? 'border-brand-primary/30 bg-brand-primary/5'
                    : 'border-border-default bg-bg-subtle opacity-60'
                }`}>
                  <p className="text-sm font-medium text-text-primary">{event.label}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{event.date}</p>
                  {event.note && <p className="mt-1 text-xs text-text-secondary">{event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Responses */}
        {selectedComplaint.responses && selectedComplaint.responses.length > 0 && (
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">پیام‌ها</h2>
            <div className="space-y-3">
              {selectedComplaint.responses.map((resp) => (
                <div
                  key={resp.id}
                  className={`flex gap-3 ${resp.from === 'customer' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    resp.from === 'customer'
                      ? 'bg-brand-primary text-text-on-brand'
                      : 'bg-bg-subtle text-text-secondary'
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-3 ${
                    resp.from === 'customer'
                      ? 'bg-brand-primary text-text-on-brand rounded-tr-none'
                      : 'bg-bg-subtle text-text-primary border border-border-default rounded-tl-none'
                  }`}>
                    <p className="text-xs opacity-70 mb-1">{resp.author}</p>
                    <p className="text-sm leading-relaxed">{resp.content}</p>
                    <p className="text-xs opacity-60 mt-1">{resp.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-text-primary">شکایات من</h1>
        <button
          onClick={() => router.push('/complaints')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2 text-xs font-medium text-text-on-brand transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          شکایت جدید
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StatCard
          title="کل شکایات"
          value={stats.total}
          icon={MessageSquare}
          className="!p-3"
        />
        <StatCard
          title="در حال بررسی"
          value={stats.inProgress}
          changeType="warning"
          icon={Clock}
          className="!p-3"
        />
        <StatCard
          title="حل شده"
          value={stats.resolved}
          changeType="positive"
          icon={CheckCircle}
          className="!p-3"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-border-default">
        {[
          { id: 'all', label: 'همه' },
          { id: 'submitted', label: 'ثبت شده' },
          { id: 'in_progress', label: 'در حال بررسی' },
          { id: 'resolved', label: 'حل شده' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              filterStatus === tab.id
                ? 'text-brand-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaint List */}
      <div className="space-y-3">
        {filtered.map((complaint) => {
          const status = statusConfig[complaint.status] || statusConfig.submitted
          const priority = priorityConfig[complaint.priority] || priorityConfig.low
          return (
            <button
              key={complaint.id}
              onClick={() => setSelectedComplaint(complaint)}
              className="w-full rounded-xl border border-border-default bg-bg-raised p-4 text-right transition-all hover:border-border-focus hover:shadow-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{complaint.subject}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{complaint.complaintNumber}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {complaint.category}
                  </span>
                  <span className={`flex items-center gap-1 ${priority.color}`}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    {priority.label}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-text-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  {complaint.createdAt}
                </span>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">شکایتی در این دسته وجود ندارد</p>
          </Card>
        )}
      </div>
    </div>
  )
}
