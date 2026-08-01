import { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, CheckCircle, XCircle, Clock, ChevronLeft } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { agentPortalAPI } from '../lib/api';
import { mockAdvocacy } from '../lib/mock-data';

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
      } catch {
        setCases(mockAdvocacy);
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
        <h1 className="text-2xl font-bold text-text-primary">وکالت بیمه‌ای</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <span className="mr-2 text-text-muted">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">وکالت بیمه‌ای</h1>
        <div className="flex items-center gap-2 bg-feedback-error-subtle border border-feedback-error/30 text-feedback-error px-4 py-3 rounded">
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
            className="flex items-center text-sm text-text-muted hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4 ml-1" /> بازگشت
          </button>
          {selectedCase.status !== 'CLOSED' && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1.5 text-sm bg-feedback-error text-text-on-brand rounded hover:opacity-90"
            >
              بستن پرونده
            </button>
          )}
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-brand-primary" />
            <h2 className="text-lg font-bold text-text-primary">پرونده وکالت: {selectedCase.caseNumber || selectedCase.id}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-text-muted">خسارت:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedCase.claimNumber || '-'}</span>
            </div>
            <div>
              <span className="text-text-muted">بیمه‌گذار:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedCase.customerName || '-'}</span>
            </div>
            <div>
              <span className="text-text-muted">وضعیت:</span>
              <span className={`mr-2 px-2 py-0.5 text-xs rounded-full ${
                selectedCase.status === 'OPEN' ? 'bg-feedback-success-subtle text-feedback-success' :
                selectedCase.status === 'CLOSED' ? 'bg-bg-base text-text-primary' :
                'bg-feedback-warning-subtle text-feedback-warning'
              }`}>
                {selectedCase.status === 'OPEN' ? 'باز' : selectedCase.status === 'CLOSED' ? 'بسته شده' : selectedCase.status}
              </span>
            </div>
            <div>
              <span className="text-text-muted">اولویت:</span>
              <span className="mr-2 font-medium text-text-primary">{selectedCase.priority || '-'}</span>
            </div>
          </div>
          {selectedCase.description && (
            <div className="mt-4">
              <span className="text-xs text-text-muted">شرح</span>
              <p className="text-sm text-text-secondary mt-1">{selectedCase.description}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">وظایف</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">وظیفه‌ای یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between border border-border-default rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {task.status === 'DONE' ? <CheckCircle className="h-5 w-5 text-feedback-success" /> :
                     task.status === 'IN_PROGRESS' ? <Clock className="h-5 w-5 text-feedback-warning" /> :
                     <XCircle className="h-5 w-5 text-text-muted" />}
                    <div>
                      <p className="text-sm font-medium text-text-primary">{task.title || task.description}</p>
                      <p className="text-xs text-text-muted">{task.dueDate || ''}</p>
                    </div>
                  </div>
                  {task.status !== 'DONE' && (
                    <button
                      onClick={() => handleUpdateTask(task.id, 'DONE')}
                      disabled={actionLoading}
                      className="px-2 py-1 text-xs bg-feedback-success text-text-on-brand rounded hover:opacity-90 disabled:opacity-50"
                    >
                      انجام شد
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {showCloseModal && (
          <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center z-50">
            <div className="bg-bg-raised rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">بستن پرونده وکالت</h3>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="دلیل بستن پرونده..."
                className="w-full border border-border-default rounded-md p-2 text-sm"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowCloseModal(false); setCloseReason(''); }}
                  className="px-3 py-1.5 text-sm text-text-muted hover:bg-bg-base rounded"
                >
                  انصراف
                </button>
                <button
                  onClick={handleCloseCase}
                  disabled={actionLoading || !closeReason.trim()}
                  className="px-3 py-1.5 text-sm bg-feedback-error text-text-on-brand rounded hover:opacity-90 disabled:opacity-50"
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
      <h1 className="text-2xl font-bold text-text-primary">وکالت بیمه‌ای</h1>
      {cases.length === 0 ? (
        <Card className="p-6 text-center text-text-muted">
          <Shield className="mx-auto mb-2 h-10 w-10 opacity-50" />
          پرونده وکالتی یافت نشد
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-base">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">خسارت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">بیمه‌گذار</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">اولویت</th>
              </tr>
            </thead>
            <tbody className="bg-bg-raised divide-y divide-border-default">
              {cases.map((c) => (
                <tr key={c.id} onClick={() => handleSelectCase(c)} className="cursor-pointer hover:bg-bg-base">
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{c.caseNumber || c.id}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{c.claimNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{c.customerName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      c.status === 'OPEN' ? 'bg-feedback-success-subtle text-feedback-success' :
                      c.status === 'CLOSED' ? 'bg-bg-base text-text-primary' :
                      'bg-feedback-warning-subtle text-feedback-warning'
                    }`}>
                      {c.status === 'OPEN' ? 'باز' : c.status === 'CLOSED' ? 'بسته شده' : c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{c.priority || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
