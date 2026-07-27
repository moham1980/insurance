import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileText, Loader2 } from 'lucide-react';
import { agentPortalAPI } from '../../lib/api';

interface PortfolioItem {
  product: string;
  count: number;
  premium: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const data = await agentPortalAPI.getPolicyPortfolio();
        setPortfolio(data || []);
      } catch (err) {
        setError('خطا در بارگذاری پورتفولیو');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="mr-2 text-sm text-text-secondary">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border-error bg-bg-error p-4 text-text-error">
        <p className="font-semibold">خطا در بارگذاری داده</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const totalPolicies = portfolio.reduce((sum, p) => sum + p.count, 0);
  const totalPremium = portfolio.reduce((sum, p) => sum + p.premium, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">پورتفولیو بیمه‌نامه‌ها</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border-default bg-bg-raised p-4">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">تعداد بیمه‌نامه به محصول</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={portfolio} dataKey="count" nameKey="product" cx="50%" cy="50%" outerRadius={100} label>
                {portfolio.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-raised p-4">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">پریمیوم به محصول</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={portfolio} dataKey="premium" nameKey="product" cx="50%" cy="50%" outerRadius={100} label>
                {portfolio.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toLocaleString('fa-IR')} تومان`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-bg-raised p-4">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">جزئیات پورتفولیو</h2>
        {portfolio.length === 0 ? (
          <p className="text-sm text-text-muted">هیچ بیمه‌نامه‌ای یافت نشد</p>
        ) : (
          <table className="min-w-full divide-y divide-border-default">
            <thead>
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">محصول</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تعداد</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">پریمیوم کل</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">سهم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {portfolio.map((item) => (
                <tr key={item.product}>
                  <td className="px-4 py-2 text-sm text-text-primary">{item.product}</td>
                  <td className="px-4 py-2 text-sm text-text-secondary">{item.count.toLocaleString('fa-IR')}</td>
                  <td className="px-4 py-2 text-sm text-text-secondary">{item.premium.toLocaleString('fa-IR')} تومان</td>
                  <td className="px-4 py-2 text-sm text-text-secondary">{((item.count / totalPolicies) * 100).toFixed(1)}٪</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
          <FileText className="h-4 w-4" />
          <span>کل: {totalPolicies.toLocaleString('fa-IR')} بیمه‌نامه / {totalPremium.toLocaleString('fa-IR')} تومان پریمیوم</span>
        </div>
      </div>
    </div>
  );
}
