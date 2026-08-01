import { useState, useEffect, useCallback } from 'react';
import { agentPortalAPI } from '../lib/api';
import { Sparkles, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface NbaAction {
  logId?: string;
  action: string;
  description: string;
  channel?: string;
  urgency?: 'low' | 'medium' | 'high';
  confidence?: number;
  payload?: Record<string, any>;
  status?: string;
  executedAt?: string;
  optedOutAt?: string;
}

interface NbaActionsPanelProps {
  contextType: string;
  resourceId: string;
  title?: string;
}

export default function NbaActionsPanel({ contextType, resourceId, title = 'اقدامات پیشنهادی' }: NbaActionsPanelProps) {
  const [actions, setActions] = useState<NbaAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadActions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await agentPortalAPI.listNbaActions({ contextType, resourceId });
      const rows = Array.isArray(data) ? data : data?.rows || [];
      setActions(rows);
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت اقدامات');
    } finally {
      setLoading(false);
    }
  }, [contextType, resourceId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      await agentPortalAPI.generateNbaActions({ contextType, resourceId });
      await loadActions();
    } catch (err: any) {
      setError(err.message || 'خطا در تولید اقدامات');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (logId?: string) => {
    if (!logId) return;
    try {
      setLoading(true);
      await agentPortalAPI.executeNbaAction(logId);
      await loadActions();
    } catch (err: any) {
      setError(err.message || 'خطا در اجرای اقدام');
    } finally {
      setLoading(false);
    }
  };

  const handleOptOut = async (logId?: string, reason = 'توسط نماینده رد شد') => {
    if (!logId) return;
    try {
      setLoading(true);
      await agentPortalAPI.optOutNbaAction(logId, reason);
      await loadActions();
    } catch (err: any) {
      setError(err.message || 'خطا در رد اقدام');
    } finally {
      setLoading(false);
    }
  };

  const urgencyClass = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-feedback-error-subtle text-feedback-error';
      case 'medium': return 'bg-feedback-warning-subtle text-feedback-warning';
      default: return 'bg-brand-primary-subtle text-brand-primary';
    }
  };

  return (
    <div className="bg-bg-raised rounded-lg shadow-sm border border-border-default p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-on-brand bg-brand-primary rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          تولید اقدامات
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-feedback-error-subtle text-feedback-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {actions.length === 0 && !loading ? (
        <div className="text-center py-8 text-text-muted text-sm">اقداماتی پیشنهاد نشده است.</div>
      ) : (
        <ul className="space-y-3">
          {actions.map((action, index) => (
            <li key={action.logId || index} className="flex items-start justify-between p-4 rounded-lg border border-border-default bg-bg-base">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-text-primary">{action.action}</span>
                  {action.urgency && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${urgencyClass(action.urgency)}`}>
                      {action.urgency === 'high' ? 'بالا' : action.urgency === 'medium' ? 'متوسط' : 'پایین'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-muted mb-2">{action.description}</p>
                {typeof action.confidence === 'number' && (
                  <div className="text-xs text-text-muted">
                    اطمینان: {Math.round(action.confidence * 100)}%
                  </div>
                )}
                {action.status && (
                  <div className="text-xs mt-1 text-text-muted">وضعیت: {action.status}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 ms-4">
                {action.status === 'offered' && (
                  <>
                    <button
                      onClick={() => handleExecute(action.logId)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-on-brand bg-feedback-success rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                      <CheckCircle className="w-3 h-3" /> اجرا
                    </button>
                    <button
                      onClick={() => handleOptOut(action.logId)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-raised border border-border-default rounded-md hover:bg-bg-base disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" /> رد
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
