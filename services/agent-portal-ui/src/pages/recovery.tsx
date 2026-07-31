import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';

export default function RecoveryPage() {
  const [recoveryCases, setRecoveryCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ claimId: '', recoveryType: '', targetParty: '', amount: '', notes: '' });
  const [claims, setClaims] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [recoveryData, claimsData] = await Promise.all([
          agentPortalAPI.listRecoveryCases(),
          agentPortalAPI.getClaims(),
        ]);
        setRecoveryCases(recoveryData);
        setClaims(claimsData);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری پرونده‌های استرداد');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!createForm.claimId || !createForm.recoveryType) return;
    setActionLoading(true);
    try {
      await agentPortalAPI.createRecoveryCase(createForm.claimId, {
        recoveryType: createForm.recoveryType,
        targetParty: createForm.targetParty,
        amount: createForm.amount ? Number(createForm.amount) : undefined,
        notes: createForm.notes,
      });
      setShowCreateModal(false);
      setCreateForm({ claimId: '', recoveryType: '', targetParty: '', amount: '', notes: '' });
      const data = await agentPortalAPI.listRecoveryCases();
      setRecoveryCases(data);
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد پرونده استرداد');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (recoveryId: string, status: string) => {
    setActionLoading(true);
    try {
      await agentPortalAPI.updateRecoveryStatus(recoveryId, status);
      const data = await agentPortalAPI.listRecoveryCases();
      setRecoveryCases(data);
    } catch (err: any) {
      setError(err.message || 'خطا در به‌روزرسانی وضعیت');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">استرداد خسارت</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">استرداد خسارت</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 ml-1" />
          پرونده جدید
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {recoveryCases.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          <RefreshCw className="mx-auto mb-2 h-10 w-10 opacity-50" />
          پرونده استردادی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شناسه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">خسارت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">طرف مقابل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اقدامات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recoveryCases.map((rc) => (
                <tr key={rc.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{rc.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{rc.claimId || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{rc.recoveryType || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{rc.targetParty || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {rc.amount ? `${Number(rc.amount).toLocaleString('fa-IR')} تومان` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      rc.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      rc.status === 'RECOVERED' ? 'bg-green-100 text-green-800' :
                      rc.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rc.status === 'PENDING' ? 'در انتظار' :
                       rc.status === 'IN_PROGRESS' ? 'در حال پیگیری' :
                       rc.status === 'RECOVERED' ? 'استرداد شده' :
                       rc.status === 'CLOSED' ? 'بسته شده' :
                       rc.status === 'FAILED' ? 'ناموفق' : rc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={rc.status}
                      onChange={(e) => handleUpdateStatus(rc.id, e.target.value)}
                      disabled={actionLoading}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="PENDING">در انتظار</option>
                      <option value="IN_PROGRESS">در حال پیگیری</option>
                      <option value="RECOVERED">استرداد شده</option>
                      <option value="CLOSED">بسته شده</option>
                      <option value="FAILED">ناموفق</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">پرونده استرداد جدید</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">خسارت</label>
                <select
                  value={createForm.claimId}
                  onChange={(e) => setCreateForm({ ...createForm, claimId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="">انتخاب خسارت...</option>
                  {claims.map((c) => (
                    <option key={c.id} value={c.id}>{c.claimNumber || c.id} - {c.customerName || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">نوع استرداد</label>
                <select
                  value={createForm.recoveryType}
                  onChange={(e) => setCreateForm({ ...createForm, recoveryType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="">انتخاب...</option>
                  <option value="SUBROGATION">استرداد از شخص ثالث</option>
                  <option value="SALVAGE">استرداد از فروش ضایعات</option>
                  <option value="REINSURANCE">استرداد از بیمه اتکایی</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">طرف مقابل</label>
                <input value={createForm.targetParty} onChange={(e) => setCreateForm({ ...createForm, targetParty: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">مبلغ</label>
                <input value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" type="number" />
              </div>
              <div>
                <label className="text-xs text-gray-500">یادداشت</label>
                <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">انصراف</button>
              <button onClick={handleCreate} disabled={actionLoading || !createForm.claimId || !createForm.recoveryType}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                {actionLoading ? 'در حال...' : 'ایجاد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
