'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, AlertCircle, ChevronLeft, Clock, CheckCircle, XCircle } from 'lucide-react'
import { policiesApi } from '@/lib/api'
import { Card } from '@insurance/design-system'
import { MOCK_POLICIES } from '@/lib/mock-data'

const MOCK_ENDORSEMENTS: Endorsement[] = [
  { id: 'end-001', endorsementType: 'تغییر آدرس', status: 'approved', effectiveDate: '1403/06/01', reason: 'تغییر محل سکونت', createdAt: '1403/05/20', updatedAt: '1403/05/25', history: [{ status: 'submitted', timestamp: '1403/05/20', note: 'درخواست ثبت شد' }, { status: 'approved', timestamp: '1403/05/25', note: 'تأیید شد' }] },
  { id: 'end-002', endorsementType: 'افزایش پوشش', status: 'pending', effectiveDate: '1403/07/01', reason: 'افزودن پوشش حوادث انگلی', createdAt: '1403/06/28', updatedAt: '1403/06/28', history: [{ status: 'submitted', timestamp: '1403/06/28', note: 'در انتظار بررسی' }] },
]

interface Endorsement {
  id: string
  endorsementType: string
  status: string
  effectiveDate?: string
  reason?: string
  createdAt?: string
  updatedAt?: string
  history?: Array<{ status: string; timestamp: string; note?: string }>
}

export default function EndorsementTrackingPage() {
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<any>(null)

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const response = await policiesApi.list()
      setPolicies(response.data || MOCK_POLICIES)
    } catch {
      setPolicies(MOCK_POLICIES)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPolicy = async (policyId: string) => {
    setSelectedPolicyId(policyId)
    try {
      const response = await policiesApi.listEndorsements(policyId)
      setEndorsements(response.data || [])
    } catch {
      setEndorsements(MOCK_ENDORSEMENTS)
    }
  }

  const handleTrackEndorsement = async (endorsementId: string) => {
    if (!selectedPolicyId) return
    const endorsement = endorsements.find(e => e.id === endorsementId)
    setSelectedEndorsement(endorsement || null)
    try {
      const response = await policiesApi.trackEndorsement(selectedPolicyId, endorsementId)
      setTrackingInfo(response.data)
    } catch {
      setTrackingInfo(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (selectedEndorsement) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedEndorsement(null); setTrackingInfo(null); }}
          className="flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4 ml-1" />
          بازگشت
        </button>

        <Card className="p-4">
          <h2 className="text-base font-bold text-text-primary mb-3">جزئیات الحاقیه</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-muted">نوع:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedEndorsement.endorsementType}</span>
            </div>
            <div>
              <span className="text-text-muted">وضعیت:</span>
              <span className={`mr-2 px-2 py-0.5 text-xs rounded-full ${
                selectedEndorsement.status === 'APPROVED' ? 'bg-feedback-success-subtle text-feedback-success' :
                selectedEndorsement.status === 'REJECTED' ? 'bg-feedback-error-subtle text-feedback-error' :
                selectedEndorsement.status === 'PENDING' ? 'bg-feedback-warning-subtle text-feedback-warning' :
                'bg-brand-primary/10 text-brand-primary'
              }`}>
                {selectedEndorsement.status === 'APPROVED' ? 'تأیید شده' :
                 selectedEndorsement.status === 'REJECTED' ? 'رد شده' :
                 selectedEndorsement.status === 'PENDING' ? 'در انتظار' :
                 selectedEndorsement.status === 'UNDER_REVIEW' ? 'در حال بررسی' : selectedEndorsement.status}
              </span>
            </div>
            {selectedEndorsement.effectiveDate && (
              <div>
                <span className="text-text-muted">تاریخ اعتبار:</span>
                <span className="mr-2 font-medium text-text-primary">{selectedEndorsement.effectiveDate}</span>
              </div>
            )}
            {selectedEndorsement.reason && (
              <div>
                <span className="text-text-muted">دلیل:</span>
                <span className="mr-2 font-medium text-text-primary">{selectedEndorsement.reason}</span>
              </div>
            )}
          </div>
        </Card>

        {trackingInfo?.history || selectedEndorsement.history ? (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">تاریخچه وضعیت</h3>
            <div className="space-y-3">
              {(trackingInfo?.history || selectedEndorsement.history || []).map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  {step.status === 'APPROVED' ? <CheckCircle className="h-5 w-5 text-feedback-success mt-0.5" /> :
                   step.status === 'REJECTED' ? <XCircle className="h-5 w-5 text-feedback-error mt-0.5" /> :
                   <Clock className="h-5 w-5 text-feedback-warning mt-0.5" />}
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {step.status === 'APPROVED' ? 'تأیید شده' :
                       step.status === 'REJECTED' ? 'رد شده' :
                       step.status === 'PENDING' ? 'در انتظار' :
                       step.status === 'UNDER_REVIEW' ? 'در حال بررسی' : step.status}
                    </p>
                    <p className="text-xs text-text-muted">{step.timestamp}</p>
                    {step.note && <p className="text-xs text-text-secondary mt-1">{step.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    )
  }

  if (!selectedPolicyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-text-primary">پیگیری الحاقیه</h1>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-feedback-error/30 bg-feedback-error-subtle p-3 text-feedback-error text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {policies.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto mb-2 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">بیمه‌نامه‌ای یافت نشد</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {policies.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPolicy(p.id)}
                className="cursor-pointer rounded-xl border border-border-default bg-bg-raised p-4 hover:border-brand-primary"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.policyNumber || p.id}</p>
                    <p className="text-xs text-text-muted">{p.product || ''} | {p.status || ''}</p>
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
        onClick={() => setSelectedPolicyId(null)}
        className="flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4 ml-1" />
        بازگشت
      </button>

      <h1 className="text-lg font-bold text-text-primary">الحاقیه‌های بیمه‌نامه</h1>

      {endorsements.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="mx-auto mb-2 h-10 w-10 text-text-muted" />
          <p className="text-sm text-text-muted">الحاقیه‌ای برای این بیمه‌نامه ثبت نشده</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {endorsements.map((e) => (
            <div
              key={e.id}
              onClick={() => handleTrackEndorsement(e.id)}
              className="cursor-pointer rounded-xl border border-border-default bg-bg-raised p-4 hover:border-brand-primary"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{e.endorsementType}</p>
                    <p className="text-xs text-text-muted">{e.createdAt || ''}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  e.status === 'APPROVED' ? 'bg-feedback-success-subtle text-feedback-success' :
                  e.status === 'REJECTED' ? 'bg-feedback-error-subtle text-feedback-error' :
                  e.status === 'PENDING' ? 'bg-feedback-warning-subtle text-feedback-warning' :
                  'bg-brand-primary/10 text-brand-primary'
                }`}>
                  {e.status === 'APPROVED' ? 'تأیید شده' :
                   e.status === 'REJECTED' ? 'رد شده' :
                   e.status === 'PENDING' ? 'در انتظار' :
                   e.status === 'UNDER_REVIEW' ? 'در حال بررسی' : e.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
