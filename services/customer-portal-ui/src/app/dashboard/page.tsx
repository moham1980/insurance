'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, AlertCircle, CreditCard, MessageSquare, LogOut, Menu, X, Shield, TrendingUp, Clock, Bell } from 'lucide-react'
import { authApi, policiesApi, claimsApi, paymentsApi, complaintsApi } from '@/lib/api'

interface DashboardStats {
  activePolicies: number
  pendingClaims: number
  duePayments: number
  totalPremium: number
}

export default function Dashboard() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'claims' | 'payments' | 'complaints'>('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const tokenMatch = document.cookie.match(new RegExp('(^| )auth-token=([^;]+)'))
    if (!tokenMatch) {
      router.push('/')
      return
    }

    loadData()
  }, [router, activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'overview') {
        // Load dashboard stats
        const [policiesRes, claimsRes, paymentsRes] = await Promise.all([
          policiesApi.list(),
          claimsApi.list(),
          paymentsApi.list()
        ])
        
        const policies = policiesRes?.data || []
        const claims = claimsRes?.data || []
        const payments = paymentsRes?.data || []

        setStats({
          activePolicies: policies.filter((p: any) => p.status === 'active').length,
          pendingClaims: claims.filter((c: any) => c.status === 'pending' || c.status === 'registered').length,
          duePayments: payments.filter((p: any) => p.status === 'due' || p.status === 'overdue').length,
          totalPremium: policies.reduce((sum: number, p: any) => sum + (p.premium || 0), 0)
        })
      } else {
        let response
        switch (activeTab) {
          case 'policies':
            response = await policiesApi.list()
            break
          case 'claims':
            response = await claimsApi.list()
            break
          case 'payments':
            response = await paymentsApi.list()
            break
          case 'complaints':
            response = await complaintsApi.list()
            break
        }
        setData(response?.data || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.revokeSession()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    }
  }

  const navItems = [
    { id: 'overview' as const, label: 'داشبورد', icon: TrendingUp },
    { id: 'policies' as const, label: 'بیمه‌نامه‌ها', icon: FileText },
    { id: 'claims' as const, label: 'خسارات', icon: AlertCircle },
    { id: 'payments' as const, label: 'پرداخت‌ها', icon: CreditCard },
    { id: 'complaints' as const, label: 'شکایات', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container-mobile">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">پرتال مشتری</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-mobile py-6">
        <div className="lg:flex lg:gap-6">
          {/* Sidebar Navigation */}
          <aside className={`lg:w-64 lg:flex-shrink-0 ${mobileMenuOpen ? 'block' : 'hidden'} lg:block mb-6 lg:mb-0`}>
            <nav className="bg-white rounded-xl shadow-sm p-4">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          activeTab === item.id
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {navItems.find((item) => item.id === activeTab)?.label}
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : activeTab === 'overview' && stats ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <Shield className="w-8 h-8 opacity-80" />
                        <span className="text-sm opacity-80">بیمه‌نامه‌های فعال</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.activePolicies}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <AlertCircle className="w-8 h-8 opacity-80" />
                        <span className="text-sm opacity-80">خسارت‌های در حال بررسی</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.pendingClaims}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <CreditCard className="w-8 h-8 opacity-80" />
                        <span className="text-sm opacity-80">پرداخت‌های سررسید</span>
                      </div>
                      <p className="text-3xl font-bold">{stats.duePayments}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="w-8 h-8 opacity-80" />
                        <span className="text-sm opacity-80">کل حق بیمه</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalPremium.toLocaleString('fa-IR')} تومان</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">دسترسی سریع</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setActiveTab('policies')}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="w-6 h-6 text-primary-600" />
                        <span className="font-medium text-gray-900">مشاهده بیمه‌نامه‌ها</span>
                      </button>
                      <button
                        onClick={() => router.push('/fnol')}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                        <span className="font-medium text-gray-900">ثبت خسارت جدید</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <CreditCard className="w-6 h-6 text-green-600" />
                        <span className="font-medium text-gray-900">پرداخت آنلاین</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">فعالیت‌های اخیر</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">بیمه‌نامه خودرو تمدید شد</p>
                          <p className="text-sm text-gray-500">۲ روز پیش</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Bell className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">خسارت جدید ثبت شد</p>
                          <p className="text-sm text-gray-500">۵ روز پیش</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : data && data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {activeTab === 'policies' && (
                          <>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">شماره</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">نوع</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">وضعیت</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">تاریخ شروع</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">تاریخ پایان</th>
                          </>
                        )}
                        {activeTab === 'claims' && (
                          <>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">شماره</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">نوع</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">وضعیت</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">تاریخ خسارت</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">مبلغ برآورد شده</th>
                          </>
                        )}
                        {activeTab === 'payments' && (
                          <>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">شماره</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">وضعیت</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">مبلغ</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">تاریخ سررسید</th>
                          </>
                        )}
                        {activeTab === 'complaints' && (
                          <>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">شماره</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">وضعیت</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">تاریخ</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">موضوع</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item: any) => (
                        <tr key={item.id || item.policyId || item.claimId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4 text-gray-900 font-medium">{item.number || item.policyNumber || item.claimNumber}</td>
                          {activeTab === 'policies' && (
                            <>
                              <td className="py-4 px-4 text-gray-600">{item.product || item.type}</td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : item.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status === 'active' ? 'فعال' : item.status === 'pending' ? 'در انتظار' : item.status}
                                </span>
                              </td>
                            </>
                          )}
                          {activeTab === 'claims' && (
                            <>
                              <td className="py-4 px-4 text-gray-600">{item.type}</td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'approved' || item.status === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : item.status === 'pending' || item.status === 'registered'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </>
                          )}
                          {activeTab !== 'policies' && activeTab !== 'claims' && (
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'paid' || item.status === 'resolved'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'pending' || item.status === 'due'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          )}
                          <td className="py-4 px-4 text-gray-600">{item.startDate || item.lossDate || item.dueDate || item.date}</td>
                          <td className="py-4 px-4 text-gray-600">{item.endDate || item.amount || item.subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>داده‌ای موجود نیست</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
