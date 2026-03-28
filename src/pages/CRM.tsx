import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Search, Plus, Phone, Mail, Calendar, Tag, ArrowRight,
  Star, Activity, DollarSign, Video, FileText as FileTextIcon,
  CheckSquare, Trash2, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const stages = [
  { id: 'lead', label: 'Lead', color: 'bg-gray-100 dark:bg-gray-800', badge: 'bg-gray-200 text-gray-700' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700' },
  { id: 'proposal', label: 'Proposal', color: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-purple-50 dark:bg-purple-900/20', badge: 'bg-purple-100 text-purple-700' },
  { id: 'won', label: 'Won', color: 'bg-green-50 dark:bg-green-900/20', badge: 'bg-green-100 text-green-700' },
  { id: 'lost', label: 'Lost', color: 'bg-red-50 dark:bg-red-900/20', badge: 'bg-red-100 text-red-700' },
];

const activityTypes = [
  { type: 'call', icon: Phone, label: 'Call', color: 'text-green-500' },
  { type: 'email', icon: Mail, label: 'Email', color: 'text-blue-500' },
  { type: 'meeting', icon: Video, label: 'Meeting', color: 'text-purple-500' },
  { type: 'note', icon: FileTextIcon, label: 'Note', color: 'text-amber-500' },
  { type: 'task', icon: CheckSquare, label: 'Task', color: 'text-indigo-500' },
];

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    Regular: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    New: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', map[tier] || 'bg-gray-100 text-gray-600')}>
      {tier === 'VIP' && <Star className="w-2.5 h-2.5 mr-1" />}{tier}
    </span>
  );
}

// ─── Add Contact Sheet ─────────────────────────────────────────────────────

function AddContactSheet({ onClose }: { onClose: () => void }) {
  const { isDemo } = useAuth();
  const insert = useTenantInsert('customers');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', tier: 'New', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (isDemo) { return; }
    if (!form.name.trim()) { return; }
    setSaving(true);
    try {
      await insert.mutateAsync({ ...form });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>Add Contact</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Diana Prince" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="diana@acme.com" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 0200" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Company</Label>
            <Input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Customer Tier</Label>
            <Select value={form.tier} onValueChange={v => set('tier', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Contact
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Add Deal Sheet ────────────────────────────────────────────────────────

function AddDealSheet({ contacts, onClose }: { contacts: any[]; onClose: () => void }) {
  const { isDemo } = useAuth();
  const insert = useTenantInsert('crm_deals');
  const [form, setForm] = useState({
    title: '', contact_id: '', contact_name: '', company: '',
    value: '', stage: 'lead', probability: '20', close_date: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (isDemo || !form.title.trim()) return;
    setSaving(true);
    try {
      const selectedContact = contacts.find(c => c.id === form.contact_id);
      await insert.mutateAsync({
        title: form.title,
        contact_id: form.contact_id || null,
        contact_name: selectedContact?.name || form.contact_name,
        company: selectedContact?.company || form.company,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        probability: parseInt(form.probability) || 20,
        close_date: form.close_date || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>Add Deal</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Deal Title *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Enterprise License" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Contact</Label>
            <Select value={form.contact_id} onValueChange={v => set('contact_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select contact (optional)" /></SelectTrigger>
              <SelectContent>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Deal Value</Label>
            <Input value={form.value} onChange={e => set('value', e.target.value)} type="number" placeholder="48000" />
          </div>
          <div className="space-y-1.5">
            <Label>Probability (%)</Label>
            <Input value={form.probability} onChange={e => set('probability', e.target.value)} type="number" placeholder="20" />
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={v => set('stage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expected Close Date</Label>
            <Input value={form.close_date} onChange={e => set('close_date', e.target.value)} type="date" />
          </div>
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={handleSave} disabled={saving || !form.title.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Deal
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Contact Detail Sheet ──────────────────────────────────────────────────

function ContactDetail({ contact, onClose }: { contact: any; onClose: () => void }) {
  const { formatMoney } = useCurrency();

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold">
            {(contact.name || '?').charAt(0)}
          </div>
          <div>
            <SheetTitle>{contact.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{contact.company}</p>
          </div>
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="p-4 text-center">
            <p className="text-lg font-bold text-foreground">{contact.total_orders || 0}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-lg font-bold text-foreground">{formatMoney(contact.total_spent || 0)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
          <div className="p-4 text-center">
            <TierBadge tier={contact.tier || 'New'} />
            <p className="text-xs text-muted-foreground mt-1">Tier</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Info</h3>
            <div className="space-y-2 text-sm">
              {contact.email && <div className="flex items-center gap-2 text-foreground"><Mail className="w-4 h-4 text-muted-foreground" />{contact.email}</div>}
              {contact.phone && <div className="flex items-center gap-2 text-foreground"><Phone className="w-4 h-4 text-muted-foreground" />{contact.phone}</div>}
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" />Added: {contact.created_at?.slice(0, 10)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Log Activity</h3>
            <div className="flex gap-2 flex-wrap">
              {activityTypes.map(({ type, icon: Icon, label, color }) => (
                <Button key={type} size="sm" variant="outline" className={cn('h-8 text-xs gap-1.5', color)}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </Button>
              ))}
            </div>
          </div>

          {contact.notes && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</h3>
              <p className="text-sm text-foreground">{contact.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main CRM Page ─────────────────────────────────────────────────────────

export default function CRM() {
  const { formatMoney } = useCurrency();
  const { isDemo } = useAuth();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('contacts');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addDealOpen, setAddDealOpen] = useState(false);

  const { data: contacts = [], isLoading: contactsLoading } = useTenantQuery('customers');
  const { data: deals = [], isLoading: dealsLoading } = useTenantQuery('crm_deals');
  const deleteContact = useTenantDelete('customers');
  const deleteDeal = useTenantDelete('crm_deals');
  const updateDeal = useTenantUpdate('crm_deals');

  const filteredContacts = (contacts as any[]).filter(c => {
    const matchSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const pipelineValue = (deals as any[]).filter(d => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + Number(d.value || 0), 0);
  const wonValue = (deals as any[]).filter(d => d.stage === 'won').reduce((s, d) => s + Number(d.value || 0), 0);

  const handleMoveDeal = async (dealId: string, newStage: string) => {
    if (isDemo) return;
    await updateDeal.mutateAsync({ id: dealId, stage: newStage });
  };

  return (
    <AppLayout title="CRM" subtitle="Contacts, deals & pipeline">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        {/* ── Contacts ── */}
        <TabsContent value="contacts">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Contacts</p>
                <p className="text-xl font-bold text-foreground">{(contacts as any[]).length}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">VIP Contacts</p>
                <p className="text-xl font-bold text-amber-500">{(contacts as any[]).filter(c => c.tier === 'VIP').length}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
                <p className="text-xl font-bold text-indigo-600">{formatMoney(pipelineValue)}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Won Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatMoney(wonValue)}</p>
              </CardContent></Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" size="sm" onClick={() => setAddContactOpen(true)}>
                <Plus className="w-4 h-4" /> Add Contact
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Contact</th>
                    <th className="text-left px-4 py-3 font-medium">Company</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tier</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Revenue</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contactsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                    ))
                  ) : filteredContacts.map((contact: any) => (
                    <tr key={contact.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {(contact.name || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{contact.company || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><TierBadge tier={contact.tier || 'New'} /></td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground hidden sm:table-cell">
                        {contact.total_spent > 0 ? formatMoney(contact.total_spent) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-indigo-600" onClick={() => setSelectedContact(contact)}>
                            View <ArrowRight className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => !isDemo && deleteContact.mutate(contact.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!contactsLoading && filteredContacts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No contacts yet</p>
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" size="sm" onClick={() => setAddContactOpen(true)}>
                    <Plus className="w-4 h-4" /> Add First Contact
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Pipeline (Kanban) ── */}
        <TabsContent value="pipeline">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(deals as any[]).filter(d => !['won', 'lost'].includes(d.stage)).length} active deals · {formatMoney(pipelineValue)} pipeline
              </p>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 h-8" onClick={() => setAddDealOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Deal
              </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map(stage => {
                const stageDeals = (deals as any[]).filter(d => d.stage === stage.id);
                const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);
                return (
                  <div key={stage.id} className="flex-shrink-0 w-[240px]">
                    <div className={cn('rounded-xl p-3 min-h-[200px]', stage.color)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5', stage.badge)}>
                          {stage.label} ({stageDeals.length})
                        </span>
                        <span className="text-xs text-muted-foreground">{formatMoney(stageValue)}</span>
                      </div>
                      <div className="space-y-2">
                        {dealsLoading ? (
                          <Skeleton className="h-20 w-full rounded-lg" />
                        ) : stageDeals.map((deal: any) => (
                          <motion.div
                            key={deal.id}
                            whileHover={{ scale: 1.02 }}
                            className="bg-card rounded-lg p-3 border border-border shadow-sm cursor-grab group"
                          >
                            <p className="text-sm font-semibold text-foreground leading-snug">{deal.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{deal.contact_name} · {deal.company}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-bold text-indigo-600">{formatMoney(deal.value)}</span>
                              <span className="text-xs text-muted-foreground bg-accent rounded-full px-1.5 py-0.5">{deal.probability}%</span>
                            </div>
                            {deal.close_date && (
                              <p className="text-[11px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />{deal.close_date}
                              </p>
                            )}
                            <div className="mt-2 pt-2 border-t border-border flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {deal.stage !== 'won' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] text-green-600 hover:bg-green-50 px-1.5"
                                  onClick={() => handleMoveDeal(deal.id, 'won')}
                                >Won</Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400 hover:text-red-600 ml-auto"
                                onClick={() => !isDemo && deleteDeal.mutate(deal.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                        {!dealsLoading && stageDeals.length === 0 && (
                          <div className="text-center py-6 text-xs text-muted-foreground/60 border-2 border-dashed border-border rounded-lg">
                            Drop deals here
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Detail Sheet */}
      <Sheet open={!!selectedContact} onOpenChange={(v) => !v && setSelectedContact(null)}>
        <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0" side="right">
          {selectedContact && (
            <ContactDetail contact={selectedContact} onClose={() => setSelectedContact(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Contact Sheet */}
      <Sheet open={addContactOpen} onOpenChange={setAddContactOpen}>
        <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0" side="right">
          <AddContactSheet onClose={() => setAddContactOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Add Deal Sheet */}
      <Sheet open={addDealOpen} onOpenChange={setAddDealOpen}>
        <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0" side="right">
          <AddDealSheet contacts={contacts as any[]} onClose={() => setAddDealOpen(false)} />
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
