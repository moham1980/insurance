import * as React from 'react';
import { Layers, FileCheck, User, Calendar } from 'lucide-react';
import { Table, TableRow, TableCell, StatusBadge, PageHeader, EmptyState, Card, Loading } from './ui';
import { mockPlacements, formatToman } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

export function PlacementsPage() {
  const [placements, setPlacements] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    brokerApi.listPlacements()
      .then(r => setPlacements(r.data?.rows || r.data || []))
      .catch(() => { setPlacements(mockPlacements); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="صدور بیمه‌نامه" subtitle="مدیریت بیمه‌نامه‌های صادر شده" />

      {loading ? (
        <Loading />
      ) : placements.length === 0 ? (
        <EmptyState icon={Layers} title="صدوری یافت نشد" />
      ) : (
        <React.Fragment>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-success-subtle">
                  <FileCheck className="h-6 w-6 text-feedback-success" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">صادر شده</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {new Intl.NumberFormat('fa-IR').format(placements.filter((p) => p.status === 'صادر شده').length)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-feedback-info-subtle">
                  <Layers className="h-6 w-6 text-feedback-info" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">در حال صدور</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {new Intl.NumberFormat('fa-IR').format(placements.filter((p) => p.status === 'در حال صدور').length)}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10">
                  <Calendar className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">کل حق بیمه</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {formatToman(placements.reduce((sum, p) => sum + p.premium, 0))}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Table headers={['شماره صدور', 'مشتری', 'بیمه‌گر', 'حق بیمه', 'وضعیت', 'تاریخ']}>
            {placements.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-text-primary">{p.placementNumber}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-text-muted" />
                    {p.customerName}
                  </div>
                </TableCell>
                <TableCell>{p.carrierName}</TableCell>
                <TableCell className="font-medium">{formatToman(p.premium)}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-text-muted">{p.createdAt}</TableCell>
              </TableRow>
            ))}
          </Table>
        </React.Fragment>
      )}
    </div>
  );
}
