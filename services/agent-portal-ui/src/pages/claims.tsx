import { useState, useEffect } from 'react';
import { FileText, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { agentPortalAPI } from '../lib/api';
import { mockClaims } from '../lib/mock-data';

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
      } catch {
        setClaims(mockClaims);
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
        <h1 className="text-2xl font-bold text-text-primary">خسارت‌ها</h1>
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
        <h1 className="text-2xl font-bold text-text-primary">خسارت‌ها</h1>
        <div className="flex items-center gap-2 bg-feedback-error-subtle border border-feedback-error/30 text-feedback-error px-4 py-3 rounded">
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
          className="flex items-center text-sm text-text-muted hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4 ml-1" />
          بازگشت به لیست
        </button>
        <h1 className="text-2xl font-bold text-text-primary">جزئیات خسارت</h1>
        {detailLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        ) : (
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-text-muted">شماره خسارت</label>
                <p className="text-sm font-medium text-text-primary">{selectedClaim.claimNumber || selectedClaim.id}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted">بیمه‌نامه</label>
                <p className="text-sm font-medium text-text-primary">{selectedClaim.policyNumber || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted">بیمه‌گذار</label>
                <p className="text-sm font-medium text-text-primary">{selectedClaim.customerName || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted">نوع خسارت</label>
                <p className="text-sm font-medium text-text-primary">{selectedClaim.claimType || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted">وضعیت</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  selectedClaim.status === 'OPEN' ? 'bg-brand-primary-subtle text-brand-primary' :
                  selectedClaim.status === 'APPROVED' ? 'bg-feedback-success-subtle text-feedback-success' :
                  selectedClaim.status === 'REJECTED' ? 'bg-feedback-error-subtle text-feedback-error' :
                  'bg-feedback-warning-subtle text-feedback-warning'
                }`}>
                  {selectedClaim.status === 'OPEN' ? 'باز' :
                   selectedClaim.status === 'APPROVED' ? 'تأیید شده' :
                   selectedClaim.status === 'REJECTED' ? 'رد شده' :
                   selectedClaim.status === 'UNDER_REVIEW' ? 'در حال بررسی' : selectedClaim.status}
                </span>
              </div>
              <div>
                <label className="text-xs text-text-muted">مبلغ خسارت</label>
                <p className="text-sm font-medium text-text-primary">
                  {selectedClaim.claimAmount ? `${Number(selectedClaim.claimAmount).toLocaleString('fa-IR')} تومان` : '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-muted">تاریخ اعلام</label>
                <p className="text-sm font-medium text-text-primary">{selectedClaim.reportedDate || selectedClaim.createdAt || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted">تاریخ وقوع</label>
                <p className="text-sm font-medium text-text-primary">{selectedClaim.lossDate || '-'}</p>
              </div>
            </div>
            {selectedClaim.description && (
              <div>
                <label className="text-xs text-text-muted">شرح خسارت</label>
                <p className="text-sm text-text-secondary mt-1">{selectedClaim.description}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">خسارت‌ها</h1>
      {claims.length === 0 ? (
        <Card className="p-6 text-center text-text-muted">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
          هیچ خسارتی یافت نشد
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="min-w-full divide-y divide-border-default">
            <thead className="bg-bg-base">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">شماره</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">بیمه‌نامه</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">بیمه‌گذار</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">نوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">وضعیت</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">مبلغ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">تاریخ</th>
              </tr>
            </thead>
            <tbody className="bg-bg-raised divide-y divide-border-default">
              {claims.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => handleSelectClaim(claim.id)}
                  className="cursor-pointer hover:bg-bg-base"
                >
                  <td className="px-6 py-4 text-sm font-medium text-text-primary">{claim.claimNumber || claim.id}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{claim.policyNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{claim.customerName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{claim.claimType || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      claim.status === 'OPEN' ? 'bg-brand-primary-subtle text-brand-primary' :
                      claim.status === 'APPROVED' ? 'bg-feedback-success-subtle text-feedback-success' :
                      claim.status === 'REJECTED' ? 'bg-feedback-error-subtle text-feedback-error' :
                      'bg-feedback-warning-subtle text-feedback-warning'
                    }`}>
                      {claim.status === 'OPEN' ? 'باز' :
                       claim.status === 'APPROVED' ? 'تأیید شده' :
                       claim.status === 'REJECTED' ? 'رد شده' :
                       claim.status === 'UNDER_REVIEW' ? 'در حال بررسی' : claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {claim.claimAmount ? `${Number(claim.claimAmount).toLocaleString('fa-IR')} تومان` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{claim.reportedDate || claim.createdAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
