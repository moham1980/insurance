import { useState, useEffect } from 'react';
import { FileText, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function loadClaims() {
      try {
        setLoading(true);
        const data = await agentPortalAPI.getClaims();
        setClaims(data);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری خسارت‌ها');
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, []);

  const handleSelectClaim = async (claimId: string) => {
    setDetailLoading(true);
    try {
      const detail = await agentPortalAPI.getClaimDetails(claimId);
      setSelectedClaim(detail);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری جزئیات خسارت');
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">خسارت‌ها</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="mr-2 text-gray-600">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">خسارت‌ها</h1>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      </div>
    );
  }

  if (selectedClaim) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedClaim(null)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4 ml-1" />
          بازگشت به لیست
        </button>
        <h1 className="text-2xl font-bold text-gray-900">جزئیات خسارت</h1>
        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">شماره خسارت</label>
                <p className="text-sm font-medium text-gray-900">{selectedClaim.claimNumber || selectedClaim.id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">بیمه‌نامه</label>
                <p className="text-sm font-medium text-gray-900">{selectedClaim.policyNumber || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">بیمه‌گذار</label>
                <p className="text-sm font-medium text-gray-900">{selectedClaim.customerName || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">نوع خسارت</label>
                <p className="text-sm font-medium text-gray-900">{selectedClaim.claimType || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">وضعیت</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  selectedClaim.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                  selectedClaim.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  selectedClaim.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedClaim.status === 'OPEN' ? 'باز' :
                   selectedClaim.status === 'APPROVED' ? 'تأیید شده' :
                   selectedClaim.status === 'REJECTED' ? 'رد شده' :
                   selectedClaim.status === 'UNDER_REVIEW' ? 'در حال بررسی' : selectedClaim.status}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500">مبلغ خسارت</label>
                <p className="text-sm font-medium text-gray-900">
                  {selectedClaim.claimAmount ? `${Number(selectedClaim.claimAmount).toLocaleString('fa-IR')} تومان` : '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">تاریخ اعلام</label>
                <p className="text-sm font-medium text-gray-900">{selectedClaim.reportedDate || selectedClaim.createdAt || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">تاریخ وقوع</label>
                <p className="text-sm font-medium text-gray-900">{selectedClaim.lossDate || '-'}</p>
              </div>
            </div>
            {selectedClaim.description && (
              <div>
                <label className="text-xs text-gray-500">شرح خسارت</label>
                <p className="text-sm text-gray-700 mt-1">{selectedClaim.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">خسارت‌ها</h1>
      {claims.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
          هیچ خسارتی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">بیمه‌نامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">بیمه‌گذار</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاریخ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {claims.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => handleSelectClaim(claim.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{claim.claimNumber || claim.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{claim.policyNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{claim.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{claim.claimType || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      claim.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                      claim.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      claim.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {claim.status === 'OPEN' ? 'باز' :
                       claim.status === 'APPROVED' ? 'تأیید شده' :
                       claim.status === 'REJECTED' ? 'رد شده' :
                       claim.status === 'UNDER_REVIEW' ? 'در حال بررسی' : claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {claim.claimAmount ? `${Number(claim.claimAmount).toLocaleString('fa-IR')} تومان` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{claim.reportedDate || claim.createdAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
