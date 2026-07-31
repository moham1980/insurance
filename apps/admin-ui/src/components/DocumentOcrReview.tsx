import React, { useState } from 'react';

interface OcrReviewResult {
  redaction?: {
    redactedText: string;
    spans: Array<{ type: string; start: number; end: number; replacement: string }>;
    redacted: boolean;
  };
  classification?: {
    documentType: string;
    confidence: number;
    source: string;
  };
  fields?: Record<string, any>;
  confirmation?: {
    confirmationStatus: string;
    confidence: number;
    missingFields: string[];
  };
}

export const DocumentOcrReview: React.FC = () => {
  const [documentId, setDocumentId] = useState('');
  const [result, setResult] = useState<OcrReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  const authHeaders = (): Record<string, string> => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const callOcr = async (action: 'redact' | 'classify' | 'confirm') => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${baseUrl}/document-ai/documents/${documentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() } as Record<string, string>,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Request failed');
      setResult((prev) => ({ ...prev, [action]: json.data }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">بازبینی OCR اسناد</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          placeholder="شناسه سند"
          className="border border-gray-300 rounded px-3 py-2 w-64"
        />
        <button onClick={() => callOcr('redact')} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">
          Redact
        </button>
        <button onClick={() => callOcr('classify')} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
          Classify
        </button>
        <button onClick={() => callOcr('confirm')} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">
          Confirm
        </button>
      </div>

      {loading && <p>در حال پردازش...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="space-y-4 mt-4">
          {result.redaction && (
            <div className="border rounded p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">Redaction ({result.redaction.spans.length})</h3>
              <pre className="text-sm overflow-auto bg-white p-2 border rounded">{result.redaction.redactedText}</pre>
            </div>
          )}
          {result.classification && (
            <div className="border rounded p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">Classification</h3>
              <p className="text-sm">Type: {result.classification.documentType}</p>
              <p className="text-sm">Confidence: {Math.round(result.classification.confidence * 100)}%</p>
            </div>
          )}
          {result.confirmation && (
            <div className="border rounded p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">Field Confirmation</h3>
              <p className="text-sm">Status: {result.confirmation.confirmationStatus}</p>
              <p className="text-sm">Confidence: {Math.round(result.confirmation.confidence * 100)}%</p>
              {result.confirmation.missingFields.length > 0 && (
                <p className="text-sm text-amber-600">Missing: {result.confirmation.missingFields.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
