import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  MailOpen,
  Send,
  Loader2,
  Pencil,
  Trash2,
  CalendarClock,
  SendHorizonal,
  BarChart3,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus =
  | 'draft'
  | 'in_queue'
  | 'sending'
  | 'sent'
  | 'cancelled';

interface Campaign extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  preview_text: string;
  body_html: string;
  from_name: string;
  from_email: string;
  mailing_list_id: string;
  mailing_list_name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  created_at: string;
  updated_at: string;
}

interface MailingListOption {
  id: string;
  name: string;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface CampaignForm {
  name: string;
  subject: string;
  preview_text: string;
  body_html: string;
  from_name: string;
  from_email: string;
  mailing_list_id: string;
  mailing_list_name: string;
  status: CampaignStatus;
  scheduled_at: string;
  total_recipients: number | '';
}

const emptyCampaignForm: CampaignForm = {
  name: '',
  subject: '',
  preview_text: '',
  body_html: '',
  from_name: '',
  from_email: '',
  mailing_list_id: '',
  mailing_list_name: '',
  status: 'draft',
  scheduled_at: '',
  total_recipients: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  in_queue: 'In Queue',
  sending: 'Sending',
  sent: 'Sent',
  cancelled: 'Cancelled',
};

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info';

const STATUS_VARIANTS: Record<CampaignStatus, BadgeVariant> = {
  draft: 'secondary',
  in_queue: 'outline',
  sending: 'warning',
  sent: 'success',
  cancelled: 'destructive',
};

function fmtPct(opened: number, sent: number) {
  if (!sent) return '—';
  return `${((opened / sent) * 100).toFixed(1)}%`;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const { rows: campaigns, loading, insert, update, remove } =
    useTable<Campaign>('myerp_campaigns');

  const [mailingLists, setMailingLists] = useState<MailingListOption[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm);
  const [saving, setSaving] = useState(false);

  // Schedule modal state (per-row inline date input)
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // ── Fetch mailing lists ───────────────────────────────────────────────────

  useEffect(() => {
    async function fetchLists() {
      const { data } = await supabase
        .from('myerp_mailing_lists')
        .select('id, name')
        .order('name', { ascending: true });
      setMailingLists((data ?? []) as MailingListOption[]);
    }
    fetchLists();
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalCampaigns = campaigns.length;
  const sentCampaigns = campaigns.filter(c => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
  const avgOpenRate = (() => {
    const valid = sentCampaigns.filter(c => c.total_sent > 0);
    if (!valid.length) return '—';
    const avg =
      valid.reduce((s, c) => s + (c.total_opened / c.total_sent) * 100, 0) /
      valid.length;
    return `${avg.toFixed(1)}%`;
  })();

  // ── Filtered rows ─────────────────────────────────────────────────────────

  const filtered = campaigns.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Sheet open/close ──────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setForm(emptyCampaignForm);
    setSheetOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditId(c.id);
    setForm({
      name: c.name,
      subject: c.subject,
      preview_text: c.preview_text ?? '',
      body_html: c.body_html ?? '',
      from_name: c.from_name ?? '',
      from_email: c.from_email ?? '',
      mailing_list_id: c.mailing_list_id ?? '',
      mailing_list_name: c.mailing_list_name ?? '',
      status: c.status,
      scheduled_at: c.scheduled_at
        ? c.scheduled_at.slice(0, 16)
        : '',
      total_recipients: c.total_recipients ?? '',
    });
    setSheetOpen(true);
  }

  // ── When mailing list changes, auto-fill recipients ───────────────────────

  async function handleListChange(listId: string) {
    const found = mailingLists.find(l => l.id === listId);
    setForm(f => ({
      ...f,
      mailing_list_id: listId,
      mailing_list_name: found?.name ?? '',
    }));
    if (listId) {
      const { count } = await supabase
        .from('myerp_mailing_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId)
        .eq('is_unsubscribed', false);
      setForm(f => ({ ...f, total_recipients: count ?? 0 }));
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error('Name and subject are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        preview_text: form.preview_text.trim(),
        body_html: form.body_html.trim(),
        from_name: form.from_name.trim(),
        from_email: form.from_email.trim(),
        mailing_list_id: form.mailing_list_id || null,
        mailing_list_name: form.mailing_list_name,
        status: form.status,
        scheduled_at: form.scheduled_at || null,
        total_recipients: Number(form.total_recipients) || 0,
      };
      if (editId) {
        await update(editId, payload);
        toast.success('Campaign updated');
      } else {
        await insert({
          ...payload,
          sent_at: null,
          total_sent: 0,
          total_opened: 0,
          total_clicked: 0,
          total_bounced: 0,
        });
        toast.success('Campaign created');
      }
      setSheetOpen(false);
    } catch {
      toast.error('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      await remove(id);
      toast.success('Campaign deleted');
    } catch {
      toast.error('Failed to delete campaign');
    }
  }

  // ── Schedule (set status=in_queue + scheduled_at) ─────────────────────────

  async function handleSchedule(campaign: Campaign) {
    if (!scheduleValue) {
      toast.error('Please select a date and time');
      return;
    }
    setScheduling(true);
    try {
      await update(campaign.id, {
        status: 'in_queue',
        scheduled_at: new Date(scheduleValue).toISOString(),
      });
      toast.success('Campaign scheduled');
      setSchedulingId(null);
      setScheduleValue('');
    } catch {
      toast.error('Failed to schedule campaign');
    } finally {
      setScheduling(false);
    }
  }

  // ── Send Now ──────────────────────────────────────────────────────────────

  async function handleSendNow(campaign: Campaign) {
    try {
      await update(campaign.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_sent: campaign.total_recipients,
      });
      toast.success('Campaign marked as sent');
    } catch {
      toast.error('Failed to send campaign');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Campaigns">
      <PageHeader
        title="Email Campaigns"
        subtitle="Create, schedule, and track your email marketing campaigns."
        action={{ label: 'New Campaign', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{totalCampaigns}</span>
              <MailOpen className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{sentCampaigns.length}</span>
              <Send className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">
                {totalSent.toLocaleString()}
              </span>
              <BarChart3 className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Avg Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{avgOpenRate}</span>
              <MousePointerClick className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search campaigns…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="sm:max-w-[180px]"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_queue">In Queue</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Mailing List</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Recipients</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Opened</TableHead>
                    <TableHead className="text-right">Clicked</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-10"
                      >
                        No campaigns found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(campaign => (
                    <>
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          {campaign.name}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-muted-foreground">
                          {campaign.subject}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {campaign.mailing_list_name || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[campaign.status]}>
                            {STATUS_LABELS[campaign.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.total_recipients?.toLocaleString() ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.total_sent?.toLocaleString() ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtPct(campaign.total_opened, campaign.total_sent)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtPct(campaign.total_clicked, campaign.total_sent)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {campaign.status === 'sent'
                            ? fmtDate(campaign.sent_at)
                            : fmtDate(campaign.scheduled_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {campaign.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => {
                                  setSchedulingId(
                                    schedulingId === campaign.id
                                      ? null
                                      : campaign.id,
                                  );
                                  setScheduleValue('');
                                }}
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                                Schedule
                              </Button>
                            )}
                            {(campaign.status === 'draft' ||
                              campaign.status === 'in_queue') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => handleSendNow(campaign)}
                              >
                                <SendHorizonal className="w-3.5 h-3.5" />
                                Send
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => openEdit(campaign)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(campaign.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Inline schedule row */}
                      {schedulingId === campaign.id && (
                        <TableRow key={`${campaign.id}-schedule`} className="bg-muted/30">
                          <TableCell colSpan={10}>
                            <div className="flex items-center gap-3 py-1">
                              <Label className="text-sm shrink-0">
                                Schedule for:
                              </Label>
                              <Input
                                type="datetime-local"
                                className="max-w-xs h-8"
                                value={scheduleValue}
                                onChange={e =>
                                  setScheduleValue(e.target.value)
                                }
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => handleSchedule(campaign)}
                                disabled={scheduling}
                              >
                                {scheduling && (
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                )}
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => setSchedulingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New/Edit Campaign Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editId ? 'Edit Campaign' : 'New Campaign'}
            </SheetTitle>
            <SheetDescription>
              {editId
                ? 'Update campaign details.'
                : 'Create a new email marketing campaign.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="c-name">Campaign Name *</Label>
                <Input
                  id="c-name"
                  placeholder="Spring Newsletter"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="c-subject">Subject Line *</Label>
                <Input
                  id="c-subject"
                  placeholder="Your April update is here 🌸"
                  value={form.subject}
                  onChange={e =>
                    setForm(f => ({ ...f, subject: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="c-preview">Preview Text</Label>
                <Input
                  id="c-preview"
                  placeholder="A quick summary shown in inbox previews…"
                  value={form.preview_text}
                  onChange={e =>
                    setForm(f => ({ ...f, preview_text: e.target.value }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* From */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-from-name">From Name</Label>
                <Input
                  id="c-from-name"
                  placeholder="Acme Corp"
                  value={form.from_name}
                  onChange={e =>
                    setForm(f => ({ ...f, from_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-from-email">From Email</Label>
                <Input
                  id="c-from-email"
                  type="email"
                  placeholder="news@acme.com"
                  value={form.from_email}
                  onChange={e =>
                    setForm(f => ({ ...f, from_email: e.target.value }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Mailing list + status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-list">Mailing List</Label>
                <Select
                  id="c-list"
                  value={form.mailing_list_id}
                  onChange={e => handleListChange(e.target.value)}
                >
                  <option value="">— Select a list —</option>
                  {mailingLists.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-status">Status</Label>
                <Select
                  id="c-status"
                  value={form.status}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      status: e.target.value as CampaignStatus,
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="in_queue">In Queue</option>
                  <option value="sending">Sending</option>
                  <option value="sent">Sent</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-scheduled">Scheduled At</Label>
                <Input
                  id="c-scheduled"
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e =>
                    setForm(f => ({ ...f, scheduled_at: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-recipients">Total Recipients</Label>
                <Input
                  id="c-recipients"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.total_recipients}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      total_recipients:
                        e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Body HTML */}
            <div className="space-y-1.5">
              <Label htmlFor="c-body">Email Body (HTML)</Label>
              <Textarea
                id="c-body"
                placeholder="<h1>Hello!</h1><p>Your email content here…</p>"
                rows={10}
                className="font-mono text-xs"
                value={form.body_html}
                onChange={e =>
                  setForm(f => ({ ...f, body_html: e.target.value }))
                }
              />
            </div>
          </div>

          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              )}
              {editId ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
