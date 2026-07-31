import { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { agentPortalAPI } from '../lib/api';

export default function AdvocacyPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [closeReason, setCloseReason] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadAdvocacy() {
      try {
        setLoading(true);
        const claimsData = await agentPortalAPI.getClaims();
        const advocacyCases: any[] = [];
        for (const claim of claimsData) {
          try {
            const advocacy = await agentPortalAPI.getClaimAdvocacy(claim.id);
            if (advocacy && Array.isArray(advocacy)) {
              advocacyCases.push(...advocacy.map((c: any) => ({ ...c, claimNumber: claim.claimNumber, customerName: claim.customerName })));
            } else if (advocacy) {
              advocacyCases.push({ ...advocacy, claimNumber: claim.claimNumber, customerName: claim.customerName });
            }
          } catch {
            // skip claims without advocacy
          }
        }
        setCases(advocacyCases);
      } catch (err: any) {
        setError(err.message || 'خطا در بارگذاری پرونده‌های وکالت');
      } finally {
        setLoading(false);
      }
    }
    loadAdvocacy();
  }, []);

  const handleSelectCase = async (caseItem: any) => {
    setSelectedCase(caseItem);
    try {
      const taskData = await agentPortalAPI.listAdvocacyTasks(caseItem.id);
      setTasks(taskData);
    } catch {
      setTasks([]);
    }
  };

  const handleCloseCase = async () => {
    if (!selectedCase || !closeReason.trim()) return;
    setActionLoading(true);
    try {
      await agentPortalAPI.closeAdvocacyCase(selectedCase.id, closeReason);
      setShowCloseModal(false);
      setCloseReason('');
      setSelectedCase(null);
      // Reload
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'خطا در بستن پرونده');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, status: string) => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      await agentPortalAPI.updateAdvocacyTaskStatus(selectedCase.id, taskId, status);
      const taskData = await agentPortalAPI.listAdvocacyTasks(selectedCase.id);
      setTasks(taskData);
    } catch (err: any) {
      setError(err.message || 'خطا در به‌روزرسانی وظیفه');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">وکالت بیمه‌ای</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">وکالت بیمه‌ای</h1>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      </div>
    );
  }

  if (selectedCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedCase(null)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← بازگشت
          </button>
          {selectedCase.status !== 'CLOSED' && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              بستن پرونده
            </button>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">پرونده وکالت: {selectedCase.caseNumber || selectedCase.id}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">خسارت:</span>
              <span className="mr-2 font-medium text-gray-900">{selectedCase.claimNumber || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">بیمه‌گذار:</span>
              <span className="mr-2 font-medium text-gray-900">{selectedCase.customerName || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">وضعیت:</span>
              <span className={`mr-2 px-2 py-0.5 text-xs rounded-full ${
                selectedCase.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                selectedCase.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedCase.status === 'OPEN' ? 'باز' : selectedCase.status === 'CLOSED' ? 'بسته شده' : selectedCase.status}
              </span>
            </div>
            <div>
              <span className="text-gray-500">اولویت:</span>
              <span className="mr-2 font-medium text-gray-900">{selectedCase.priority || '-'}</span>
            </div>
          </div>
          {selectedCase.description && (
            <div className="mt-4">
              <span className="text-xs text-gray-500">شرح</span>
              <p className="text-sm text-gray-700 mt-1">{selectedCase.description}</p>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">وظایف</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">وظیفه‌ای یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {task.status === 'DONE' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                     task.status === 'IN_PROGRESS' ? <Clock className="h-5 w-5 text-yellow-600" /> :
                     <XCircle className="h-5 w-5 text-gray-400" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title || task.description}</p>
                      <p className="text-xs text-gray-500">{task.dueDate || ''}</p>
                    </div>
                  </div>
                  {task.status !== 'DONE' && (
                    <button
                      onClick={() => handleUpdateTask(task.id, 'DONE')}
                      disabled={actionLoading}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      انجام شد
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showCloseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">بستن پرونده وکالت</h3>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="دلیل بستن پرونده..."
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowCloseModal(false); setCloseReason(''); }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  انصراف
                </button>
                <button
                  onClick={handleCloseCase}
                  disabled={actionLoading || !closeReason.trim()}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'در حال...' : 'بستن پرونده'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">وکالت بیمه‌ای</h1>
      {cases.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          <Shield className="mx-auto mb-2 h-10 w-10 opacity-50" />
          پرونده وکالتی یافت نشد
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">خسارت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">بیمه‌گذار</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اولویت</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cases.map((c) => (
                <tr key={c.id} onClick={() => handleSelectCase(c)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.caseNumber || c.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.claimNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.customerName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      c.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                      c.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {c.status === 'OPEN' ? 'باز' : c.status === 'CLOSED' ? 'بسته شده' : c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.priority || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
