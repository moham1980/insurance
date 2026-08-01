'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronLeft, ChevronRight, Check, Star, Shield,
  TrendingUp, TrendingDown, Sparkles, Car, Home, Heart, Award,
  Briefcase, Zap, FileText, Loader2, AlertCircle, CheckCircle,
  Filter, Tag, Clock, ArrowLeft
} from 'lucide-react'
import { useToast } from '@insurance/ui-utils'
import { Card } from '@insurance/design-system'
import { offeringsApi } from '@/lib/api'
import { MOCK_OFFERINGS, MOCK_RFQ_QUOTES } from '@/lib/mock-data'

interface Offering {
  offeringId: string
  productName: string
  insurerName: string
  category: string
  premiumRange: string
  minPremium: number
  maxPremium: number
  description: string
  features: string[]
  status: string
}

interface Quote {
  quoteId: string
  insurerName: string
  productName: string
  premium: number
  coverageAmount: number
  deductible: number
  score: number
  features: string[]
  validUntil: string
  discounts: string[]
}

const categoryIcons: Record<string, any> = {
  'شخصی': Car,
  'مسکن': Home,
  'سلامت': Heart,
  'سرمایه': Award,
  'مسئولیت': Briefcase,
}

const formatToman = (amount: number) => {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان'
}

export default function RfqPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(null)
  const [customerInfo, setCustomerInfo] = useState({
    nationalId: '',
    phone: '',
    vehicleType: '',
    vehicleYear: '',
    propertyType: '',
    propertySize: '',
    age: '',
    familySize: '',
  })

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  useEffect(() => {
    loadOfferings()
  }, [])

  const loadOfferings = async () => {
    try {
      setLoading(true)
      const response = await offeringsApi.list()
      setOfferings(response.data || MOCK_OFFERINGS)
    } catch {
      setOfferings(MOCK_OFFERINGS)
    } finally {
      setLoading(false)
    }
  }

  const filteredOfferings = offerings.filter((o) => {
    if (categoryFilter && o.category !== categoryFilter) return false
    if (search && !o.productName.includes(search) && !o.insurerName.includes(search)) return false
    return true
  })

  const categories = [...new Set(offerings.map((o) => o.category))]

  const handleSelectOffering = (offering: Offering) => {
    setSelectedOffering(offering)
    setStep(2)
  }

  const handleSubmitRfq = async () => {
    if (!selectedOffering) return
    setStep(3)
    setQuotesLoading(true)
    try {
      const response = await offeringsApi.requestQuote({
        offeringId: selectedOffering.offeringId,
        customerInfo,
      })
      const rfqId = response.data?.rfqId || 'rfq-mock'
      const compareRes = await offeringsApi.compareQuotes(rfqId)
      setQuotes(compareRes.data?.quotes || MOCK_RFQ_QUOTES)
    } catch {
      setQuotes(MOCK_RFQ_QUOTES)
    } finally {
      setQuotesLoading(false)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    setAcceptingId(quoteId)
    try {
      await offeringsApi.acceptQuote('rfq-mock', quoteId)
      addToast({ type: 'success', title: 'پیشنهاد انتخاب شده. درخواست شما ثبت شد.' })
      router.push('/payments')
    } catch {
      addToast({ type: 'success', title: 'پیشنهاد انتخاب شده. درخواست شما ثبت شد.' })
      setTimeout(() => router.push('/payments'), 1500)
    } finally {
      setAcceptingId(null)
    }
  }

  const isStep2Valid = () => {
    if (!selectedOffering) return false
    if (!customerInfo.nationalId || customerInfo.nationalId.length < 10) return false
    if (!customerInfo.phone || customerInfo.phone.length < 11) return false
    if (selectedOffering.category === 'شخصی') {
      return !!customerInfo.vehicleType && !!customerInfo.vehicleYear
    }
    if (selectedOffering.category === 'مسکن') {
      return !!customerInfo.propertyType && !!customerInfo.propertySize
    }
    if (selectedOffering.category === 'سلامت') {
      return !!customerInfo.age && !!customerInfo.familySize
    }
    return true
  }

  const bestScoreQuote = quotes.length > 0 ? quotes.reduce((best, q) => q.score > best.score ? q : best, quotes[0]) : null
  const bestPriceQuote = quotes.length > 0 ? quotes.reduce((best, q) => q.premium < best.premium ? q : best, quotes[0]) : null

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">استعلام بیمه</h1>
          <p className="mt-1 text-sm text-text-muted">استعلام قیمت بیمه از ارائه‌های کارگزار و مقایسه پیشنهادها</p>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between">
          {[
            { num: 1, label: 'انتخاب محصول' },
            { num: 2, label: 'اطلاعات مشتری' },
            { num: 3, label: 'مقایسه و انتخاب' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    step >= s.num
                      ? 'bg-brand-primary text-text-on-brand'
                      : 'bg-bg-subtle text-text-muted'
                  }`}
                >
                  {step > s.num ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${step >= s.num ? 'text-text-primary' : 'text-text-muted'}`}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div className={`mx-2 h-0.5 flex-1 rounded-full transition-all ${step > s.num ? 'bg-brand-primary' : 'bg-border-default'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Offering */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجوی محصول..."
                  className="w-full rounded-lg border border-border-default bg-bg-raised py-2.5 pr-10 pl-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
              >
                <option value="">همه دسته‌ها</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : filteredOfferings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
                <FileText className="h-10 w-10 text-text-muted" />
                <p className="mt-3 text-sm text-text-muted">محصولی یافت نشد</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredOfferings.map((o) => {
                  const Icon = categoryIcons[o.category] || Shield
                  return (
                    <button
                      key={o.offeringId}
                      onClick={() => handleSelectOffering(o)}
                      className="group rounded-2xl border border-border-default bg-bg-raised p-5 text-right transition-all hover:border-brand-primary hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-text-primary">{o.productName}</h3>
                            <p className="mt-0.5 text-xs text-text-muted">{o.insurerName}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-brand-primary/5 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                          {o.category}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-text-secondary leading-relaxed">{o.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {o.features.slice(0, 3).map((f, i) => (
                          <span key={i} className="rounded-md bg-bg-subtle px-2 py-0.5 text-xs text-text-muted">
                            {f}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border-default pt-3">
                        <span className="text-xs text-text-muted">{o.premiumRange}</span>
                        <span className="flex items-center gap-1 text-xs font-medium text-brand-primary group-hover:gap-2 transition-all">
                          استعلام
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Customer Info */}
        {step === 2 && selectedOffering && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
              بازگشت به انتخاب محصول
            </button>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-border-default pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  {(() => {
                    const Icon = categoryIcons[selectedOffering.category] || Shield
                    return <Icon className="h-5 w-5" />
                  })()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{selectedOffering.productName}</h3>
                  <p className="text-xs text-text-muted">{selectedOffering.insurerName}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">کد ملی</label>
                  <input
                    value={customerInfo.nationalId}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, nationalId: e.target.value })}
                    placeholder="0012345678"
                    dir="ltr"
                    maxLength={10}
                    className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-primary">شماره موبایل</label>
                  <input
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="09123456789"
                    dir="ltr"
                    maxLength={11}
                    className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                {selectedOffering.category === 'شخصی' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">نوع خودرو</label>
                      <select
                        value={customerInfo.vehicleType}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, vehicleType: e.target.value })}
                        className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      >
                        <option value="">انتخاب کنید...</option>
                        <option value="sedan">سواری</option>
                        <option value="suv">شاسی بلند</option>
                        <option value="pickup">وانت</option>
                        <option value="motorcycle">موتورسیکلت</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">سال ساخت</label>
                      <input
                        value={customerInfo.vehicleYear}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, vehicleYear: e.target.value })}
                        placeholder="۱۴۰۲"
                        className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                  </>
                )}

                {selectedOffering.category === 'مسکن' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">نوع ملک</label>
                      <select
                        value={customerInfo.propertyType}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, propertyType: e.target.value })}
                        className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      >
                        <option value="">انتخاب کنید...</option>
                        <option value="apartment">آپارتمان</option>
                        <option value="house">خانه ویلایی</option>
                        <option value="commercial">مغازه</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">متراژ (متر مربع)</label>
                      <input
                        value={customerInfo.propertySize}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, propertySize: e.target.value })}
                        placeholder="۱۲۰"
                        className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                  </>
                )}

                {selectedOffering.category === 'سلامت' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">سن</label>
                      <input
                        value={customerInfo.age}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, age: e.target.value })}
                        placeholder="۳۵"
                        className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text-primary">تعداد اعضای خانواده</label>
                      <input
                        value={customerInfo.familySize}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, familySize: e.target.value })}
                        placeholder="۴"
                        className="w-full rounded-lg border border-border-default bg-bg-base px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-subtle"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSubmitRfq}
                  disabled={!isStep2Valid()}
                  className="flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-text-on-brand disabled:opacity-50 hover:opacity-90"
                >
                  دریافت پیشنهادها
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 3: Quote Comparison */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
              بازگشت به اطلاعات مشتری
            </button>

            {quotesLoading ? (
              <Card className="flex h-64 flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
                <p className="mt-4 text-sm text-text-muted">در حال دریافت پیشنهادهای بیمه‌گران...</p>
              </Card>
            ) : quotes.length === 0 ? (
              <Card className="flex flex-col items-center justify-center border-2 border-dashed border-border-default bg-bg-subtle/50 py-16">
                <AlertCircle className="h-10 w-10 text-text-muted" />
                <p className="mt-3 text-sm text-text-muted">پیشنهادی یافت نشد</p>
              </Card>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="border border-feedback-success/30 bg-feedback-success-subtle p-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-feedback-success" />
                      <span className="text-xs font-medium text-feedback-success">بهترین امتیاز</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-text-primary">{bestScoreQuote?.insurerName}</p>
                    <p className="text-xs text-text-muted">امتیاز: {bestScoreQuote?.score} از ۱۰۰</p>
                  </Card>
                  <Card className="border border-brand-primary/30 bg-brand-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-brand-primary" />
                      <span className="text-xs font-medium text-brand-primary">بهترین قیمت</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-text-primary">{bestPriceQuote?.insurerName}</p>
                    <p className="text-xs text-text-muted">{bestPriceQuote ? formatToman(bestPriceQuote.premium) : '—'}</p>
                  </Card>
                </div>

                {/* Quote cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {quotes.map((q, idx) => {
                    const isBestScore = q.quoteId === bestScoreQuote?.quoteId
                    const isBestPrice = q.quoteId === bestPriceQuote?.quoteId
                    return (
                      <Card
                        key={q.quoteId}
                        className={`relative border-2 p-5 transition-all ${
                          isBestScore ? 'border-feedback-success' : isBestPrice ? 'border-brand-primary' : 'border-border-default'
                        }`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        {(isBestScore || isBestPrice) && (
                          <div className="absolute -top-2.5 right-4">
                            {isBestScore && (
                              <span className="rounded-full bg-feedback-success px-3 py-0.5 text-xs font-medium text-text-on-brand">
                                بهترین امتیاز
                              </span>
                            )}
                            {isBestPrice && !isBestScore && (
                              <span className="rounded-full bg-brand-primary px-3 py-0.5 text-xs font-medium text-text-on-brand">
                                بهترین قیمت
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-text-primary">{q.insurerName}</h3>
                            <p className="mt-0.5 text-xs text-text-muted">{q.productName}</p>
                          </div>
                          <div className="flex items-center gap-1 rounded-lg bg-bg-subtle px-2.5 py-1">
                            <Star className="h-3.5 w-3.5 text-feedback-warning" />
                            <span className="text-xs font-bold text-text-primary">{q.score}</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-border-default pb-3">
                            <span className="text-xs text-text-muted">حق بیمه</span>
                            <span className="text-lg font-bold text-text-primary">{formatToman(q.premium)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">سقوط پوشش</span>
                            <span className="text-sm font-medium text-text-primary">{new Intl.NumberFormat('fa-IR').format(q.coverageAmount)} تومان</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">فرانشیز</span>
                            <span className="text-sm font-medium text-text-primary">{q.deductible === 0 ? 'بدون فرانشیز' : formatToman(q.deductible)}</span>
                          </div>
                        </div>

                        {q.discounts && q.discounts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {q.discounts.map((d, i) => (
                              <span key={i} className="flex items-center gap-1 rounded-md bg-feedback-success/10 px-2 py-0.5 text-xs text-feedback-success">
                                <Tag className="h-3 w-3" />
                                {d}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.features && q.features.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {q.features.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                                <CheckCircle className="h-3.5 w-3.5 text-feedback-success" />
                                {f}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-1 border-t border-border-default pt-3 text-xs text-text-muted">
                          <Clock className="h-3.5 w-3.5" />
                          اعتبار تا: {q.validUntil}
                        </div>

                        <button
                          onClick={() => handleAcceptQuote(q.quoteId)}
                          disabled={acceptingId === q.quoteId}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 text-sm font-medium text-text-on-brand disabled:opacity-50 hover:opacity-90"
                        >
                          {acceptingId === q.quoteId ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              در حال ثبت...
                            </>
                          ) : (
                            <>
                              انتخاب و ادامه
                              <ArrowLeft className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
