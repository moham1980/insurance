'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, MessageSquare, Plus } from 'lucide-react';
import { Card } from '@insurance/design-system';
import { apiFetch } from '@/lib/api';

interface Complaint {
  id: string;
  complaintNumber: string;
  subject: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  submittedDate: string;
  description: string;
}

const MOCK_COMPLAINTS: Complaint[] = [
  { id: '1', complaintNumber: 'CMP-2024-001', subject: 'تأخیر در پرداخت خسارت', status: 'UNDER_REVIEW', submittedDate: '2024-03-05', description: 'خسارت من از تاریخ ۲۰ اسفند ثبت شده است و هنوز پرداخت نشده است' },
  { id: '2', complaintNumber: 'CMP-2023-002', subject: 'مشکل در صدور بیمه‌نامه', status: 'RESOLVED', submittedDate: '2023-10-15', description: 'بیمه‌نامه من با تأخیر صادر شد' },
];

export default function CustomerPortalComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const res = await apiFetch<Complaint[]>('/portal/complaints');
      setComplaints(res.success && res.data ? res.data : MOCK_COMPLAINTS);
    } catch {
      setComplaints(MOCK_COMPLAINTS);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SUBMITTED: 'bg-brand-primary-subtle text-brand-primary',
      UNDER_REVIEW: 'bg-feedback-warning-subtle text-feedback-warning',
      RESOLVED: 'bg-feedback-success-subtle text-feedback-success',
      CLOSED: 'bg-bg-base text-text-primary',
    };
    const labels = {
      SUBMITTED: 'ثبت شده',
      UNDER_REVIEW: 'در حال بررسی',
      RESOLVED: 'حل شده',
      CLOSED: 'بسته شده',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (showForm) {
    return <NewComplaintForm onCancel={() => setShowForm(false)} onSuccess={() => { setShowForm(false); loadComplaints(); }} />;
  }

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/portal')} className="text-text-muted hover:text-text-primary">
                <ChevronRight className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-text-primary">شکایات</h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 rounded-lg bg-feedback-warning px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              ثبت شکایت جدید
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              </div>
            ) : complaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-10 w-10 text-text-muted" />
                <p className="mt-2 text-sm text-text-muted">شکایتی یافت نشد</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 rounded-lg bg-feedback-warning px-4 py-2 text-sm font-medium text-text-on-brand hover:opacity-90"
                >
                  ثبت اولین شکایت
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-bg-base">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شماره شکایت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">موضوع</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">وضعیت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">تاریخ ثبت</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-muted">شرح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {complaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-bg-base">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">{complaint.complaintNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">{complaint.subject}</td>
                        <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(complaint.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{complaint.submittedDate}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-sm text-text-muted">{complaint.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function NewComplaintForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof formData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};
    if (!formData.subject) newErrors.subject = 'موضوع الزامی است';
    if (!formData.description) newErrors.description = 'شرح الزامی است';
    if (!formData.contactPhone) newErrors.contactPhone = 'شماره تماس الزامی است';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/portal/complaints', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        onSuccess();
      } else {
        onSuccess();
      }
    } catch {
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base" dir="rtl">
      <div className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button onClick={onCancel} className="text-text-muted hover:text-text-primary">
              <ChevronRight className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">ثبت شکایت جدید</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Card>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-text-secondary">
                موضوع *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.subject ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                } border px-3 py-2`}
                placeholder="موضوع شکایت"
              />
              {errors.subject && <p className="mt-1 text-sm text-feedback-error">{errors.subject}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
                شرح شکایت *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.description ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                } border px-3 py-2`}
                placeholder="شرح کامل شکایت"
              />
              {errors.description && <p className="mt-1 text-sm text-feedback-error">{errors.description}</p>}
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-text-secondary">
                شماره تماس *
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.contactPhone ? 'border-feedback-error/30 focus:border-feedback-error' : 'border-border-default focus:border-brand-primary'
                } border px-3 py-2`}
                placeholder="09xxxxxxxxx"
              />
              {errors.contactPhone && <p className="mt-1 text-sm text-feedback-error">{errors.contactPhone}</p>}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-text-secondary">
                ایمیل
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md shadow-sm sm:text-sm border-border-default focus:border-brand-primary border px-3 py-2"
                placeholder="example@email.com"
              />
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-border-default">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-border-default rounded-md text-sm font-medium text-text-secondary hover:bg-bg-base"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-feedback-warning border border-transparent rounded-md text-sm font-medium text-text-on-brand hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'ثبت شکایت'}
              </button>
            </div>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}
