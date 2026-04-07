import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTable } from '@/lib/useTable';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  List,
  Users,
  UserCheck,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MailingList extends Record<string, unknown> {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface MailingContact extends Record<string, unknown> {
  id: string;
  list_id: string;
  email: string;
  name: string;
  is_unsubscribed: boolean;
  created_at: string;
}

// ─── Form state interfaces (NOT extending Record<string,unknown>) ──────────────

interface ListForm {
  name: string;
  description: string;
  is_public: boolean;
}

interface ContactForm {
  email: string;
  name: string;
}

const emptyListForm: ListForm = { name: '', description: '', is_public: false };
const emptyContactForm: ContactForm = { email: '', name: '' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function MailingLists() {
  const { rows: lists, loading, insert, update, remove } =
    useTable<MailingList>('myerp_mailing_lists');

  // KPI counts fetched directly
  const [totalContacts, setTotalContacts] = useState(0);
  const [activeContacts, setActiveContacts] = useState(0);

  // List sheet state
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [listForm, setListForm] = useState<ListForm>(emptyListForm);
  const [savingList, setSavingList] = useState(false);

  // Contacts sheet state
  const [contactsSheetOpen, setContactsSheetOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<MailingList | null>(null);
  const [contacts, setContacts] = useState<MailingContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [savingContact, setSavingContact] = useState(false);

  // Per-list contact counts (lazy)
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});

  // ── Fetch KPI counts ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchKpis() {
      const { count: total } = await supabase
        .from('myerp_mailing_contacts')
        .select('*', { count: 'exact', head: true });
      const { count: active } = await supabase
        .from('myerp_mailing_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('is_unsubscribed', false);
      setTotalContacts(total ?? 0);
      setActiveContacts(active ?? 0);
    }
    fetchKpis();
  }, [contacts]); // re-run when contacts change (after adds)

  // ── Per-list contact count ────────────────────────────────────────────────

  async function fetchCountForList(listId: string) {
    const { count } = await supabase
      .from('myerp_mailing_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId);
    setContactCounts(prev => ({ ...prev, [listId]: count ?? 0 }));
  }

  // ── Open contacts sheet ───────────────────────────────────────────────────

  async function openContacts(list: MailingList) {
    setSelectedList(list);
    setContactForm(emptyContactForm);
    setContactsSheetOpen(true);
    setContactsLoading(true);
    const { data, error } = await supabase
      .from('myerp_mailing_contacts')
      .select('*')
      .eq('list_id', list.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load contacts');
    } else {
      setContacts((data ?? []) as MailingContact[]);
    }
    setContactsLoading(false);
    fetchCountForList(list.id);
  }

  // ── Add contact ───────────────────────────────────────────────────────────

  async function handleAddContact() {
    if (!contactForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!selectedList) return;
    setSavingContact(true);
    try {
      const { data, error } = await supabase
        .from('myerp_mailing_contacts')
        .insert({
          list_id: selectedList.id,
          email: contactForm.email.trim(),
          name: contactForm.name.trim(),
          is_unsubscribed: false,
        })
        .select()
        .single();
      if (error) throw error;
      setContacts(prev => [data as MailingContact, ...prev]);
      setContactForm(emptyContactForm);
      toast.success('Contact added');
      fetchCountForList(selectedList.id);
    } catch {
      toast.error('Failed to add contact');
    } finally {
      setSavingContact(false);
    }
  }

  // ── List CRUD ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null);
    setListForm(emptyListForm);
    setListSheetOpen(true);
  }

  function openEdit(list: MailingList) {
    setEditId(list.id);
    setListForm({
      name: list.name,
      description: list.description ?? '',
      is_public: list.is_public,
    });
    setListSheetOpen(true);
  }

  async function handleSaveList() {
    if (!listForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingList(true);
    try {
      if (editId) {
        await update(editId, {
          name: listForm.name.trim(),
          description: listForm.description.trim(),
          is_public: listForm.is_public,
        });
        toast.success('List updated');
      } else {
        await insert({
          name: listForm.name.trim(),
          description: listForm.description.trim(),
          is_public: listForm.is_public,
        });
        toast.success('List created');
      }
      setListSheetOpen(false);
    } catch {
      toast.error('Failed to save list');
    } finally {
      setSavingList(false);
    }
  }

  async function handleDeleteList(id: string) {
    try {
      await remove(id);
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete list');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Mailing Lists">
      <PageHeader
        title="Mailing Lists"
        subtitle="Manage your email marketing lists and subscriber contacts."
        action={{ label: 'New List', onClick: openCreate }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Lists
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{lists.length}</span>
              <List className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{totalContacts}</span>
              <Users className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{activeContacts}</span>
              <UserCheck className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead>Public</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-10"
                    >
                      No mailing lists found. Create your first list.
                    </TableCell>
                  </TableRow>
                )}
                {lists.map(list => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {list.description || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {contactCounts[list.id] !== undefined
                        ? contactCounts[list.id]
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={list.is_public ? 'success' : 'outline'}>
                        {list.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(list.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={() => openContacts(list)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Contacts
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(list)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteList(list.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New/Edit List Sheet */}
      <Sheet open={listSheetOpen} onOpenChange={setListSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editId ? 'Edit List' : 'New Mailing List'}</SheetTitle>
            <SheetDescription>
              {editId
                ? 'Update the details of this mailing list.'
                : 'Create a new mailing list to send campaigns to.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="list-name">Name *</Label>
              <Input
                id="list-name"
                placeholder="Newsletter Subscribers"
                value={listForm.name}
                onChange={e =>
                  setListForm(f => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="list-desc">Description</Label>
              <Textarea
                id="list-desc"
                placeholder="Brief description of this list…"
                rows={3}
                value={listForm.description}
                onChange={e =>
                  setListForm(f => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Public List</Label>
                <p className="text-xs text-muted-foreground">
                  Allow people to subscribe via a public link.
                </p>
              </div>
              <Switch
                checked={listForm.is_public}
                onCheckedChange={val =>
                  setListForm(f => ({ ...f, is_public: val }))
                }
              />
            </div>
          </div>

          <SheetFooter className="mt-8 gap-2">
            <Button variant="outline" onClick={() => setListSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveList} disabled={savingList}>
              {savingList && (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              )}
              {editId ? 'Save Changes' : 'Create List'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* View Contacts Sheet */}
      <Sheet open={contactsSheetOpen} onOpenChange={setContactsSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle>
              {selectedList?.name ?? 'Contacts'}
            </SheetTitle>
            <SheetDescription>
              Manage subscriber contacts for this list.
            </SheetDescription>
          </SheetHeader>

          {/* Add Contact inline form */}
          <div className="rounded-lg border p-4 mb-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Contact
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email *</Label>
                <Input
                  id="c-email"
                  type="email"
                  placeholder="user@example.com"
                  value={contactForm.email}
                  onChange={e =>
                    setContactForm(f => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  placeholder="Jane Doe"
                  value={contactForm.name}
                  onChange={e =>
                    setContactForm(f => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAddContact}
              disabled={savingContact}
              className="w-full sm:w-auto"
            >
              {savingContact && (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              )}
              Add Contact
            </Button>
          </div>

          <Separator className="mb-4" />

          {/* Contacts table */}
          {contactsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground py-8"
                    >
                      No contacts yet. Add the first one above.
                    </TableCell>
                  </TableRow>
                )}
                {contacts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.is_unsubscribed ? 'destructive' : 'success'}
                      >
                        {c.is_unsubscribed ? 'Unsubscribed' : 'Subscribed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
