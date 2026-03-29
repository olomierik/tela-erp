import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import {
  Users, Shield, Store, Clock, UserPlus, Trash2, Edit2,
  Mail, MoreHorizontal, RefreshCw, AlertCircle,
  CheckCircle2, Building2, Copy, Link2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import EmptyState from '@/components/erp/EmptyState';

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  store_assignments: Array<{ store_id: string; store_name: string; role: string }>;
  is_active: boolean;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  reseller: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  store_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const MODULES = [
  'Dashboard', 'Sales', 'Invoices', 'Inventory', 'Procurement', 'Production',
  'CRM', 'HR', 'Accounting', 'Reports', 'Projects', 'Marketing',
];

const DEFAULT_PERMISSIONS: Record<string, boolean[][]> = {
  admin: MODULES.map(() => [true, true, true, true, true]),
  user: MODULES.map(() => [true, true, true, false, false]),
  viewer: MODULES.map(() => [true, false, false, false, false]),
};

export default function Team() {
  const { tenant, role, isDemo } = useAuth();
  const { stores } = useStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteStore, setInviteStore] = useState('');
  const [inviteStoreRole, setInviteStoreRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState('user');

  const loadMembers = async () => {
    setLoading(true);
    if (isDemo || !tenant?.id) {
      setMembers([
        {
          id: '1', user_id: '1', full_name: 'Alice Johnson', email: 'alice@demo.com', role: 'admin',
          store_assignments: [{ store_id: '1', store_name: 'Main Store', role: 'store_admin' }],
          is_active: true, created_at: new Date().toISOString(),
        },
        {
          id: '2', user_id: '2', full_name: 'Bob Smith', email: 'bob@demo.com', role: 'user',
          store_assignments: [
            { store_id: '1', store_name: 'Main Store', role: 'user' },
            { store_id: '2', store_name: 'Branch A', role: 'viewer' },
          ],
          is_active: true, created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: '3', user_id: '3', full_name: 'Carol Williams', email: 'carol@demo.com', role: 'user',
          store_assignments: [{ store_id: '2', store_name: 'Branch A', role: 'store_admin' }],
          is_active: false, created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }
    try {
      const [profilesRes, rolesRes, storeAssignRes, storesRes] = await Promise.all([
        (supabase.from('profiles') as any).select('*').eq('tenant_id', tenant.id),
        (supabase.from('user_roles') as any).select('user_id, role'),
        (supabase.from('user_store_assignments') as any).select('user_id, store_id, role').eq('tenant_id', tenant.id),
        (supabase.from('stores') as any).select('id, name').eq('tenant_id', tenant.id),
      ]);
      const storeMap: Record<string, string> = Object.fromEntries((storesRes.data ?? []).map((s: any) => [s.id, s.name]));
      const roleMap: Record<string, string> = Object.fromEntries((rolesRes.data ?? []).map((r: any) => [r.user_id, r.role]));
      const assignMap: Record<string, any[]> = {};
      for (const a of (storeAssignRes.data ?? [])) {
        if (!assignMap[a.user_id]) assignMap[a.user_id] = [];
        assignMap[a.user_id].push({ store_id: a.store_id, store_name: storeMap[a.store_id] ?? 'Unknown', role: a.role });
      }
      setMembers((profilesRes.data ?? []).map((p: any) => ({
        id: p.id, user_id: p.user_id,
        full_name: p.full_name ?? 'Unknown',
        email: p.email ?? '',
        role: roleMap[p.user_id] ?? 'user',
        store_assignments: assignMap[p.user_id] ?? [],
        is_active: p.is_active ?? true,
        created_at: p.created_at,
      })));
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMembers(); }, [tenant?.id, isDemo]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      if (isDemo) {
        const demoLink = `${window.location.origin}/join/demo-invite-id`;
        setInviteLink(demoLink);
        setInviteOpen(false);
        setLinkDialogOpen(true);
        return;
      }

      // Insert invite record directly into team_invites table
      const { data, error } = await (supabase.from as any)('team_invites').insert({
        tenant_id: tenant!.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        store_id: inviteStore || null,
        store_role: inviteStore ? inviteStoreRole : null,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).select('id').single();

      if (error) throw error;

      const link = `${window.location.origin}/join/${data.id}`;
      setInviteLink(link);
      setInviteOpen(false);
      setInviteEmail(''); setInviteRole('user'); setInviteStore(''); setInviteStoreRole('user');
      setLinkDialogOpen(true);
      loadMembers();
    } catch (e: any) { toast.error(e.message ?? 'Failed to create invite'); }
    finally { setInviting(false); }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`You've been invited to join our team on TELA-ERP. Click this link to create your account:\n${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleUpdateRole = async () => {
    if (!selectedMember || isDemo) { toast.info('Demo mode'); return; }
    try {
      await (supabase.from('user_roles') as any)
        .upsert({ user_id: selectedMember.user_id, role: editingRole });
      toast.success('Role updated');
      setEditRoleOpen(false);
      loadMembers();
    } catch { toast.error('Failed to update role'); }
  };

  const handleRemove = async (member: Member) => {
    if (isDemo) { toast.info('Demo mode'); return; }
    if (!confirm(`Remove ${member.full_name}?`)) return;
    try {
      await (supabase.from('user_store_assignments') as any).delete().eq('user_id', member.user_id);
      toast.success('Member removed');
      loadMembers();
    } catch { toast.error('Failed'); }
  };

  return (
    <AppLayout title="Team & Permissions" subtitle="Manage users, roles, and store access">
      <div className="max-w-6xl">
        <PageHeader
          title="Team & Permissions"
          subtitle="Manage team members, roles, and multi-store access control"
          icon={Users}
          breadcrumb={[{ label: 'Settings', href: '/settings' }, { label: 'Team' }]}
          actions={[
            { label: 'Refresh', icon: RefreshCw, onClick: loadMembers, variant: 'outline' },
            { label: 'Invite Member', icon: UserPlus, onClick: () => setInviteOpen(true) },
          ]}
          stats={[
            { label: 'Total Members', value: members.length },
            { label: 'Active', value: members.filter(m => m.is_active).length },
            { label: 'Admins', value: members.filter(m => m.role === 'admin').length },
            { label: 'Stores', value: stores.length },
          ]}
        />

        <Tabs defaultValue="members">
          <TabsList className="mb-6">
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Members
              <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{members.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="store-access" className="gap-1.5">
              <Store className="w-3.5 h-3.5" /> Store Access
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Permissions Matrix
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Members */}
          <TabsContent value="members">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : members.length === 0 ? (
              <EmptyState icon={Users} title="No team members" description="Invite team members to collaborate."
                action={{ label: 'Invite Member', onClick: () => setInviteOpen(true) }} />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {['Member', 'Role', 'Store Access', 'Joined', 'Status', ''].map(h => (
                        <th key={h} className={cn(
                          'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide',
                          h === 'Role' && 'hidden sm:table-cell',
                          h === 'Store Access' && 'hidden md:table-cell',
                          h === 'Joined' && 'hidden lg:table-cell',
                          h === '' && 'w-12',
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((m, i) => (
                      <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 text-sm font-bold">
                                {m.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{m.full_name}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', ROLE_COLORS[m.role] ?? ROLE_COLORS.user)}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {m.store_assignments.length === 0
                              ? <span className="text-xs text-muted-foreground">No stores</span>
                              : m.store_assignments.slice(0, 2).map((a, j) => (
                                <span key={j} className="text-[10px] bg-muted rounded-md px-2 py-0.5 flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5 text-muted-foreground" />{a.store_name}
                                </span>
                              ))
                            }
                            {m.store_assignments.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{m.store_assignments.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('w-1.5 h-1.5 rounded-full', m.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                            <span className="text-xs text-muted-foreground">{m.is_active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => { setSelectedMember(m); setEditingRole(m.role); setEditRoleOpen(true); }}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleRemove(m)}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Store Access Matrix */}
          <TabsContent value="store-access">
            {stores.length === 0 ? (
              <EmptyState icon={Building2} title="No stores" description="Create stores first to manage access." />
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[160px]">Member</th>
                      {stores.map(s => (
                        <th key={s.id} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{s.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700">{m.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">{m.full_name}</span>
                          </div>
                        </td>
                        {stores.map(store => {
                          const a = m.store_assignments.find(x => x.store_id === store.id);
                          return (
                            <td key={store.id} className="px-4 py-3 text-center">
                              {a ? (
                                <div className="flex flex-col items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', ROLE_COLORS[a.role] ?? ROLE_COLORS.user)}>
                                    {a.role === 'store_admin' ? 'admin' : a.role}
                                  </span>
                                </div>
                              ) : <div className="w-4 h-4 rounded-full border border-dashed border-border mx-auto" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Permissions Matrix */}
          <TabsContent value="permissions">
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[140px]">Module</th>
                    {['Admin', 'User', 'Viewer'].map(r => (
                      <th key={r} colSpan={5} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground border-l border-border">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs capitalize', ROLE_COLORS[r.toLowerCase()] ?? ROLE_COLORS.user)}>{r}</span>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-5 py-1.5" />
                    {['Admin','User','Viewer'].map(r =>
                      ['View','Create','Edit','Delete','Export'].map((p, j) => (
                        <th key={`${r}-${p}`} className={cn('px-2 py-1.5 text-center text-[10px] text-muted-foreground', j === 0 && 'border-l border-border')}>{p}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MODULES.map((mod, mi) => (
                    <tr key={mod} className="hover:bg-muted/20">
                      <td className="px-5 py-2 font-medium text-sm">{mod}</td>
                      {['admin','user','viewer'].map((r, ri) =>
                        DEFAULT_PERMISSIONS[r][mi].map((val, pi) => (
                          <td key={`${r}-${pi}`} className={cn('px-2 py-2 text-center', pi === 0 && 'border-l border-border')}>
                            {val
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                              : <div className="w-3.5 h-3.5 rounded border border-dashed border-border/50 mx-auto" />}
                          </td>
                        ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Audit Log */}
          <TabsContent value="audit">
            <EmptyState icon={Clock} title="Audit log" description="Role changes, invitations, and store assignment updates will appear here." size="md" />
          </TabsContent>
        </Tabs>

        {/* Invite Sheet */}
        <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
          <SheetContent className="w-full sm:max-w-[440px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-600" /> Invite Team Member</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>App Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="user">User — Standard access</SelectItem>
                    <SelectItem value="viewer">Viewer — Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {stores.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to Store (optional)</Label>
                  <Select value={inviteStore} onValueChange={setInviteStore}>
                    <SelectTrigger><SelectValue placeholder="No store assignment" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No store assignment</SelectItem>
                      {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {inviteStore && (
                    <Select value={inviteStoreRole} onValueChange={setInviteStoreRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store_admin">Store Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  A shareable invite link will be generated — no email required.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Share it via WhatsApp, SMS, or any channel. Expires in 7 days.</p>
              </div>
            </div>
            <SheetFooter className="mt-8 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!inviteEmail.trim() || inviting} onClick={handleInvite}>
                {inviting ? 'Creating...' : <><Link2 className="w-4 h-4 mr-1.5" />Generate Invite Link</>}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Invite Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Invite Link Ready
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Share this link with the person you're inviting. They'll create an account and be instantly added to your team.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border">
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground flex-1 truncate font-mono">{inviteLink}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={copyInviteLink} variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" /> Copy Link
                </Button>
                <Button onClick={shareWhatsApp} className="gap-2 bg-[#25D366] hover:bg-[#22c55e] text-white border-0">
                  <Mail className="w-4 h-4" /> Send via WhatsApp
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Link expires in 7 days</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)} className="w-full">Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Change Role — {selectedMember?.full_name}</DialogTitle></DialogHeader>
            <div className="space-y-2.5 py-2">
              {(['admin','user','viewer'] as const).map(r => (
                <div key={r} onClick={() => setEditingRole(r)} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                  editingRole === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                )}>
                  <div className={cn('w-3 h-3 rounded-full border-2', editingRole === r ? 'border-primary bg-primary' : 'border-muted-foreground')} />
                  <div>
                    <p className="font-medium text-sm capitalize">{r}</p>
                    <p className="text-xs text-muted-foreground">
                      {r === 'admin' ? 'Full access to all modules' : r === 'user' ? 'Standard access, no delete' : 'Read-only access'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateRole}>Update Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
