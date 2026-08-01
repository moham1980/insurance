'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ShieldAlert, FileText, Calendar, Clock, CheckCircle, XCircle,
  ChevronLeft, Download, MessageSquare, Phone, MapPin, Car,
  AlertCircle, Loader2, TrendingUp, Users, Camera, Gavel
} from 'lucide-react'
import { claimsApi } from '@/lib/api'
import { StatCard, ProgressBar, Card } from '@insurance/design-system'

interface ClaimDetail {
  id: string
  claimNumber: string
  policyId: string
  policyNumber: string
  product: string
  productName: string
  status: string
  claimType: string
  reportedAt: string
  incidentDate: string
  incidentTime: string
  incidentLocation: string
  description: string
  estimatedAmount: number
  approvedAmount?: number
  deductible: number
  adjuster: {
    name: string
    phone: string
    assignedAt: string
  }
  timeline: Array<{
    status: string
    label: string
    date: string
    note?: string
    completed: boolean
  }>
  documents: Array<{
    id: string
    name: string
    type: string
    uploadedAt: string
  }>
  involvedParties: Array<{
    name: string
    role: string
    phone?: string
    vehiclePlate?: string
  }>
  progress: number
}

const MOCK_CLAIM: ClaimDetail = {
  id: 'clm-001',
  claimNumber: 'CLM-1403-92145',
  policyId: 'pol-001',
  policyNumber: 'INS-1403-7845129',
  product: 'motor',
  productName: 'بیمه شخص ثالث خودرو',
  status: 'under_review',
  claimType: 'حوادث رانندگی',
  reportedAt: '1403/07/20',
  incidentDate: '1403/07/18',
  incidentTime: '14:30',
  incidentLocation: 'تهران، میدان آزادی، اتوبان لشکرک',
  description: 'برخورد از طرف راست در تقاطع میدان آزادی. خسارت مالی به وسیله نقلیه طرف مقابل و آسیب جزئی به خودرو بیمه‌گذار.',
  estimatedAmount: 3_200_000,
  approvedAmount: undefined,
  deductible: 500_000,
  adjuster: {
    name: 'کارشناس رضا احمدی',
    phone: '09121112233',
    assignedAt: '1403/07/21',
  },
  progress: 45,
  timeline: [
    { status: 'reported', label: 'ثبت اولیه خسارت', date: '1403/07/20', note: 'خسارت از طریق پرتال ثبت شد', completed: true },
    { status: 'assigned', label: 'انتساب کارشناس', date: '1403/07/21', note: 'کارشناس رضا احمدی اختصاص یافت', completed: true },
    { status: 'inspection', label: 'بازرسی صحنه حادثه', date: '1403/07/23', note: 'کارشناس در محل حادثه حاضر شد', completed: true },
    { status: 'under_review', label: 'در حال بررسی', date: '1403/07/25', note: 'مدارک در حال بررسی توسط واحد خسارت است', completed: false },
    { status: 'approved', label: 'تأیید خسارت', date: '-', completed: false },
    { status: 'paid', label: 'پرداخت خسارت', date: '-', completed: false },
  ],
  documents: [
    { id: 'doc-1', name: 'گزارش پلیس.pdf', type: 'police_report', uploadedAt: '1403/07/20' },
    { id: 'doc-2', name: 'عکس خسارت ۱.jpg', type: 'photo', uploadedAt: '1403/07/20' },
    { id: 'doc-3', name: 'عکس خسارت ۲.jpg', type: 'photo', uploadedAt: '1403/07/20' },
    { id: 'doc-4', name: 'کارت ماشین.pdf', type: 'vehicle_card', uploadedAt: '1403/07/20' },
  ],
  involvedParties: [
    { name: 'علی محمدی', role: 'بیمه‌گذار', phone: '09123456789', vehiclePlate: '۱۲۳ ایران ۴۵ ۶۷' },
    { name: 'محمد رضایی', role: 'طرف مقابل', phone: '09351112233', vehiclePlate: '۴۵۶ تهران ۷۸ ۹۰' },
    { name: 'سهراب کریمی', role: 'شاهد', phone: '09195556677' },
  ],
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  reported: { label: 'ثبت شده', color: 'text-feedback-info', bg: 'bg-feedback-info-subtle' },
  assigned: { label: 'انتساب کارشناس', color: 'text-feedback-info', bg: 'bg-feedback-info-subtle' },
  inspection: { label: 'در حال بازرسی', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle' },
  under_review: { label: 'در حال بررسی', color: 'text-feedback-warning', bg: 'bg-feedback-warning-subtle' },
  approved: { label: 'تأیید شده', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle' },
  rejected: { label: 'رد شده', color: 'text-feedback-error', bg: 'bg-feedback-error-subtle' },
  paid: { label: 'پرداخت شده', color: 'text-feedback-success', bg: 'bg-feedback-success-subtle' },
  closed: { label: 'بسته شده', color: 'text-text-muted', bg: 'bg-bg-subtle' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان'
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [claim, setClaim] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents' | 'parties'>('overview')

  useEffect(() => {
    loadClaim()
  }, [])

  const loadClaim = async () => {
    try {
      setLoading(true)
      const response = await claimsApi.getById(params.id as string)
      if (response.data) {
        setClaim(response.data)
      } else {
        setClaim(MOCK_CLAIM)
      }
    } catch {
      setClaim(MOCK_CLAIM)
    } finally {
      setLoading(false)
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

  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-text-muted mb-3" />
        <p className="text-sm text-text-secondary">خسارتی یافت نشد</p>
        <button onClick={() => router.push('/claims')} className="mt-4 text-sm text-brand-primary">
          بازگشت به لیست
        </button>
      </div>
    )
  }

  const status = statusConfig[claim.status] || statusConfig.under_review

  return (
    <div className="space-y-4 animate-fade-in">
      <button
        onClick={() => router.push('/claims')}
        className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronLeft className="h-4 w-4 ml-1" />
        بازگشت به لیست
      </button>

      {/* Claim Header Card */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-warning-subtle text-feedback-warning">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-text-primary">{claim.claimType}</h1>
              <p className="text-xs text-text-muted mt-0.5">{claim.claimNumber}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-bg-subtle p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <FileText className="h-3.5 w-3.5" />
              بیمه‌نامه
            </div>
            <p className="mt-1 text-sm font-medium text-text-primary">{claim.policyNumber}</p>
          </div>
          <div className="rounded-lg bg-bg-subtle p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" />
              تاریخ ثبت
            </div>
            <p className="mt-1 text-sm font-medium text-text-primary">{claim.reportedAt}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            value={claim.progress}
            color="brand"
            label="مرحله فعلی"
            showValue={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push(`/adjuster-communication?claimId=${claim.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-3 py-2.5 text-xs font-medium text-text-on-brand transition-colors hover:opacity-90"
          >
            <MessageSquare className="h-4 w-4" />
            ارتباط با کارشناس
          </button>
          <button
            onClick={() => router.push(`/advocacy?claimId=${claim.id}`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-default px-3 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-subtle"
          >
            <Gavel className="h-4 w-4" />
            وکالت
          </button>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StatCard
          title="مبلغ تخمینی"
          value={formatCurrency(claim.estimatedAmount).replace(' تومان', '')}
          icon={TrendingUp}
          className="!p-3"
        />
        <StatCard
          title="فرانشیز"
          value={formatCurrency(claim.deductible).replace(' تومان', '')}
          icon={ShieldAlert}
          className="!p-3"
        />
        <StatCard
          title="مبلغ تأیید شده"
          value={claim.approvedAmount ? formatCurrency(claim.approvedAmount).replace(' تومان', '') : '-'}
          icon={CheckCircle}
          className="!p-3"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border-default">
        {[
          { id: 'overview', label: 'اطلاعات حادثه' },
          { id: 'timeline', label: 'مراحل' },
          { id: 'documents', label: 'مدارک' },
          { id: 'parties', label: 'افراد درگیر' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-brand-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Incident Details */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">جزئیات حادثه</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-text-muted" />
                <span className="text-text-muted">تاریخ:</span>
                <span className="text-text-primary">{claim.incidentDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-text-muted">ساعت:</span>
                <span className="text-text-primary">{claim.incidentTime}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-text-muted" />
                <span className="text-text-muted">محل:</span>
                <span className="text-text-primary">{claim.incidentLocation}</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-bg-subtle p-3">
              <p className="text-xs text-text-muted mb-1">شرح حادثه</p>
              <p className="text-sm text-text-secondary leading-6">{claim.description}</p>
            </div>
          </Card>

          {/* Adjuster Info */}
          {claim.adjuster && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">کارشناس خسارت</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{claim.adjuster.name}</p>
                  <p className="text-xs text-text-muted">انتساب: {claim.adjuster.assignedAt}</p>
                </div>
                <a
                  href={`tel:${claim.adjuster.phone}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary transition-colors hover:bg-brand-primary/20"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-3 animate-fade-in">
          {claim.timeline?.map((event, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  event.completed
                    ? 'bg-feedback-success-subtle text-feedback-success'
                    : idx === claim.timeline.findIndex(e => !e.completed)
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'bg-bg-subtle text-text-muted'
                }`}>
                  {event.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : event.status === 'rejected' ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                {idx < claim.timeline.length - 1 && (
                  <div className={`w-0.5 ${event.completed ? 'bg-feedback-success' : 'bg-border-default'}`} style={{ minHeight: '24px' }} />
                )}
              </div>
              <div className={`flex-1 rounded-xl border p-3 ${
                event.completed
                  ? 'border-border-default bg-bg-raised'
                  : idx === claim.timeline.findIndex(e => !e.completed)
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
      )}

      {activeTab === 'documents' && (
        <div className="space-y-3 animate-fade-in">
          {claim.documents?.map((doc) => (
            <Card
              key={doc.id}
              className="p-4 transition-colors hover:border-border-focus"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  {doc.type === 'photo' ? <Camera className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{doc.name}</p>
                  <p className="text-xs text-text-muted">{doc.uploadedAt}</p>
                </div>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-subtle hover:text-brand-primary">
                <Download className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'parties' && (
        <div className="space-y-3 animate-fade-in">
          {claim.involvedParties?.map((party, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{party.name}</p>
                  <p className="text-xs text-text-muted">{party.role}</p>
                </div>
                {party.phone && (
                  <a
                    href={`tel:${party.phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-subtle text-text-secondary transition-colors hover:text-brand-primary"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
              {party.vehiclePlate && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-bg-subtle p-2.5">
                  <Car className="h-4 w-4 text-text-muted" />
                  <span className="text-xs text-text-muted">پلاک:</span>
                  <span className="text-sm font-medium text-text-primary">{party.vehiclePlate}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
