'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Loader2, AlertCircle, Send, ChevronLeft, User, Clock } from 'lucide-react'
import { Card } from '@insurance/design-system'
import { claimsApi } from '@/lib/api'
import { MOCK_CLAIMS } from '@/lib/mock-data'

const MOCK_COMMS: Communication[] = [
  { id: 'ac1', message: 'کارشناس گرامی، زمان بازدید از محل حادثه را هماهنگ کنید.', sender: 'کارشناس رسمی', createdAt: '1403/07/01 10:00' },
  { id: 'ac2', message: 'بله، روز شنبه ساعت ۱۰ صبح در محل حاضر می‌شوم.', sender: 'علی محمدی', createdAt: '1403/07/01 11:30' },
  { id: 'ac3', message: 'تصاویر صحنه حادثه را بارگذاری کردم. لطفاً بررسی کنید.', sender: 'علی محمدی', createdAt: '1403/07/02 09:00' },
]

interface Communication {
  id: string
  message: string
  sender?: string
  createdAt: string
  attachments?: string[]
}

export default function AdjusterCommunicationPage() {
  const [claims, setClaims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadClaims()
  }, [])

  const loadClaims = async () => {
    try {
      setLoading(true)
      const response = await claimsApi.list()
      setClaims(response.data || MOCK_CLAIMS)
    } catch {
      setClaims(MOCK_CLAIMS)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectClaim = async (claimId: string) => {
    setSelectedClaimId(claimId)
    try {
      const response = await claimsApi.getAdjusterCommunications(claimId)
      setCommunications(response.data || [])
    } catch {
      setCommunications(MOCK_COMMS)
    }
  }

  const handleSend = async () => {
    if (!selectedClaimId || !newMessage.trim()) return
    setActionLoading(true)
    try {
      await claimsApi.sendAdjusterMessage(selectedClaimId, { message: newMessage })
      setNewMessage('')
      const response = await claimsApi.getAdjusterCommunications(selectedClaimId)
      setCommunications(response.data || [])
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال پیام')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (!selectedClaimId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-text-primary">ارتباط با کارشناس</h1>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-feedback-error/30 bg-feedback-error-subtle p-3 text-feedback-error text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {claims.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">خسارتی برای ارتباط یافت نشد</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                onClick={() => handleSelectClaim(claim.id)}
                className="cursor-pointer rounded-xl border border-border-default bg-bg-raised p-4 hover:border-brand-primary"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand-primary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{claim.claimNumber || claim.id}</p>
                    <p className="text-xs text-text-muted">{claim.claimType || ''} | {claim.status || ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setSelectedClaimId(null)}
        className="flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4 ml-1" />
        بازگشت
      </button>

      <h1 className="text-lg font-bold text-text-primary">ارتباط با کارشناس</h1>

      <Card className="p-4">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {communications.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">پیامی وجود ندارد. اولین پیام را ارسال کنید.</p>
          ) : (
            communications.map((comm) => (
              <div key={comm.id} className={`flex ${comm.sender === 'CUSTOMER' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  comm.sender === 'CUSTOMER' ? 'bg-brand-primary/10 text-text-primary' : 'bg-bg-overlay text-text-secondary'
                }`}>
                  <p className="text-sm">{comm.message}</p>
                  {comm.attachments && comm.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comm.attachments.map((att, idx) => (
                        <a key={idx} href={att} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-primary underline">
                          پیوست {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-text-muted mt-1">{comm.createdAt}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="پیام به کارشناس..."
            className="flex-1 border border-border-default rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleSend}
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
