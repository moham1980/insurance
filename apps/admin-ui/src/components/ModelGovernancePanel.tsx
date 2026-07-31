import React, { useState, useEffect } from 'react';

interface ModelCard {
  id: string;
  modelId: string;
  modelName: string;
  status: 'draft' | 'approved' | 'deprecated' | 'archived';
  biasRiskLevel: 'low' | 'medium' | 'high';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

interface GovernanceReport {
  modelCards: ModelCard[];
  total: number;
  invocationsSummary: {
    total: number;
    failed: number;
    rejected: number;
  };
}

export const ModelGovernancePanel: React.FC = () => {
  const [report, setReport] = useState<GovernanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState('');

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  const authHeaders = (): Record<string, string> => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const res = await fetch(`${baseUrl}/model-switchboard/governance/report${query}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Request failed');
      setReport(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const approveCard = async (id: string) => {
    try {
      const res = await fetch(`${baseUrl}/model-switchboard/model-cards/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() } as Record<string, string>,
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Approve failed');
      await fetchReport();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">حکمرانی مدل‌های AI</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="Tenant ID (optional)"
          className="border border-gray-300 rounded px-3 py-2 w-64"
        />
        <button onClick={fetchReport} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
          بارگذاری
        </button>
      </div>

      {loading && <p>در حال بارگذاری...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {report && (
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 border rounded">
              <p className="text-sm text-gray-600">فراخوانی‌ها</p>
              <p className="text-2xl font-bold">{report.invocationsSummary.total}</p>
            </div>
            <div className="p-4 bg-red-50 border rounded">
              <p className="text-sm text-gray-600">خطا</p>
              <p className="text-2xl font-bold text-red-700">{report.invocationsSummary.failed}</p>
            </div>
            <div className="p-4 bg-amber-50 border rounded">
              <p className="text-sm text-gray-600">رد حکمرانی</p>
              <p className="text-2xl font-bold text-amber-700">{report.invocationsSummary.rejected}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Model Cards ({report.total})</h3>
            {report.modelCards.length === 0 ? (
              <p className="text-gray-500">کارتی یافت نشد.</p>
            ) : (
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left text-sm">Model</th>
                    <th className="border p-2 text-left text-sm">Status</th>
                    <th className="border p-2 text-left text-sm">Risk</th>
                    <th className="border p-2 text-left text-sm">Approved By</th>
                    <th className="border p-2 text-left text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.modelCards.map((card) => (
                    <tr key={card.id}>
                      <td className="border p-2 text-sm">{card.modelName}</td>
                      <td className="border p-2 text-sm">{card.status}</td>
                      <td className="border p-2 text-sm">{card.biasRiskLevel}</td>
                      <td className="border p-2 text-sm">{card.approvedBy || '-'}</td>
                      <td className="border p-2 text-sm">
                        {card.status === 'draft' && (
                          <button
                            onClick={() => approveCard(card.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                          >
                            تایید
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
