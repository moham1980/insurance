'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Loader2, AlertCircle, ChevronLeft, Check, TrendingUp, TrendingDown } from 'lucide-react'
import { policiesApi } from '@/lib/api'

interface RenewalQuote {
  id: string
  insurer?: string
  premium: number
  coverage?: string
  deductible?: number
  discounts?: string[]
  validUntil?: string
  features?: string[]
}

export default function RenewalQuoteComparisonPage() {
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<RenewalQuote[]>([])
  const [comparison, setComparison] = useState<any>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const response = await policiesApi.list()
      setPolicies(response.data || [])
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری بیمه‌نامه‌ها')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPolicy = async (policyId: string) => {
    setSelectedPolicyId(policyId)
    try {
      const [quotesRes, compareRes] = await Promise.all([
        policiesApi.getRenewalQuotes(policyId),
        policiesApi.compareRenewalQuotes(policyId),
      ])
      setQuotes(quotesRes.data || [])
      setComparison(compareRes.data || null)
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری پوشش‌ها')
      setQuotes([])
      setComparison(null)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    if (!selectedPolicyId) return
    setAcceptingId(quoteId)
    try {
      await policiesApi.acceptRenewalQuote(selectedPolicyId, quoteId)
      alert('پوشش انتخاب شده بود. درخواست تمدید ثبت شد.')
      setSelectedPolicyId(null)
    } catch (err: any) {
      setError(err.message || 'خطا در تأیید پوشش')
    } finally {
      setAcceptingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  if (!selectedPolicyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-text-primary">مقایسه پوشش‌های تمدید</h1>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-border-error bg-bg-error p-3 text-text-error text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {policies.length === 0 ? (
          <div className="rounded-xl border border-border-default bg-bg-raised p-8 text-center">
            <RefreshCw className="mx-auto mb-2 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">بیمه‌نامه‌ای برای تمدید یافت نشد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPolicy(p.id)}
                className="cursor-pointer rounded-xl border border-border-default bg-bg-raised p-4 hover:border-brand-primary"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-brand-primary" />
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

  const currentPremium = comparison?.currentPremium || (policies.find(p => p.id === selectedPolicyId)?.premium as number) || 0

  return (
    <div className="space-y-4">
      <button
        onClick={() => setSelectedPolicyId(null)}
        className="flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4 ml-1" />
        بازگشت
      </button>

      <h1 className="text-lg font-bold text-text-primary">مقایسه پوشش‌های تمدید</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-border-error bg-bg-error p-3 text-text-error text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-raised p-8 text-center">
          <RefreshCw className="mx-auto mb-2 h-10 w-10 text-text-muted" />
          <p className="text-sm text-text-muted">پوششی برای مقایسه یافت نشد</p>
        </div>
      ) : (
        <>
          {comparison && (
            <div className="rounded-xl border border-border-default bg-bg-raised p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-text-muted">پریمیوم فعلی</p>
                  <p className="text-sm font-bold text-text-primary">{currentPremium.toLocaleString('fa-IR')} تومان</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">کمترین پیشنهاد</p>
                  <p className="text-sm font-bold text-green-600">
                    {Math.min(...quotes.map(q => q.premium)).toLocaleString('fa-IR')} تومان
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">بیشترین پیشنهاد</p>
                  <p className="text-sm font-bold text-red-600">
                    {Math.max(...quotes.map(q => q.premium)).toLocaleString('fa-IR')} تومان
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {quotes.map((quote) => {
              const diff = quote.premium - currentPremium
              const isLower = diff < 0
              return (
                <div key={quote.id} className="rounded-xl border border-border-default bg-bg-raised p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{quote.insurer || 'بیمه‌گر'}</p>
                      {quote.coverage && <p className="text-xs text-text-muted mt-1">{quote.coverage}</p>}
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold text-text-primary">
                        {quote.premium.toLocaleString('fa-IR')}
                        <span className="text-xs font-normal text-text-muted"> تومان</span>
                      </p>
                      {currentPremium > 0 && (
                        <p className={`text-xs flex items-center gap-1 ${isLower ? 'text-green-600' : 'text-red-600'}`}>
                          {isLower ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {Math.abs(diff).toLocaleString('fa-IR')} تومان
                        </p>
                      )}
                    </div>
                  </div>

                  {quote.deductible != null && (
                    <div className="text-xs text-text-secondary mb-2">
                      <span className="text-text-muted">فرانشیز:</span> {quote.deductible.toLocaleString('fa-IR')} تومان
                    </div>
                  )}

                  {quote.features && quote.features.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-text-muted mb-1">ویژگی‌ها:</p>
                      <div className="flex flex-wrap gap-1">
                        {quote.features.map((f, idx) => (
                          <span key={idx} className="text-xs bg-bg-base rounded-full px-2 py-0.5 text-text-secondary">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {quote.discounts && quote.discounts.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-text-muted mb-1">تخفیف‌ها:</p>
                      <div className="flex flex-wrap gap-1">
                        {quote.discounts.map((d, idx) => (
                          <span key={idx} className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {quote.validUntil && (
                    <p className="text-xs text-text-muted mb-3">معتبر تا: {quote.validUntil}</p>
                  )}

                  <button
                    onClick={() => handleAcceptQuote(quote.id)}
                    disabled={acceptingId !== null}
                    className="w-full flex items-center justify-center gap-1 py-2 text-sm bg-brand-primary text-text-on-brand rounded-lg disabled:opacity-50"
                  >
                    {acceptingId === quote.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> در حال...</>
                    ) : (
                      <><Check className="h-4 w-4" /> انتخاب این پوشش</>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
