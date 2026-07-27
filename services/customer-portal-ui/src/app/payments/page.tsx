'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Download, Filter, Calendar, Search, CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { paymentsApi } from '@/lib/api'

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

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const response = await paymentsApi.list()
      setPayments(response.data || [])
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری پرداخت‌ها')
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
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'پرداخت شده', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'در انتظار', icon: Clock },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'ناموفق', icon: XCircle },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'بازپرداخت شده', icon: FileText },
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
        alert('رسید در دسترس نیست')
      }
    } catch (err) {
      alert('خطا در دانلود رسید')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="w-5 h-5" />
              <span>بازگشت</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">تاریخچه پرداخت‌ها</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">کل پرداخت‌ها</p>
            <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">پرداخت شده</p>
            <p className="text-2xl font-bold text-green-600">
              {payments.filter(p => p.status === 'paid').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">در انتظار</p>
            <p className="text-2xl font-bold text-yellow-600">
              {payments.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">مجموع مبلغ</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatAmount(payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">فیلترها</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'بستن فیلترها' : 'نمایش فیلترها'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">وضعیت</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">همه</option>
                  <option value="paid">پرداخت شده</option>
                  <option value="pending">در انتظار</option>
                  <option value="failed">ناموفق</option>
                  <option value="refunded">بازپرداخت شده</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">از تاریخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تا تاریخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">جستجو</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="شماره پرداخت یا بیمه‌نامه"
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>پرداختی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">شماره پرداخت</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">شماره بیمه‌نامه</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">مبلغ (تومان)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">وضعیت</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">تاریخ سررسید</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">تاریخ پرداخت</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-gray-900 font-medium">{payment.paymentNumber}</td>
                      <td className="py-4 px-4 text-gray-600">{payment.policyNumber}</td>
                      <td className="py-4 px-4 text-gray-900 font-semibold">{formatAmount(payment.amount)}</td>
                      <td className="py-4 px-4">{getStatusBadge(payment.status)}</td>
                      <td className="py-4 px-4 text-gray-600">{formatDate(payment.dueDate)}</td>
                      <td className="py-4 px-4 text-gray-600">
                        {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          {payment.status === 'paid' && payment.receiptUrl && (
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="دانلود رسید"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
          )}
        </div>

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">جزئیات پرداخت</h3>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">شماره پرداخت:</span>
                  <span className="font-medium">{selectedPayment.paymentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">شماره بیمه‌نامه:</span>
                  <span className="font-medium">{selectedPayment.policyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">مبلغ:</span>
                  <span className="font-bold">{formatAmount(selectedPayment.amount)} تومان</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">وضعیت:</span>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تاریخ سررسید:</span>
                  <span className="font-medium">{formatDate(selectedPayment.dueDate)}</span>
                </div>
                {selectedPayment.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاریخ پرداخت:</span>
                    <span className="font-medium">{formatDate(selectedPayment.paidDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">روش پرداخت:</span>
                  <span className="font-medium">{selectedPayment.paymentMethod}</span>
                </div>
              </div>
              {selectedPayment.status === 'paid' && selectedPayment.receiptUrl && (
                <button
                  onClick={() => handleDownloadReceipt(selectedPayment)}
                  className="w-full mt-4 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  دانلود رسید
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
