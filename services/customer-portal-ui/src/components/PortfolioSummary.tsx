'use client';

import { useState, useEffect, useCallback } from 'react';
import { customer360Api } from '../lib/api';
import { Wallet, FileText, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

interface PortfolioData {
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalCoverage: number;
  totalClaims: number;
  openClaims: number;
  totalClaimAmount: number;
  paidClaims: number;
  outstandingClaims: number;
  totalPayments: number;
  netPosition: number;
  assets: {
    vehicles: any[];
    properties: any[];
    lifeSumAssured: number;
  };
  riskMetrics: {
    overallRiskScore: number;
    riskCategory: string;
    amlStatus: string;
    kycStatus: string;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fa-IR', { style: 'currency', currency: 'IRR', maximumFractionDigits: 0 }).format(value);

export default function PortfolioSummary({ customerId }: { customerId: string }) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await customer360Api.getPortfolio(customerId);
      setPortfolio(response?.data || response);
    } catch (err: any) {
      setError(err.message || 'خطا در دریافت پرتفوی');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  if (loading && !portfolio) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin inline-block mb-2" />
        <p>در حال بارگذاری پرتفوی...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-red-700 text-sm flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  if (!portfolio) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">خلاصه پرتفوی</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-indigo-50 rounded-lg">
          <p className="text-xs text-gray-600">بیمه‌نامه‌ها</p>
          <p className="text-xl font-bold text-indigo-900">{portfolio.totalPolicies}</p>
          <p className="text-xs text-indigo-700">فعال: {portfolio.activePolicies}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-600">حق‌بیمه کل</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(portfolio.totalPremium)}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-xs text-gray-600">خسارت باز</p>
          <p className="text-xl font-bold text-amber-900">{portfolio.openClaims}</p>
          <p className="text-xs text-amber-700">کل: {portfolio.totalClaims}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600">موقعیت خالص</p>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(portfolio.netPosition)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-gray-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">ادعاها</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>مبلغ کل ادعا: {formatCurrency(portfolio.totalClaimAmount)}</li>
            <li>پرداخت‌شده: {formatCurrency(portfolio.paidClaims)}</li>
            <li>باقیمانده: {formatCurrency(portfolio.outstandingClaims)}</li>
          </ul>
        </div>

        <div className="p-4 border border-gray-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">ریسک و وضعیت</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>ریسک: {portfolio.riskMetrics.riskCategory} ({portfolio.riskMetrics.overallRiskScore})</li>
            <li>AML: {portfolio.riskMetrics.amlStatus}</li>
            <li>KYC: {portfolio.riskMetrics.kycStatus}</li>
          </ul>
        </div>
      </div>

      {portfolio.assets.vehicles.length > 0 && (
        <div className="mt-4 p-4 border border-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">وسایل نقلیه</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {portfolio.assets.vehicles.map((v, i) => (
              <li key={i}>{v.make} {v.model} {v.year} - {v.plateNumber}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
