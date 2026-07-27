'use client';

import { useEffect, useState } from 'react';

interface ModelInventory {
  modelId: string;
  modelName: string;
  modelType: string;
  version: string;
  status: string;
  provider: string | null;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AiGovernancePage() {
  const [models, setModels] = useState<ModelInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/ai-governance/models');
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
        }
      } catch (err) {
        console.error('Failed to fetch AI governance data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'production':
        return 'bg-green-100 text-green-800';
      case 'review':
      case 'staging':
        return 'bg-yellow-100 text-yellow-800';
      case 'deprecated':
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AI Governance</h1>
        <button className="px-4 py-2 border rounded hover:bg-gray-50">+ New Model</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Total Models</div>
          <div className="text-2xl font-bold">{models.length}</div>
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Production Models</div>
          <div className="text-2xl font-bold">
            {models.filter(m => m.status === 'production').length}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Development Models</div>
          <div className="text-2xl font-bold">
            {models.filter(m => m.status === 'development').length}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Model Inventory</h2>
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-gray-500 bg-white">
          No models registered yet.
        </div>
      ) : (
        <div className="space-y-4">
          {models.map(model => (
            <div key={model.modelId} className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{model.modelName}</h3>
                <p className="text-sm text-gray-500">
                  {model.modelType} · v{model.version} · {model.provider || 'No provider'}
                </p>
                {model.description && (
                  <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(model.status)}`}>
                {model.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
