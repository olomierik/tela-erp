import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { genId, formatCurrency, formatDate } from '@/lib/mock';
import { toast } from 'sonner';
import { Pencil, Trash2, TrendingUp, Target, Trophy, Layers } from 'lucide-react';

type LeadSource = 'website' | 'referral' | 'linkedin' | 'cold_call' | 'event';
type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  value: number;
  assigned_to: string;
  created_at: string;
}

const INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'Ryan Mitchell', company: 'Vertex Solutions', email: 'r.mitchell@vertex.com', phone: '+1 650 555 0281', source: 'website', stage: 'qualified', value: 42000, assigned_to: 'Sarah Chen', created_at: '2025-01-10' },
  { id: '2', name: 'Amara Osei', company: 'BrightPath Consulting', email: 'amara@brightpath.co', phone: '+233 24 555 0193', source: 'referral', stage: 'proposal', value: 87500, assigned_to: 'Marcus Johnson', created_at: '2025-01-18' },
  { id: '3', name: 'Lena Hoffmann', company: 'Eurotech GmbH', email: 'l.hoffmann@eurotech.de', phone: '+49 89 555 0447', source: 'linkedin', stage: 'won', value: 134000, assigned_to: 'Elena Petrova', created_at: '2024-12-05' },
  { id: '4', name: 'Kevin Park', company: 'SkyNet Logistics', email: 'k.park@skynet.kr', phone: '+82 2 555 0639', source: 'cold_call', stage: 'contacted', value: 28000, assigned_to: 'Sarah Chen', created_at: '2025-02-01' },
  { id: '5', name: 'Isabella Romano', company: 'Medici Pharma', email: 'i.romano@medici.it', phone: '+39 02 555 0752', source: 'event', stage: 'new', value: 55000, assigned_to: 'Marcus Johnson', created_at: '2025-02-14' },
  { id: '6', name: 'Omar Al-Farsi', company: 'Desert Tech', email: 'o.alfarsi@deserttech.ae', phone: '+971 50 555 0284', source: 'linkedin', stage: 'qualified', value: 72000, assigned_to: 'Elena Petrova', created_at: '2025-02-20' },
  { id: '7', name: 'Sophie Blanc', company: 'Lumiere Media', email: 's.blanc@lumiere.fr', phone: '+33 6 55 00 1932', source: 'referral', stage: 'lost', value: 19500, assigned_to: 'Sarah Chen', created_at: '2025-01-05' },
  { id: '8', name: 'Daniel Ferreira', company: 'Rio Capital', email: 'd.ferreira@riocapital.br', phone: '+55 11 9 5555 0384', source: 'website', stage: 'proposal', value: 96000, assigned_to: 'Marcus Johnson', created_at: '2025-03-02' },
  { id: '9', name: 'Mei Ling Wu', company: 'Pacific Trade Co.', email: 'm.wu@pacifictrade.hk', phone: '+852 2555 0916', source: 'event', stage: 'new', value: 38000, assigned_to: 'Elena Petrova', created_at: '2025-03-10' },
  { id: '10', name: 'Finn Larsen', company: 'Nordic Innovations', email: 'f.larsen@nordic.no', phone: '+47 22 55 09 18', source: 'cold_call', stage: 'contacted', value: 44500, assigned_to: 'Sarah Chen', created_at: '2025-03-18' },
];

const STAGE_BADGE: Record<LeadStage, 'secondary' | 'info' | 'default' | 'warning' | 'success' | 'outline'> = {
  new: 'secondary',
  contacted: 'info',
  qualified: 'default',
  proposal: 'warning',
  won: 'success',
  lost: 'outline',
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  referral: 'Referral',
  linkedin: 'LinkedIn',
  cold_call: 'Cold Call',
  event: 'Event',
};

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: 'website' as LeadSource,
  stage: 'new' as LeadStage,
  value: '' as string | number,
  assigned_to: '',
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = leads.filter(l => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const qualifiedCount = leads.filter(l => l.stage === 'qualified' || l.stage === 'proposal').length;
  const wonCount = leads.filter(l => l.stage === 'won').length;
  const pipelineValue = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost').reduce((s, l) => s + l.value, 0);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(l: Lead) {
    setEditId(l.id);
    setForm({ name: l.name, company: l.company, email: l.email, phone: l.phone, source: l.source, stage: l.stage, value: l.value, assigned_to: l.assigned_to });
    setSheetOpen(true);
  }

  function handleDelete(id: string) {
    setLeads(prev => prev.filter(l => l.id !== id));
    toast.success('Lead deleted');
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const valueNum = typeof form.value === 'string' ? parseFloat(form.value) || 0 : form.value;
    if (editId) {
      setLeads(prev => prev.map(l => l.id === editId ? { ...l, name: form.name, company: form.company, email: form.email, phone: form.phone, source: form.source, stage: form.stage, value: valueNum, assigned_to: form.assigned_to } : l));
      toast.success('Lead updated');
    } else {
      const newLead: Lead = {
        id: genId(),
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        source: form.source,
        stage: form.stage,
        value: valueNum,
        assigned_to: form.assigned_to,
        created_at: new Date().toISOString().split('T')[0],
      };
      setLeads(prev => [newLead, ...prev]);
      toast.success('Lead created');
    }
    setSheetOpen(false);
  }

  return (
    <AppLayout title="Leads">
      <PageHeader
        title="Leads"
        subtitle="Capture, track, and nurture sales leads through your pipeline to conversion."
        action={{ label: 'New Lead', onClick: openCreate }}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{leads.length}</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualified</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{qualifiedCount}</span>
              <Target className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Won</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{wonCount}</span>
              <Trophy className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{formatCurrency(pipelineValue)}</span>
              <Layers className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          className="flex-1"
          placeholder="Search by name, company or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="w-full sm:w-40">
          <option value="all">All Stages</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Est. Value</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">No leads found.</TableCell>
                </TableRow>
              )}
              {filtered.map(l => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.email}</div>
                  </TableCell>
                  <TableCell>{l.company}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{SOURCE_LABELS[l.source]}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STAGE_BADGE[l.stage]}>{l.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(l.value)}</TableCell>
                  <TableCell>{l.assigned_to || '—'}</TableCell>
                  <TableCell>{formatDate(l.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(l)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(l.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit Lead' : 'New Lead'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Ryan Mitchell" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Acme Corp" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="ryan@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+1 650 555 0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))}>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_call">Cold Call</option>
                <option value="event">Event</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as LeadStage }))}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Value ($)</Label>
              <Input type="number" min="0" step="1" placeholder="50000" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Input placeholder="Team member name" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
          </div>
          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Save Changes' : 'Create Lead'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
