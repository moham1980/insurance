'use client';

import { useState, useEffect } from 'react';

interface UnderwritingRequest {
  id: string;
  customerId: string;
  customerName: string;
  policyType: string;
  product: string;
  premium: number;
  riskScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'review_required';
  submittedAt: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface UnderwritingRule {
  id: string;
  name: string;
  category: string;
  condition: string;
  action: 'approve' | 'reject' | 'review';
  enabled: boolean;
}

export default function UnderwritingPage() {
  const [requests, setRequests] = useState<UnderwritingRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UnderwritingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<UnderwritingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [rules, setRules] = useState<UnderwritingRule[]>([]);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchRules();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, filterStatus, filterPriority, searchTerm]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Mock data - in production, fetch from API
      const mockRequests: UnderwritingRequest[] = [
        {
          id: 'UW-001',
          customerId: 'CUST-001',
          customerName: 'علی محمدی',
          policyType: 'third_party',
          product: 'بیمه شخص ثالث خودرو',
          premium: 5000000,
          riskScore: 25,
          status: 'pending',
          submittedAt: '2024-01-15T10:30:00',
          priority: 'medium',
        },
        {
          id: 'UW-002',
          customerId: 'CUST-002',
          customerName: 'مریم احمدی',
          policyType: 'comprehensive',
          product: 'بیمه بدنه خودرو',
          premium: 15000000,
          riskScore: 45,
          status: 'review_required',
          submittedAt: '2024-01-15T11:45:00',
          assignedTo: 'UW-001',
          priority: 'high',
        },
        {
          id: 'UW-003',
          customerId: 'CUST-003',
          customerName: 'رضا کریمی',
          policyType: 'health',
          product: 'بیمه درمان تکمیلی',
          premium: 8000000,
          riskScore: 15,
          status: 'approved',
          submittedAt: '2024-01-14T09:00:00',
          assignedTo: 'UW-002',
          priority: 'low',
        },
        {
          id: 'UW-004',
          customerId: 'CUST-004',
          customerName: 'فاطمه حسینی',
          policyType: 'life',
          product: 'بیمه عمر و سرمایه‌گذاری',
          premium: 25000000,
          riskScore: 60,
          status: 'rejected',
          submittedAt: '2024-01-14T14:20:00',
          assignedTo: 'UW-001',
          priority: 'urgent',
        },
        {
          id: 'UW-005',
          customerId: 'CUST-005',
          customerName: 'حسین رضایی',
          policyType: 'comprehensive',
          product: 'بیمه بدنه خودرو',
          premium: 12000000,
          riskScore: 30,
          status: 'pending',
          submittedAt: '2024-01-15T16:00:00',
          priority: 'medium',
        },
      ];
      setRequests(mockRequests);
    } catch (error) {
      console.error('Failed to fetch underwriting requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      // Mock data - in production, fetch from API
      const mockRules: UnderwritingRule[] = [
        {
          id: 'RULE-001',
          name: 'حداکثر ریسک پذیرش',
          category: 'risk',
          condition: 'riskScore > 70',
          action: 'reject',
          enabled: true,
        },
        {
          id: 'RULE-002',
          name: 'بررسی سابقه بیمه',
          category: 'history',
          condition: 'previousClaims > 5',
          action: 'review',
          enabled: true,
        },
        {
          id: 'RULE-003',
          name: 'حداقل سن راننده',
          category: 'age',
          condition: 'driverAge < 18',
          action: 'reject',
          enabled: true,
        },
        {
          id: 'RULE-004',
          name: 'حداکثر پریمیوم مجاز',
          category: 'premium',
          condition: 'premium > 100000000',
          action: 'review',
          enabled: true,
        },
        {
          id: 'RULE-005',
          name: 'بررسی اعتبار مشتری',
          category: 'credit',
          condition: 'creditScore < 600',
          action: 'review',
          enabled: true,
        },
      ];
      setRules(mockRules);
    } catch (error) {
      console.error('Failed to fetch underwriting rules:', error);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(req => req.priority === filterPriority);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        req =>
          req.id.toLowerCase().includes(term) ||
          req.customerName.toLowerCase().includes(term) ||
          req.product.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId: string) => {
    try {
      // Mock API call
      setRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status: 'approved' as const } : req
        )
      );
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      // Mock API call
      setRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status: 'rejected' as const } : req
        )
      );
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleRequestReview = async (requestId: string) => {
    try {
      // Mock API call
      setRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status: 'review_required' as const } : req
        )
      );
      setShowDetails(false);
    } catch (error) {
      console.error('Failed to request review:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      review_required: 'bg-blue-100 text-blue-800',
    };

    const labels: Record<string, string> = {
      pending: 'در انتظار',
      approved: 'تایید شده',
      rejected: 'رد شده',
      review_required: 'نیاز به بررسی',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      low: 'کم',
      medium: 'متوسط',
      high: 'زیاد',
      urgent: 'فوری',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 50) return 'text-yellow-600';
    if (score < 70) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">مدیریت صدور (Underwriting)</h1>
          <p className="text-gray-600 mt-2">بررسی و تایید درخواست‌های صدور بیمه</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRules(!showRules)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {showRules ? 'بستن قوانین' : 'مدیریت قوانین'}
          </button>
          <button
            onClick={fetchRequests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            بروزرسانی
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">کل درخواست‌ها</div>
          <div className="text-3xl font-bold">{requests.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">در انتظار بررسی</div>
          <div className="text-3xl font-bold text-yellow-600">
            {requests.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">نیاز به بررسی</div>
          <div className="text-3xl font-bold text-blue-600">
            {requests.filter(r => r.status === 'review_required').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">میانگین امتیاز ریسک</div>
          <div className="text-3xl font-bold">
            {requests.length > 0
              ? (requests.reduce((sum, r) => sum + r.riskScore, 0) / requests.length).toFixed(0)
              : 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">وضعیت</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">همه</option>
              <option value="pending">در انتظار</option>
              <option value="approved">تایید شده</option>
              <option value="rejected">رد شده</option>
              <option value="review_required">نیاز به بررسی</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اولویت</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">همه</option>
              <option value="low">کم</option>
              <option value="medium">متوسط</option>
              <option value="high">زیاد</option>
              <option value="urgent">فوری</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">جستجو</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس کد، نام مشتری یا محصول..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Rules Panel */}
      {showRules && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">قوانین صدور (Underwriting Rules)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-4">نام قانون</th>
                  <th className="text-right py-3 px-4">دسته‌بندی</th>
                  <th className="text-right py-3 px-4">شرط</th>
                  <th className="text-right py-3 px-4">عملیات</th>
                  <th className="text-right py-3 px-4">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b">
                    <td className="py-3 px-4">{rule.name}</td>
                    <td className="py-3 px-4">{rule.category}</td>
                    <td className="py-3 px-4 font-mono text-sm">{rule.condition}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rule.action === 'approve'
                            ? 'bg-green-100 text-green-800'
                            : rule.action === 'reject'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rule.action === 'approve' ? 'تایید' : rule.action === 'reject' ? 'رد' : 'بررسی'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {rule.enabled ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">درخواست‌های صدور</h2>
          <p className="text-gray-600 text-sm mt-1">
            نمایش {filteredRequests.length} از {requests.length} درخواست
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-center">در حال بارگذاری...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right py-3 px-4">کد درخواست</th>
                  <th className="text-right py-3 px-4">مشتری</th>
                  <th className="text-right py-3 px-4">محصول</th>
                  <th className="text-right py-3 px-4">پریمیوم</th>
                  <th className="text-right py-3 px-4">امتیاز ریسک</th>
                  <th className="text-right py-3 px-4">وضعیت</th>
                  <th className="text-right py-3 px-4">اولویت</th>
                  <th className="text-right py-3 px-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono">{request.id}</td>
                    <td className="py-3 px-4">{request.customerName}</td>
                    <td className="py-3 px-4">{request.product}</td>
                    <td className="py-3 px-4">
                      {request.premium.toLocaleString('fa-IR')} ریال
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${getRiskScoreColor(request.riskScore)}`}>
                        {request.riskScore}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(request.status)}</td>
                    <td className="py-3 px-4">{getPriorityBadge(request.priority)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        جزئیات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">جزئیات درخواست صدور</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کد درخواست</label>
                  <div className="text-gray-900">{selectedRequest.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">کد مشتری</label>
                  <div className="text-gray-900">{selectedRequest.customerId}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نام مشتری</label>
                  <div className="text-gray-900">{selectedRequest.customerName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع بیمه</label>
                  <div className="text-gray-900">{selectedRequest.policyType}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">محصول</label>
                  <div className="text-gray-900">{selectedRequest.product}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">پریمیوم</label>
                  <div className="text-gray-900">
                    {selectedRequest.premium.toLocaleString('fa-IR')} ریال
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">امتیاز ریسک</label>
                  <div className={`font-bold ${getRiskScoreColor(selectedRequest.riskScore)}`}>
                    {selectedRequest.riskScore}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وضعیت</label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اولویت</label>
                  <div>{getPriorityBadge(selectedRequest.priority)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ ثبت</label>
                  <div className="text-gray-900">
                    {new Date(selectedRequest.submittedAt).toLocaleDateString('fa-IR')}
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 border-t pt-6">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    تایید درخواست
                  </button>
                  <button
                    onClick={() => handleRequestReview(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    درخواست بررسی بیشتر
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest.id, 'manual')}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    رد درخواست
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
