import * as React from 'react';
import { Package, Plus, Building2, Tag } from 'lucide-react';
import { Table, TableRow, TableCell, StatusBadge, PageHeader, EmptyState, Card, Button, Loading } from './ui';
import { mockOfferings } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

export function OfferingsPage() {
  const [offerings, setOfferings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    brokerApi.listOfferings()
      .then(r => setOfferings(r.data?.rows || r.data || []))
      .catch(() => { setOfferings(mockOfferings); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="محصولات و پوشش‌ها"
        subtitle="لیست محصولات بیمه‌ای قابل ارائه به مشتریان"
        action={
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            محصول جدید
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : offerings.length === 0 ? (
        <EmptyState icon={Package} title="محصولی یافت نشد" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((o) => (
            <Card key={o.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{o.productName}</h3>
                    <p className="text-xs text-text-muted">{o.id}</p>
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Building2 className="h-4 w-4 text-text-muted" />
                  <span>{o.carrierName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Tag className="h-4 w-4 text-text-muted" />
                  <span>{o.premiumRange}</span>
                </div>
              </div>
              <Button variant="ghost" fullWidth className="mt-4">
                ثبت درخواست
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
