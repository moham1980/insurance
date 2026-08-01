import * as React from 'react';
import { Handshake, Plus, Building2 } from 'lucide-react';
import { Card, Table, TableRow, TableCell, StatusBadge, PageHeader, EmptyState, Button, Loading } from './ui';
import { mockAgreements } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

export function AgreementsPage() {
  const [agreements, setAgreements] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);

  React.useEffect(() => {
    brokerApi.listAgreements()
      .then(r => setAgreements(r.data?.rows || r.data || []))
      .catch(() => { setAgreements(mockAgreements); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="قراردادها"
        subtitle="مدیریت قراردادهای کارگزاری با بیمه‌گران"
        action={
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            قرارداد جدید
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : agreements.length === 0 ? (
        <EmptyState icon={Handshake} title="قراردادی یافت نشد" description="برای شروع یک قرارداد جدید ایجاد کنید" />
      ) : (
        <Table headers={['شناسه', 'بیمه‌گر', 'خط بیمه', 'نرخ پورسانت', 'وضعیت', 'تاریخ شروع', 'تاریخ پایان']}>
          {agreements.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium text-text-primary">{a.id}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-text-muted" />
                  {a.carrierName}
                </div>
              </TableCell>
              <TableCell>{a.productLine}</TableCell>
              <TableCell>
                <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 text-sm font-medium text-brand-primary">{a.commissionRate}</span>
              </TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell className="text-text-muted">{a.startDate}</TableCell>
              <TableCell className="text-text-muted">{a.endDate}</TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      {showCreate && (
        <CreateAgreementModal onClose={() => setShowCreate(false)} onCreate={(a) => { setAgreements([a, ...agreements]); setShowCreate(false); }} />
      )}
    </div>
  );
}

function CreateAgreementModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: any) => void }) {
  const [carrierName, setCarrierName] = React.useState('');
  const [productLine, setProductLine] = React.useState('');
  const [commissionRate, setCommissionRate] = React.useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-bg-raised p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">قرارداد جدید</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">نام بیمه‌گر</label>
            <input
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="مثلاً: بیمه ایران"
              className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">خط بیمه</label>
            <input
              value={productLine}
              onChange={(e) => setProductLine(e.target.value)}
              placeholder="مثلاً: ثالثی"
              className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">نرخ پورسانت (%)</label>
            <input
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="مثلاً: 18%"
              className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button
            onClick={() => onCreate({
              id: `AG-${String(Date.now()).slice(-3)}`,
              carrierName: carrierName || 'بیمه جدید',
              productLine: productLine || '—',
              commissionRate: commissionRate || '—',
              status: 'در مذاکره',
              startDate: new Date().toLocaleDateString('fa-IR'),
              endDate: '—',
            })}
          >
            ایجاد
          </Button>
        </div>
      </div>
    </div>
  );
}
