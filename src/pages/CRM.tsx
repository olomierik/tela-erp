import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Search, Plus, Phone, Mail, Calendar, Tag, ArrowRight,
  Star, User, Activity, DollarSign, TrendingUp, Filter,
  MessageSquare, Video, FileText as FileTextIcon, CheckSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

// ─── Demo Data ─────────────────────────────────────────────────────────────

const demoContacts = [
  { id: '1', name: 'Diana Prince', company: 'Acme Corp', email: 'diana@acme.com', phone: '+1 555 0200', tier: 'VIP', tags: ['Enterprise', 'Tech'], last_contact: '2026-03-22', deals: 3, revenue: 124000 },
  { id: '2', name: 'Bruce Wayne', company: 'Wayne Industries', email: 'bruce@wayne.com', phone: '+1 555 0201', tier: 'VIP', tags: ['Manufacturing', 'Premium'], last_contact: '2026-03-20', deals: 2, revenue: 89000 },
  { id: '3', name: 'Clark Kent', company: 'Daily Planet', email: 'clark@dailyplanet.com', phone: '+1 555 0202', tier: 'Regular', tags: ['Media'], last_contact: '2026-03-18', deals: 1, revenue: 32000 },
  { id: '4', name: 'Natasha Romanoff', company: 'Red Room Inc', email: 'nat@redroom.com', phone: '+1 555 0203', tier: 'Regular', tags: ['Security', 'Consulting'], last_contact: '2026-03-15', deals: 2, revenue: 47500 },
  { id: '5', name: 'Peter Parker', company: 'Daily Bugle', email: 'peter@bugle.com', phone: '+1 555 0204', tier: 'New', tags: ['Media', 'SMB'], last_contact: '2026-03-10', deals: 0, revenue: 0 },
  { id: '6', name: 'Tony Stark', company: 'Stark Industries', email: 'tony@stark.com', phone: '+1 555 0205', tier: 'VIP', tags: ['Enterprise', 'Tech', 'Defense'], last_contact: '2026-03-24', deals: 5, revenue: 310000 },
];

const demoDeals = [
  { id: '1', title: 'Enterprise License', contact: 'Diana Prince', company: 'Acme Corp', value: 48000, stage: 'proposal', probability: 65, close_date: '2026-04-30' },
  { id: '2', title: 'Manufacturing Suite', contact: 'Bruce Wayne', company: 'Wayne Industries', value: 89000, stage: 'negotiation', probability: 80, close_date: '2026-04-15' },
  { id: '3', title: 'Cloud Subscription', contact: 'Clark Kent', company: 'Daily Planet', value: 12000, stage: 'qualified', probability: 45, close_date: '2026-05-15' },
  { id: '4', title: 'Security Module', contact: 'Natasha Romanoff', company: 'Red Room Inc', value: 24000, stage: 'lead', probability: 20, close_date: '2026-06-01' },
  { id: '5', title: 'Full ERP Bundle', contact: 'Tony Stark', company: 'Stark Industries', value: 310000, stage: 'won', probability: 100, close_date: '2026-03-01' },
  { id: '6', title: 'Starter Pack', contact: 'Peter Parker', company: 'Daily Bugle', value: 3600, stage: 'lead', probability: 15, close_date: '2026-05-30' },
];

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
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', map[tier] || 'bg-gray-100 text-gray-600')}>{tier === 'VIP' && <Star className="w-2.5 h-2.5 mr-1" />}{tier}</span>;
}

// ─── Contact Detail Sheet ──────────────────────────────────────────────────

function ContactDetail({ contact, onClose }: { contact: any; onClose: () => void }) {
  const { formatMoney } = useCurrency();
  const [activityNote, setActivityNote] = useState('');

  const demoActivities = [
    { type: 'call', title: 'Discovery call', time: '2026-03-22 10:00', note: 'Discussed enterprise needs, needs budget approval' },
    { type: 'email', title: 'Sent proposal', time: '2026-03-20 14:30', note: 'Sent detailed proposal for 50-user license' },
    { type: 'meeting', title: 'Demo session', time: '2026-03-18 11:00', note: 'Product demo went well, very interested' },
  ];

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg font-bold">
            {contact.name.charAt(0)}
          </div>
          <div>
            <SheetTitle>{contact.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{contact.company}</p>
          </div>
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="p-4 text-center">
            <p className="text-lg font-bold text-foreground">{contact.deals}</p>
            <p className="text-xs text-muted-foreground">Deals</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-lg font-bold text-foreground">{formatMoney(contact.revenue)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
          <div className="p-4 text-center">
            <TierBadge tier={contact.tier} />
            <p className="text-xs text-muted-foreground mt-1">Tier</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Contact Info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground"><Mail className="w-4 h-4 text-muted-foreground" />{contact.email}</div>
              <div className="flex items-center gap-2 text-foreground"><Phone className="w-4 h-4 text-muted-foreground" />{contact.phone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" />Last contact: {contact.last_contact}</div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-xs font-medium text-foreground">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Log Activity */}
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

          {/* Activity Timeline */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity Timeline</h3>
            <div className="space-y-3">
              {demoActivities.map((act, i) => {
                const actType = activityTypes.find(a => a.type === act.type);
                const Icon = actType?.icon || Activity;
                return (
                  <div key={i} className="flex gap-3">
                    <div className={cn('w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5', actType?.color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{act.title}</p>
                      <p className="text-xs text-muted-foreground">{act.note}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main CRM Page ─────────────────────────────────────────────────────────

export default function CRM() {
  const { formatMoney } = useCurrency();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('contacts');

  const filteredContacts = demoContacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const pipelineValue = demoDeals.filter(d => !['won', 'lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const wonValue = demoDeals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);

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
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Contacts</p>
                <p className="text-xl font-bold text-foreground">{demoContacts.length}</p>
              </CardContent></Card>
              <Card className="rounded-xl border-border"><CardContent className="p-3">
                <p className="text-xs text-muted-foreground">VIP Contacts</p>
                <p className="text-xl font-bold text-amber-500">{demoContacts.filter(c => c.tier === 'VIP').length}</p>
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
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" size="sm">
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
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Tags</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Revenue</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{contact.company}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><TierBadge tier={contact.tier} /></td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded bg-accent text-xs text-foreground">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground hidden sm:table-cell">
                        {contact.revenue > 0 ? formatMoney(contact.revenue) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-indigo-600" onClick={() => setSelectedContact(contact)}>
                          View <ArrowRight className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Pipeline (Kanban) ── */}
        <TabsContent value="pipeline">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {demoDeals.filter(d => !['won','lost'].includes(d.stage)).length} active deals · {formatMoney(pipelineValue)} pipeline
              </p>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 h-8">
                <Plus className="w-3.5 h-3.5" /> Add Deal
              </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map(stage => {
                const stageDeals = demoDeals.filter(d => d.stage === stage.id);
                const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
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
                        {stageDeals.map(deal => (
                          <motion.div
                            key={deal.id}
                            whileHover={{ scale: 1.02 }}
                            className="bg-card rounded-lg p-3 border border-border shadow-sm cursor-grab"
                          >
                            <p className="text-sm font-semibold text-foreground leading-snug">{deal.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{deal.contact} · {deal.company}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-bold text-indigo-600">{formatMoney(deal.value)}</span>
                              <span className="text-xs text-muted-foreground bg-accent rounded-full px-1.5 py-0.5">{deal.probability}%</span>
                            </div>
                            {deal.close_date && (
                              <p className="text-[11px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />{deal.close_date}
                              </p>
                            )}
                          </motion.div>
                        ))}
                        {stageDeals.length === 0 && (
                          <div className="text-center py-6 text-xs text-muted-foreground/60">No deals</div>
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
    </AppLayout>
  );
}
