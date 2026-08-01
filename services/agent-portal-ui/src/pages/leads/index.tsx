import { useState, useEffect } from 'react';
import { Phone, Mail, Calendar, Loader2, User, Target } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { agentPortalAPI } from '../../lib/api';
import { mockLeads } from '../../lib/mock-data';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  productInterest: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  notes?: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const data = await agentPortalAPI.getLeads();
        setLeads(data || []);
      } catch {
        setLeads(mockLeads);
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
      <div className="rounded-xl border border-feedback-error/30 bg-feedback-error-subtle p-4 text-feedback-error">
        <p className="font-semibold">خطا در بارگذاری داده</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    new: 'جدید',
    contacted: 'تماس گرفته‌شده',
    qualified: 'واجد شرایط',
    converted: 'تبدیل‌شده',
    lost: 'از دست رفته',
  };

  const statusColors: Record<string, string> = {
    new: 'bg-brand-primary-subtle text-brand-primary',
    contacted: 'bg-feedback-warning-subtle text-feedback-warning',
    qualified: 'bg-brand-secondary-subtle text-brand-secondary',
    converted: 'bg-feedback-success-subtle text-feedback-success',
    lost: 'bg-bg-base text-text-primary',
  };

  const priorityColors: Record<string, string> = {
    high: 'text-feedback-error',
    medium: 'text-feedback-warning',
    low: 'text-feedback-success',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">مدیریت سرنخ‌ها</h1>

      {leads.length === 0 ? (
        <Card className="p-8 text-center text-text-muted">
          <Target className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="font-semibold text-text-primary">سرنخی یافت نشد</p>
          <p className="mt-1 text-sm">هنوز هیچ سرنخی ثبت نشده یا همه به مشتری تبدیل شده‌اند.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{lead.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(lead.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                    {lead.notes && <p className="mt-2 text-xs text-text-muted">{lead.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[lead.status]}`}>{statusLabels[lead.status]}</span>
                  <span className={`text-xs font-medium ${priorityColors[lead.priority]}`}>
                    اولویت: {lead.priority === 'high' ? 'بالا' : lead.priority === 'medium' ? 'متوسط' : 'پایین'}
                  </span>
                  <span className="text-xs text-text-muted">{lead.productInterest}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
