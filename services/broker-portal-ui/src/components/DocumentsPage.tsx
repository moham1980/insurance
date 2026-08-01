import * as React from 'react';
import { Upload, FileText, Search, Filter, Download, Trash2, CheckCircle, Clock, XCircle, FileCheck } from 'lucide-react';
import { PageHeader, Table, TableRow, TableCell, StatusBadge, EmptyState, Card, Button, Loading, ErrorBanner } from './ui';
import { brokerApi } from '../lib/api';
import { mockDocuments } from '../lib/mock-data';

const docTypeOptions = [
  'قرارداد کارگزاری',
  'مجوز فعالیت',
  'بیمه‌نامه نمونه',
  'کارت ملی مدیر',
  'سند مالکیت',
  'گواهی عدم سوءپیشینه',
  'دستورالعمل فروش',
  'سند دیگر',
];

const carrierOptions = ['بیمه ایران', 'بیمه آسیه', 'بیمه پاسارگاد', 'بیمه البرز', 'بیمه دانا'];

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  'تأیید شده': { label: 'تأیید شده', className: 'bg-feedback-success-subtle text-feedback-success border-feedback-success/30', icon: CheckCircle },
  'در حال بررسی': { label: 'در حال بررسی', className: 'bg-feedback-info-subtle text-feedback-info border-feedback-info/30', icon: Clock },
  'در انتظار': { label: 'در انتظار', className: 'bg-feedback-warning-subtle text-feedback-warning border-feedback-warning/30', icon: Clock },
  'رد شده': { label: 'رد شده', className: 'bg-feedback-error-subtle text-feedback-error border-feedback-error/30', icon: XCircle },
};

export function DocumentsPage() {
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showUpload, setShowUpload] = React.useState(false);
  const [filterCarrier, setFilterCarrier] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [uploadForm, setUploadForm] = React.useState({ carrierName: '', docType: '', fileName: '' });
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => { loadDocuments(); }, []);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await brokerApi.listDocuments();
      setDocuments(res?.data?.rows || res?.data || []);
    } catch (e: any) {
      setError(e.message);
      setDocuments(mockDocuments);
    } finally {
      setLoading(false);
    }
  };

  const filtered = documents.filter(doc => {
    if (filterCarrier && doc.carrierName !== filterCarrier) return false;
    if (filterStatus && doc.status !== filterStatus) return false;
    if (search && !doc.fileName.includes(search) && !doc.docType.includes(search)) return false;
    return true;
  });

  const groupedByCarrier = filtered.reduce((acc, doc) => {
    if (!acc[doc.carrierName]) acc[doc.carrierName] = [];
    acc[doc.carrierName].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  const handleUpload = async () => {
    if (!uploadForm.carrierName || !uploadForm.docType || !uploadForm.fileName) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('carrierName', uploadForm.carrierName);
      formData.append('docType', uploadForm.docType);
      formData.append('fileName', uploadForm.fileName);
      await brokerApi.uploadDocument(formData);
      setShowUpload(false);
      setUploadForm({ carrierName: '', docType: '', fileName: '' });
      loadDocuments();
    } catch (e: any) {
      const newDoc = {
        id: `DOC-${Date.now()}`,
        carrierName: uploadForm.carrierName,
        docType: uploadForm.docType,
        fileName: uploadForm.fileName,
        fileSize: '—',
        uploadDate: new Date().toLocaleDateString('fa-IR'),
        status: 'در انتظار',
        uploadedBy: 'کاربر فعلی',
      };
      setDocuments(prev => [newDoc, ...prev]);
      setShowUpload(false);
      setUploadForm({ carrierName: '', docType: '', fileName: '' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="مدارک و مستندات"
        subtitle="مدیریت اسناد و مدارک به تفکیک بیمه‌گر"
        action={
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="ml-2 h-4 w-4" />
            آپلود سند
          </Button>
        }
      />

      {error && <ErrorBanner error="در حال نمایش داده‌های نمونه — ارتباط با سرور برقرار نشد" onRetry={loadDocuments} />}

      {showUpload && (
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-text-primary">آپلود سند جدید</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">بیمه‌گر</label>
              <select
                value={uploadForm.carrierName}
                onChange={(e) => setUploadForm({ ...uploadForm, carrierName: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">انتخاب کنید...</option>
                {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">نوع سند</label>
              <select
                value={uploadForm.docType}
                onChange={(e) => setUploadForm({ ...uploadForm, docType: e.target.value })}
                className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">انتخاب کنید...</option>
                {docTypeOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">فایل</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-default px-3 py-2 text-sm text-text-muted hover:border-brand-primary hover:bg-brand-primary/5">
                <Upload className="h-4 w-4" />
                {uploadForm.fileName || 'انتخاب فایل...'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.files?.[0]?.name || '' })}
                />
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>انصراف</Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading || !uploadForm.carrierName || !uploadForm.docType}>
              {uploading ? 'در حال آپلود...' : 'آپلود'}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی سند..."
            className="w-full rounded-lg border border-border-default bg-bg-raised py-2 pr-10 pl-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <select
          value={filterCarrier}
          onChange={(e) => setFilterCarrier(e.target.value)}
          className="rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        >
          <option value="">همه بیمه‌گرها</option>
          {carrierOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="تأیید شده">تأیید شده</option>
          <option value="در حال بررسی">در حال بررسی</option>
          <option value="در انتظار">در انتظار</option>
          <option value="رد شده">رد شده</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="سندی یافت نشد" description="برای آپلود سند جدید روی دکمه آپلود کلیک کنید" />
      ) : (
        <div className="space-y-6">
          {(Object.entries(groupedByCarrier) as [string, any[]][]).map(([carrier, docs]) => (
            <div key={carrier}>
              <div className="mb-3 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-brand-primary" />
                <h3 className="text-sm font-semibold text-text-primary">{carrier}</h3>
                <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">
                  {docs.length} سند
                </span>
              </div>
              <Table headers={['نوع سند', 'نام فایل', 'حجم', 'تاریخ آپلود', 'آپلود توسط', 'وضعیت', 'عملیات']}>
                {docs.map((doc) => {
                  const sc = statusConfig[doc.status] || statusConfig['در انتظار'];
                  const StatusIcon = sc.icon;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-text-primary">{doc.docType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-text-muted" />
                          <span className="text-text-primary">{doc.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-muted">{doc.fileSize}</TableCell>
                      <TableCell className="text-text-muted">{doc.uploadDate}</TableCell>
                      <TableCell className="text-text-secondary">{doc.uploadedBy}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button className="rounded-lg p-1.5 text-text-muted hover:bg-bg-subtle hover:text-brand-primary" title="دانلود">
                            <Download className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-1.5 text-text-muted hover:bg-feedback-error/10 hover:text-feedback-error" title="حذف">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
