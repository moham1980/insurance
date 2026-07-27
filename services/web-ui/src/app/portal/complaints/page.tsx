'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Complaint {
  id: string;
  complaintNumber: string;
  subject: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  submittedDate: string;
  description: string;
}

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
      setLoading(true);
      // In a real implementation, fetch from API
      const mockComplaints: Complaint[] = [
        {
          id: '1',
          complaintNumber: 'CMP-2024-001',
          subject: 'تأخیر در پرداخت خسارت',
          status: 'UNDER_REVIEW',
          submittedDate: '2024-03-05',
          description: 'خسارت من از تاریخ ۲۰ اسفند ثبت شده است و هنوز پرداخت نشده است',
        },
        {
          id: '2',
          complaintNumber: 'CMP-2023-002',
          subject: 'مشکل در صدور بیمه‌نامه',
          status: 'RESOLVED',
          submittedDate: '2023-10-15',
          description: 'بیمه‌نامه من با تأخیر صادر شد',
        },
      ];

      setComplaints(mockComplaints);
    } catch (error) {
      console.error('Failed to load complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/portal')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">شکایات</h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
            >
              ثبت شکایت جدید
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Complaints List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">شکایتی یافت نشد</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  ثبت اولین شکایت
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شماره شکایت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        موضوع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        وضعیت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تاریخ ثبت
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        شرح
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {complaint.complaintNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {complaint.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {complaint.submittedDate}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {complaint.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('شکایت با موفقیت ثبت شد');
      onSuccess();
    } catch (error) {
      console.error('Failed to submit complaint:', error);
      alert('خطا در ثبت شکایت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onCancel}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">ثبت شکایت جدید</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                موضوع *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.subject ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } border px-3 py-2`}
                placeholder="موضوع شکایت"
              />
              {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                شرح شکایت *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } border px-3 py-2`}
                placeholder="شرح کامل شکایت"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                شماره تماس *
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                  errors.contactPhone ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                } border px-3 py-2`}
                placeholder="09xxxxxxxxx"
              />
              {errors.contactPhone && <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>}
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                ایمیل
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:border-blue-500 border px-3 py-2"
                placeholder="example@email.com"
              />
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-orange-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'ثبت شکایت'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
