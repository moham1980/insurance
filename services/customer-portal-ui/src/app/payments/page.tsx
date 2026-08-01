'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Filter, Calendar, Search, CheckCircle, Clock, XCircle, FileText, CreditCard, Wallet } from 'lucide-react'
import { useToast } from '@insurance/ui-utils'
import { Card } from '@insurance/design-system'
import { paymentsApi } from '@/lib/api'
import { MOCK_PAYMENTS } from '@/lib/mock-data'

interface Payment {
  id: string
  paymentNumber: string
  policyId: string
  policyNumber: string
  amount: number
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  dueDate: string
  paidDate?: string
  paymentMethod: string
  receiptUrl?: string
}

export default function PaymentHistory() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const response = await paymentsApi.list()
      setPayments(response.data || MOCK_PAYMENTS)
    } catch {
      setPayments(MOCK_PAYMENTS)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = !statusFilter || payment.status === statusFilter
    const matchesSearch = !searchTerm || 
      payment.paymentNumber.includes(searchTerm) ||
      payment.policyNumber.includes(searchTerm)
    const matchesDateFrom = !dateFrom || new Date(payment.dueDate) >= new Date(dateFrom)
    const matchesDateTo = !dateTo || new Date(payment.dueDate) <= new Date(dateTo)
    
    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { bg: 'bg-feedback-success-subtle', text: 'text-feedback-success', label: 'پرداخت شده', icon: CheckCircle },
      pending: { bg: 'bg-feedback-warning-subtle', text: 'text-feedback-warning', label: 'در انتظار', icon: Clock },
      failed: { bg: 'bg-feedback-error-subtle', text: 'text-feedback-error', label: 'ناموفق', icon: XCircle },
      refunded: { bg: 'bg-bg-overlay', text: 'text-text-secondary', label: 'بازپرداخت شده', icon: FileText },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      if (payment.receiptUrl) {
        window.open(payment.receiptUrl, '_blank')
      } else {
        addToast({ type: 'warning', title: 'رسید در دسترس نیست' })
      }
    } catch (err) {
      addToast({ type: 'error', title: 'خطا در دانلود رسید' })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR')
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fa-IR')
  }

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-text-primary">تاریخچه پرداخت‌ها</h1>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-1">کل پرداخت‌ها</p>
            <p className="text-2xl font-bold text-text-primary">{payments.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-1">پرداخت شده</p>
            <p className="text-2xl font-bold text-feedback-success">
              {payments.filter(p => p.status === 'paid').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-1">در انتظار</p>
            <p className="text-2xl font-bold text-feedback-warning">
              {payments.filter(p => p.status === 'pending').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-text-secondary mb-1">مجموع مبلغ</p>
            <p className="text-2xl font-bold text-brand-primary">
              {formatAmount(payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">فیلترها</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-brand-primary hover:text-brand-primary"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'بستن فیلترها' : 'نمایش فیلترها'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">وضعیت</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="">همه</option>
                  <option value="paid">پرداخت شده</option>
                  <option value="pending">در انتظار</option>
                  <option value="failed">ناموفق</option>
                  <option value="refunded">بازپرداخت شده</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">از تاریخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">تا تاریخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">جستجو</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="شماره پرداخت یا بیمه‌نامه"
                    className="w-full pr-10 pl-4 py-2 border border-border-default rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Payments List */}
        <Card className="overflow-hidden">
          {error && (
            <div className="p-4 bg-feedback-error-subtle border-b border-feedback-error/30 text-feedback-error text-sm">
              {error}
            </div>
          )}

          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              <p>پرداختی یافت نشد</p>
            </div>
          ) : (
            <div>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border-subtle">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-bg-subtle transition-colors" onClick={() => setSelectedPayment(payment)}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary text-sm" dir="ltr">{payment.paymentNumber}</p>
                        <p className="text-xs text-text-muted mt-0.5" dir="ltr">{payment.policyNumber}</p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-xs text-text-muted">مبلغ</p>
                        <p className="font-semibold text-text-primary">{formatAmount(payment.amount)} <span className="text-xs font-normal text-text-muted">تومان</span></p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-text-muted">سررسید</p>
                        <p className="text-text-secondary text-sm">{formatDate(payment.dueDate)}</p>
                      </div>
                      {payment.status === 'paid' && payment.receiptUrl && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(payment); }}
                          className="p-2 text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                          title="دانلود رسید"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-subtle">
                  <tr>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">شماره پرداخت</th>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">شماره بیمه‌نامه</th>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">مبلغ (تومان)</th>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">وضعیت</th>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">تاریخ سررسید</th>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">تاریخ پرداخت</th>
                    <th className="text-right py-3 px-4 font-semibold text-text-secondary text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border-subtle hover:bg-bg-subtle">
                      <td className="py-4 px-4 text-text-primary font-medium">{payment.paymentNumber}</td>
                      <td className="py-4 px-4 text-text-secondary">{payment.policyNumber}</td>
                      <td className="py-4 px-4 text-text-primary font-semibold">{formatAmount(payment.amount)}</td>
                      <td className="py-4 px-4">{getStatusBadge(payment.status)}</td>
                      <td className="py-4 px-4 text-text-secondary">{formatDate(payment.dueDate)}</td>
                      <td className="py-4 px-4 text-text-secondary">
                        {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {payment.status === 'paid' && payment.receiptUrl && (
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className="p-2 text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                              title="دانلود رسید"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="p-2 text-text-secondary hover:bg-bg-overlay rounded-lg transition-colors"
                            title="جزئیات"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </Card>

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary">جزئیات پرداخت</h3>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">شماره پرداخت:</span>
                  <span className="font-medium">{selectedPayment.paymentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">شماره بیمه‌نامه:</span>
                  <span className="font-medium">{selectedPayment.policyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">مبلغ:</span>
                  <span className="font-bold">{formatAmount(selectedPayment.amount)} تومان</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">وضعیت:</span>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">تاریخ سررسید:</span>
                  <span className="font-medium">{formatDate(selectedPayment.dueDate)}</span>
                </div>
                {selectedPayment.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">تاریخ پرداخت:</span>
                    <span className="font-medium">{formatDate(selectedPayment.paidDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary">روش پرداخت:</span>
                  <span className="font-medium">{selectedPayment.paymentMethod}</span>
                </div>
              </div>
              {selectedPayment.status === 'paid' && selectedPayment.receiptUrl && (
                <button
                  onClick={() => handleDownloadReceipt(selectedPayment)}
                  className="w-full mt-4 bg-brand-primary text-text-on-brand py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  دانلود رسید
                </button>
              )}
            </Card>
          </div>
        )}
    </div>
  )
}
