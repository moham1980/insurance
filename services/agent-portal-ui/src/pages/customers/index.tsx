import { NextBestAction, PolicyCard } from '@insurance/design-system';
import { User, Phone, Mail, Calendar, MapPin, Shield, FileText, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

interface Customer {
  name: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  joinDate: string;
  policies: Array<{
    policyNumber: string;
    type: string;
    status: 'active' | 'expired' | 'pending';
    startDate: string;
    endDate: string;
    premium: string;
  }>;
  nextBestActions: Array<{
    title: string;
    description: string;
    actionLabel: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function CustomersPage() {
  const { data, error, isLoading } = useSWR<Customer>('/api/agent/customers/360', fetcher);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="mr-2 text-sm text-text-secondary">در حال بارگذاری اطلاعات مشتری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border-error bg-bg-error p-4 text-text-error">
        <p className="font-semibold">خطا در بارگذاری داده</p>
        <p className="mt-1 text-sm">{axios.isAxiosError(error) ? error.message : 'ارتباط با سرور برقرار نشد.'}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border-default bg-bg-raised p-8 text-center text-text-muted">
        <User className="mx-auto mb-2 h-10 w-10 opacity-50" />
        <p className="font-semibold text-text-primary">اطلاعات مشتری یافت نشد</p>
        <p className="mt-1 text-sm">مشتری انتخاب نشده یا دسترسی وجود ندارد.</p>
      </div>
    );
  }

  const customer = data;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">مشتری ۳۶۰°</h1>

      {/* Profile Header */}
      <div className="rounded-xl border border-border-default bg-bg-raised p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <User className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text-primary">{customer.name}</h2>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-text-secondary sm:grid-cols-2">
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-text-muted" />{customer.phone}</span>
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-text-muted" />{customer.email}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-text-muted" />{customer.address}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-text-muted" />از {customer.joinDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NBA Actions */}
      {customer.nextBestActions && customer.nextBestActions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">اقدامات پیشنهادی</h3>
          {customer.nextBestActions.map((action, idx) => (
            <NextBestAction
              key={idx}
              title={action.title}
              description={action.description}
              actionLabel={action.actionLabel}
              priority={action.priority}
            />
          ))}
        </div>
      )}

      {/* Policies */}
      {customer.policies && customer.policies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">بیمه‌نامه‌ها</h3>
          {customer.policies.map((p) => (
            <PolicyCard key={p.policyNumber} {...p} />
          ))}
        </div>
      )}
    </div>
  );
}
