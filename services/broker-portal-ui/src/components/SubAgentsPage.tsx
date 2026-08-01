import * as React from 'react';
import { Users, Plus, Phone, Mail, User, FileText, X, GitBranch, List } from 'lucide-react';
import { Table, TableRow, TableCell, StatusBadge, PageHeader, EmptyState, Card, Button, Loading } from './ui';
import { SubAgentTree, type SubAgentNode } from '@insurance/design-system';
import { mockSubAgents, mockSubAgentHierarchy } from '../lib/mock-data';
import { brokerApi } from '../lib/api';

export function SubAgentsPage() {
  const [agents, setAgents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'cards' | 'tree'>('cards');
  const [hierarchy, setHierarchy] = React.useState<any>(null);

  React.useEffect(() => {
    brokerApi.listSubAgents()
      .then(r => setAgents(r.data?.rows || r.data || []))
      .catch(() => { setAgents(mockSubAgents); })
      .finally(() => setLoading(false));
    brokerApi.getSubAgentHierarchy()
      .then(r => setHierarchy(r.data || r))
      .catch(() => { setHierarchy(mockSubAgentHierarchy); });
  }, []);

  const adaptNode = (node: any): SubAgentNode => ({
    partyId: node.id,
    name: node.name,
    role: node.id === 'root' ? 'broker' : 'sub_agent',
    activePolicyCount: node.policies,
    status: node.status === 'فعال' ? 'active' : 'inactive',
    children: (node.children || []).map((c: any) => adaptNode(c)),
  });

  const treeNodes = hierarchy ? [adaptNode(hierarchy)] : [];

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="نمایندگان فرعی"
        subtitle="مدیریت نمایندگان تحت پوشش کارگزاری"
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border-default p-0.5">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'cards' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-muted hover:bg-bg-subtle'}`}
              >
                <List className="h-3.5 w-3.5" /> کارت
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'tree' ? 'bg-brand-primary/10 text-brand-primary' : 'text-text-muted hover:bg-bg-subtle'}`}
              >
                <GitBranch className="h-3.5 w-3.5" /> درخت
              </button>
            </div>
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              نماینده جدید
            </Button>
          </div>
        }
      />

      {loading ? (
        <Loading />
      ) : viewMode === 'tree' ? (
        treeNodes.length > 0 ? (
          <SubAgentTree nodes={treeNodes} />
        ) : (
          <EmptyState icon={GitBranch} title="درخت سلسله در دسترس نیست" />
        )
      ) : agents.length === 0 ? (
        <EmptyState icon={Users} title="نماینده‌ای یافت نشد" />
      ) : (
        <React.Fragment>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <Card key={a.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{a.name}</h3>
                      <p className="text-xs text-text-muted">کد: {a.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Phone className="h-4 w-4 text-text-muted" />
                    <span dir="ltr">{a.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail className="h-4 w-4 text-text-muted" />
                    <span dir="ltr">{a.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <FileText className="h-4 w-4 text-text-muted" />
                    <span>{new Intl.NumberFormat('fa-IR').format(a.policies)} بیمه‌نامه فعال</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </React.Fragment>
      )}

      {showCreate && (
        <CreateSubAgentModal
          onClose={() => setShowCreate(false)}
          onCreate={(a) => { setAgents([a, ...agents]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateSubAgentModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: any) => void }) {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-bg-raised p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">نماینده جدید</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-bg-subtle">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">نام و نام خانوادگی</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: محمد رضایی"
              className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">شماره موبایل</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXXX"
              dir="ltr"
              className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">ایمیل</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@broker.ir"
              dir="ltr"
              className="w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button
            onClick={() => onCreate({
              id: `SA-${Date.now()}`,
              name: name || 'نماینده جدید',
              code: `A-${String(Date.now()).slice(-4)}`,
              phone: phone || '09XXXXXXXXX',
              email: email || 'agent@broker.ir',
              status: 'فعال',
              policies: 0,
            })}
          >
            ایجاد
          </Button>
        </div>
      </div>
    </div>
  );
}
