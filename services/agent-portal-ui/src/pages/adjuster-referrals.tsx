import { useState, useEffect } from 'react';
import { UserCheck, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';

export default function AdjusterReferralsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [referralForm, setReferralForm] = useState({ adjusterName: '', adjusterLicense: '', referralType: '', notes: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [reportModal, setReportModal] = useState<{ referralId: string } | null>(null);
  const [reportForm, setReportForm] = useState({ findings: '', estimatedLoss: '', recommendation: '' });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const claimsData = await agentPortalAPI.getClaims();
        setClaims(claimsData);
        const referralMap: Record<string, any[]> = {};
        for (const claim of claimsData) {
          try {
            const detail = await agentPortalAPI.getClaimDetails(claim.id);
            if (detail?.adjusterReferrals && Array.isArray(detail.adjusterReferrals)) {
              referralMap[claim.id] = detail.adjusterReferrals;
            }
          } catch {
            // skip
          }
        }
        setReferrals(referralMap);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری ارجاعات کارشناس');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateReferral = async () => {
    if (!selectedClaimId || !referralForm.adjusterName || !referralForm.referralType) return;
    setActionLoading(true);
    try {
      await agentPortalAPI.createAdjusterReferral(selectedClaimId, referralForm);
      setShowCreateModal(false);
      setReferralForm({ adjusterName: '', adjusterLicense: '', referralType: '', notes: '' });
      // Reload
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد ارجاع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (referralId: string) => {
    setActionLoading(true);
    try {
      await agentPortalAPI.acceptAdjusterReferral(referralId);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'خطا در پذیرش ارجاع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (referralId: string) => {
    setActionLoading(true);
    try {
      await agentPortalAPI.rejectAdjusterReferral(referralId, 'رد شده توسط نماینده');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'خطا در رد ارجاع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportModal || !reportForm.findings) return;
    setActionLoading(true);
    try {
      await agentPortalAPI.submitAdjusterReport(reportModal.referralId, reportForm);
      setReportModal(null);
      setReportForm({ findings: '', estimatedLoss: '', recommendation: '' });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت گزارش');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">ارجاعات کارشناس</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ارجاعات کارشناس</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 ml-1" />
          ارجاع جدید
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {claims.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-50" />
          خسارتی برای ارجاع یافت نشد
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => {
            const claimReferrals = referrals[claim.id] || [];
            return (
              <div key={claim.id} className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">خسارت: {claim.claimNumber || claim.id}</span>
                    <span className="mr-3 text-sm text-gray-500">{claim.customerName || '-'}</span>
                  </div>
                  <span className="text-xs text-gray-400">{claimReferrals.length} ارجاع</span>
                </div>
                {claimReferrals.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">ارجاعی برای این خسارت ثبت نشده</p>
                ) : (
                  <div className="space-y-2">
                    {claimReferrals.map((ref) => (
                      <div key={ref.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserCheck className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{ref.adjusterName || 'کارشناس'}</p>
                            <p className="text-xs text-gray-500">
                              {ref.referralType || '-'} | {ref.status === 'PENDING' ? 'در انتظار' :
                              ref.status === 'ACCEPTED' ? 'پذیرفته شده' :
                              ref.status === 'REJECTED' ? 'رد شده' :
                              ref.status === 'COMPLETED' ? 'تکمیل شده' : ref.status}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {ref.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleAccept(ref.id)} disabled={actionLoading}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                                پذیرش
                              </button>
                              <button onClick={() => handleReject(ref.id)} disabled={actionLoading}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                                رد
                              </button>
                            </>
                          )}
                          {ref.status === 'ACCEPTED' && (
                            <button onClick={() => setReportModal({ referralId: ref.id })} disabled={actionLoading}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                              ثبت گزارش
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">ارجاع کارشناس جدید</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">خسارت</label>
                <select
                  value={selectedClaimId}
                  onChange={(e) => setSelectedClaimId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="">انتخاب خسارت...</option>
                  {claims.map((c) => (
                    <option key={c.id} value={c.id}>{c.claimNumber || c.id} - {c.customerName || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">نام کارشناس</label>
                <input value={referralForm.adjusterName} onChange={(e) => setReferralForm({ ...referralForm, adjusterName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">شماره پروانه</label>
                <input value={referralForm.adjusterLicense} onChange={(e) => setReferralForm({ ...referralForm, adjusterLicense: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">نوع ارجاع</label>
                <select value={referralForm.referralType} onChange={(e) => setReferralForm({ ...referralForm, referralType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm">
                  <option value="">انتخاب...</option>
                  <option value="LOSS_ASSESSMENT">ارزیابی خسارت</option>
                  <option value="FIELD_INSPECTION">بازرسی میدانی</option>
                  <option value="DOCUMENT_VERIFICATION">تأیید مدارک</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">یادداشت</label>
                <textarea value={referralForm.notes} onChange={(e) => setReferralForm({ ...referralForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">انصراف</button>
              <button onClick={handleCreateReferral} disabled={actionLoading || !selectedClaimId || !referralForm.adjusterName}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                {actionLoading ? 'در حال...' : 'ایجاد ارجاع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">ثبت گزارش کارشناسی</h3>
              <button onClick={() => setReportModal(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">یافته‌ها</label>
                <textarea value={reportForm.findings} onChange={(e) => setReportForm({ ...reportForm, findings: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={4} />
              </div>
              <div>
                <label className="text-xs text-gray-500">مبلغ تخمینی خسارت</label>
                <input value={reportForm.estimatedLoss} onChange={(e) => setReportForm({ ...reportForm, estimatedLoss: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" type="number" />
              </div>
              <div>
                <label className="text-xs text-gray-500">پیشنهاد</label>
                <textarea value={reportForm.recommendation} onChange={(e) => setReportForm({ ...reportForm, recommendation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReportModal(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">انصراف</button>
              <button onClick={handleSubmitReport} disabled={actionLoading || !reportForm.findings}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? 'در حال...' : 'ثبت گزارش'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
