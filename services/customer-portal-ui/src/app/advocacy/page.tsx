'use client'

import { useState, useEffect } from 'react'
import { Shield, Loader2, AlertCircle, MessageSquare, Send, ChevronLeft, Plus } from 'lucide-react'
import { Card } from '@insurance/design-system'
import { claimsApi } from '@/lib/api'

const MOCK_ADVOCACY_CASES: AdvocacyCase[] = [
  {
    id: 'adv-001',
    claimId: 'clm-001',
    claimNumber: 'CLM-1403-92145',
    status: 'active',
    priority: 'high',
    description: 'وکالت برای پیگیری خسارت تصادف - تقاطع ولیعصر',
    createdAt: '1403/06/15',
  },
  {
    id: 'adv-002',
    claimId: 'clm-003',
    claimNumber: 'CLM-1403-75123',
    status: 'resolved',
    priority: 'medium',
    description: 'وکالت برای مذاکره با بیمارستان جهت کاهش هزینه‌ها',
    createdAt: '1403/05/10',
  },
]

const MOCK_COMMUNICATIONS: Communication[] = [
  { id: 'c1', message: 'درخواست بررسی مجدد خسارت مطرح شد.', type: 'CUSTOMER', createdAt: '1403/06/15', sender: 'علی محمدی' },
  { id: 'c2', message: 'درخواست شما به کارشناس ارجاع شد. ظرف ۴۸ ساعت نتیجه اعلام می‌گردد.', type: 'AGENT', createdAt: '1403/06/16', sender: 'وکیل خسارت' },
]

interface AdvocacyCase {
  id: string
  claimId: string
  claimNumber?: string
  status: string
  priority?: string
  description?: string
  createdAt?: string
}

interface Communication {
  id: string
  message: string
  type?: string
  createdAt: string
  sender?: string
}

export default function AdvocacyPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [advocacyCases, setAdvocacyCases] = useState<AdvocacyCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCase, setSelectedCase] = useState<AdvocacyCase | null>(null)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [commLoading, setCommLoading] = useState(false)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [openForm, setOpenForm] = useState({ claimId: '', description: '', priority: 'medium' })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const claimsResponse = await claimsApi.list()
      const claimsData = claimsResponse.data || []
      setClaims(claimsData)
      const allCases: AdvocacyCase[] = []
      for (const claim of claimsData) {
        try {
          const advocacyResponse = await claimsApi.getAdvocacyCases(claim.id)
          const cases = advocacyResponse.data || []
          cases.forEach((c: AdvocacyCase) => {
            allCases.push({ ...c, claimNumber: claim.claimNumber || claim.id })
          })
        } catch {
          // skip claims without advocacy
        }
      }
      setAdvocacyCases(allCases)
    } catch {
      setAdvocacyCases(MOCK_ADVOCACY_CASES)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCase = async (caseItem: AdvocacyCase) => {
    setSelectedCase(caseItem)
    setCommLoading(true)
    try {
      const response = await claimsApi.getAdvocacyCommunications(caseItem.claimId, caseItem.id)
      setCommunications(response.data || [])
    } catch {
      setCommunications(MOCK_COMMUNICATIONS)
    } finally {
      setCommLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedCase || !newMessage.trim()) return
    setActionLoading(true)
    try {
      await claimsApi.addAdvocacyCommunication(selectedCase.claimId, selectedCase.id, {
        message: newMessage,
        type: 'CUSTOMER',
      })
      setNewMessage('')
      const response = await claimsApi.getAdvocacyCommunications(selectedCase.claimId, selectedCase.id)
      setCommunications(response.data || [])
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال پیام')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenCase = async () => {
    if (!openForm.claimId || !openForm.description) return
    setActionLoading(true)
    try {
      await claimsApi.openAdvocacyCase(openForm.claimId, {
        description: openForm.description,
        priority: openForm.priority,
      })
      setShowOpenModal(false)
      setOpenForm({ claimId: '', description: '', priority: 'medium' })
      loadData()
    } catch (err: any) {
      setError(err.message || 'خطا در باز کردن پرونده')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="mr-2 text-sm text-text-secondary">در حال بارگذاری...</span>
      </div>
    )
  }

  if (selectedCase) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedCase(null)}
          className="flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4 ml-1" />
          بازگشت
        </button>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-brand-primary" />
            <h2 className="text-base font-bold text-text-primary">پرونده وکالت</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-muted">شماره:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedCase.id}</span>
            </div>
            <div>
              <span className="text-text-muted">خسارت:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedCase.claimNumber}</span>
            </div>
            <div>
              <span className="text-text-muted">وضعیت:</span>
              <span className={`mr-2 px-2 py-0.5 text-xs rounded-full ${
                selectedCase.status === 'OPEN' ? 'bg-feedback-success-subtle text-feedback-success' :
                selectedCase.status === 'CLOSED' ? 'bg-bg-overlay text-text-primary' :
                'bg-feedback-warning-subtle text-feedback-warning'
              }`}>
                {selectedCase.status === 'OPEN' ? 'باز' : selectedCase.status === 'CLOSED' ? 'بسته شده' : selectedCase.status}
              </span>
            </div>
            <div>
              <span className="text-text-muted">اولویت:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedCase.priority || '-'}</span>
            </div>
          </div>
          {selectedCase.description && (
            <p className="mt-3 text-sm text-text-secondary">{selectedCase.description}</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">پیام‌ها</h3>
          {commLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
            </div>
          ) : communications.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">پیامی وجود ندارد</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {communications.map((comm) => (
                <div key={comm.id} className={`flex ${comm.sender === 'CUSTOMER' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    comm.sender === 'CUSTOMER' ? 'bg-brand-primary/10 text-text-primary' : 'bg-bg-overlay text-text-secondary'
                  }`}>
                    <p className="text-sm">{comm.message}</p>
                    <p className="text-xs text-text-muted mt-1">{comm.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={actionLoading || !newMessage.trim()}
              className="flex items-center justify-center h-10 w-10 bg-brand-primary text-text-on-brand rounded-lg disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-text-primary">وکالت بیمه‌ای</h1>
        <button
          onClick={() => setShowOpenModal(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-brand-primary text-text-on-brand rounded-lg"
        >
          <Plus className="h-4 w-4 ml-1" />
          پرونده جدید
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-feedback-error/30 bg-feedback-error-subtle p-3 text-feedback-error text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {advocacyCases.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="mx-auto mb-2 h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">پرونده وکالتی ندارید</p>
          <p className="mt-1 text-xs text-text-muted">برای خسارت‌های خود می‌توانید درخواست وکالت ثبت کنید</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {advocacyCases.map((c) => (
            <Card
              key={c.id}
              onClick={() => handleSelectCase(c)}
              className="cursor-pointer p-4 hover:border-brand-primary"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand-primary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.id}</p>
                    <p className="text-xs text-text-muted">خسارت: {c.claimNumber}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  c.status === 'OPEN' ? 'bg-feedback-success-subtle text-feedback-success' :
                  c.status === 'CLOSED' ? 'bg-bg-overlay text-text-primary' :
                  'bg-feedback-warning-subtle text-feedback-warning'
                }`}>
                  {c.status === 'OPEN' ? 'باز' : c.status === 'CLOSED' ? 'بسته شده' : c.status}
                </span>
              </div>
              {c.description && (
                <p className="mt-2 text-xs text-text-secondary line-clamp-2">{c.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {showOpenModal && (
        <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-bg-raised rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-text-primary">باز کردن پرونده وکالت</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted">خسارت</label>
                <select
                  value={openForm.claimId}
                  onChange={(e) => setOpenForm({ ...openForm, claimId: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm"
                >
                  <option value="">انتخاب...</option>
                  {claims.map((c) => (
                    <option key={c.id} value={c.id}>{c.claimNumber || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted">شرح درخواست</label>
                <textarea
                  value={openForm.description}
                  onChange={(e) => setOpenForm({ ...openForm, description: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">اولویت</label>
                <select
                  value={openForm.priority}
                  onChange={(e) => setOpenForm({ ...openForm, priority: e.target.value })}
                  className="w-full border border-border-default rounded-lg p-2 text-sm"
                >
                  <option value="low">کم</option>
                  <option value="medium">متوسط</option>
                  <option value="high">زیاد</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowOpenModal(false)} className="px-3 py-1.5 text-sm text-text-secondary rounded-lg">انصراف</button>
              <button
                onClick={handleOpenCase}
                disabled={actionLoading || !openForm.claimId || !openForm.description}
                className="px-3 py-1.5 text-sm bg-brand-primary text-text-on-brand rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'در حال...' : 'ثبت'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
