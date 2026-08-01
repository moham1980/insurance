import * as React from 'react';
import { Wallet, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Table, TableRow, TableCell, StatusBadge, PageHeader, Card, Loading } from './ui';
import { CommissionLedgerCard, type CommissionLine } from '@insurance/design-system';
import { mockCommissions, formatToman } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

const mockLedgerLines: CommissionLine[] = [
  { id: 'ln-1', policyNumber: 'POL-IRN-001', policyholder: 'علی محمدی', amountMinor: 4500000, currency: 'IRR', type: 'paid', period: '۱۴۰۳/۰۴', paidAt: '۱۴۰۳/۰۵/۰۱' },
  { id: 'ln-2', policyNumber: 'POL-ASI-002', policyholder: 'مریم احمدی', amountMinor: 3200000, currency: 'IRR', type: 'accrual', period: '۱۴۰۳/۰۴' },
  { id: 'ln-3', policyNumber: 'POL-PAS-003', policyholder: 'حسین رضایی', amountMinor: 1800000, currency: 'IRR', type: 'pending', period: '۱۴۰۳/۰۴' },
  { id: 'ln-4', policyNumber: 'POL-IRN-004', policyholder: 'فاطمه کریمی', amountMinor: 5200000, currency: 'IRR', type: 'paid', period: '۱۴۰۳/۰۳', paidAt: '۱۴۰۳/۰۴/۰۱' },
  { id: 'ln-5', policyNumber: 'POL-ALB-005', policyholder: 'رضا صادقی', amountMinor: 2100000, currency: 'IRR', type: 'clawback', period: '۱۴۰۳/۰۳' },
];

const mockLedgerBalance = 12500000;
const mockLedgerPending = 6800000;
const mockLedgerPaidYtd = 28900000;

export function CommissionsPage() {
  const [commissions, setCommissions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    brokerApi.listCommissions()
      .then(r => setCommissions(r.data?.rows || r.data || []))
      .catch(() => { setCommissions(mockCommissions); })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = commissions.filter((c) => c.status === 'پرداخت شده').reduce((sum, c) => sum + c.amount, 0);
  const totalPending = commissions.filter((c) => c.status === 'در انتظار').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="پورسانت‌ها" subtitle="مدیریت پورسانت‌های کارگزاری" />

      {loading ? (
        <Loading />
      ) : (
        <React.Fragment>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted">کل پورسانت پرداخت شده</p>
                    <p className="mt-1 text-2xl font-bold text-feedback-success">{formatToman(totalPaid)}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-success-subtle">
                    <CheckCircle className="h-6 w-6 text-feedback-success" />
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-l from-feedback-success to-brand-secondary" />
            </Card>
            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted">در انتظار پرداخت</p>
                    <p className="mt-1 text-2xl font-bold text-feedback-warning">{formatToman(totalPending)}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-warning-subtle">
                    <Clock className="h-6 w-6 text-feedback-warning" />
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-l from-feedback-warning to-brand-accent" />
            </Card>
            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted">کل پورسانت</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{formatToman(totalPaid + totalPending)}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
                    <Wallet className="h-6 w-6 text-brand-primary" />
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-l from-brand-primary to-brand-secondary" />
            </Card>
          </div>

          <CommissionLedgerCard
            balanceMinor={mockLedgerBalance}
            currency="IRR"
            lines={mockLedgerLines}
            pendingMinor={mockLedgerPending}
            paidYtdMinor={mockLedgerPaidYtd}
          />

          <Table headers={['شماره بیمه‌نامه', 'بیمه‌گر', 'حق بیمه', 'نرخ', 'مبلغ پورسانت', 'وضعیت', 'سررسید']}>
            {commissions.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-text-primary">{c.policyNumber}</TableCell>
                <TableCell>{c.carrierName}</TableCell>
                <TableCell>{formatToman(c.premium)}</TableCell>
                <TableCell>
                  <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 text-sm font-medium text-brand-primary">{c.rate}</span>
                </TableCell>
                <TableCell className="font-semibold text-text-primary">{formatToman(c.amount)}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-text-muted">{c.dueDate}</TableCell>
              </TableRow>
            ))}
          </Table>
        </React.Fragment>
      )}
    </div>
  );
}
