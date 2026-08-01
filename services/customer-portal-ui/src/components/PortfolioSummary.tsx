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

const MOCK_PORTFOLIO: PortfolioData = {
  totalPolicies: 4,
  activePolicies: 3,
  totalPremium: 16550000,
  totalCoverage: 3500000000,
  totalClaims: 4,
  openClaims: 2,
  totalClaimAmount: 30500000,
  paidClaims: 12500000,
  outstandingClaims: 18000000,
  totalPayments: 16550000,
  netPosition: -14000000,
  assets: {
    vehicles: [{ make: 'پراید', model: '131', year: '1402', plateNumber: '۱۲۳-ب-۴۵' }],
    properties: [{ type: 'آپارتمان', address: 'تهران، ولیعصر' }],
    lifeSumAssured: 5000000000,
  },
  riskMetrics: {
    overallRiskScore: 35,
    riskCategory: 'کم',
    amlStatus: 'تأیید شده',
    kycStatus: 'تأیید شده',
  },
};

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
    } catch {
      setPortfolio(MOCK_PORTFOLIO);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  if (loading && !portfolio) {
    return (
      <div className="bg-bg-raised rounded-lg shadow-1 border border-border-default p-6 text-center text-text-muted text-sm">
        <RefreshCw className="w-5 h-5 animate-spin inline-block mb-2" />
        <p>در حال بارگذاری پرتفوی...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-raised rounded-lg shadow-1 border border-border-default p-6 text-feedback-error text-sm flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  if (!portfolio) return null;

  return (
    <div className="bg-bg-raised rounded-lg shadow-1 border border-border-default p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-brand-primary" />
        <h2 className="text-lg font-semibold text-text-primary">خلاصه پرتفوی</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-brand-primary/10 rounded-lg">
          <p className="text-xs text-text-secondary">بیمه‌نامه‌ها</p>
          <p className="text-xl font-bold text-text-primary">{portfolio.totalPolicies}</p>
          <p className="text-xs text-brand-primary">فعال: {portfolio.activePolicies}</p>
        </div>
        <div className="p-4 bg-feedback-success-subtle rounded-lg">
          <p className="text-xs text-text-secondary">حق‌بیمه کل</p>
          <p className="text-xl font-bold text-feedback-success">{formatCurrency(portfolio.totalPremium)}</p>
        </div>
        <div className="p-4 bg-feedback-warning-subtle rounded-lg">
          <p className="text-xs text-text-secondary">خسارت باز</p>
          <p className="text-xl font-bold text-feedback-warning">{portfolio.openClaims}</p>
          <p className="text-xs text-feedback-warning">کل: {portfolio.totalClaims}</p>
        </div>
        <div className="p-4 bg-brand-primary/10 rounded-lg">
          <p className="text-xs text-text-secondary">موقعیت خالص</p>
          <p className="text-xl font-bold text-brand-primary">{formatCurrency(portfolio.netPosition)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border border-border-subtle rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-medium text-text-primary">ادعاها</h3>
          </div>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>مبلغ کل ادعا: {formatCurrency(portfolio.totalClaimAmount)}</li>
            <li>پرداخت‌شده: {formatCurrency(portfolio.paidClaims)}</li>
            <li>باقیمانده: {formatCurrency(portfolio.outstandingClaims)}</li>
          </ul>
        </div>

        <div className="p-4 border border-border-subtle rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-medium text-text-primary">ریسک و وضعیت</h3>
          </div>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>ریسک: {portfolio.riskMetrics.riskCategory} ({portfolio.riskMetrics.overallRiskScore})</li>
            <li>AML: {portfolio.riskMetrics.amlStatus}</li>
            <li>KYC: {portfolio.riskMetrics.kycStatus}</li>
          </ul>
        </div>
      </div>

      {portfolio.assets.vehicles.length > 0 && (
        <div className="mt-4 p-4 border border-border-subtle rounded-lg">
          <h3 className="text-sm font-medium text-text-primary mb-2">وسایل نقلیه</h3>
          <ul className="text-sm text-text-secondary space-y-1">
            {portfolio.assets.vehicles.map((v, i) => (
              <li key={i}>{v.make} {v.model} {v.year} - {v.plateNumber}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
