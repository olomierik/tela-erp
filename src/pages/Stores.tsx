import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Store, Plus, Users, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Stores() {
  const { tenant, isDemo } = useAuth();
  const { stores, isStoreAdmin, refetchStores } = useStore();
  const qc = useQueryClient();
  const [newStore, setNewStore] = useState({ name: '', location: '', address: '' });
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('user');

  // Fetch assignments for all stores
  const { data: assignments = [] } = useQuery({
    queryKey: ['user_store_assignments', tenant?.id],
    queryFn: async () => {
      if (isDemo || !tenant?.id) return [];
      const { data, error } = await (supabase.from('user_store_assignments') as any)
        .select('*, profiles:user_id(full_name, email)')
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !isDemo && !!tenant?.id,
  });

  const handleCreateStore = async () => {
    if (!newStore.name.trim() || isDemo) return;
    try {
      const { error } = await (supabase.from('stores') as any)
        .insert({ tenant_id: tenant!.id, name: newStore.name, location: newStore.location, address: newStore.address });
      if (error) throw error;
      toast.success('Store created');
      setNewStore({ name: '', location: '', address: '' });
      setAddStoreOpen(false);
      refetchStores();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (isDemo) return;
    const { error } = await (supabase.from('stores') as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Store deleted');
    refetchStores();
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteOpen || isDemo) return;
    try {
      const { data, error } = await supabase.functions.invoke('invite-store-user', {
        body: {
          email: inviteEmail.trim(),
          store_id: inviteOpen,
          role: inviteRole,
          full_name: '',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || 'Invitation sent!');
      setInviteEmail('');
      setInviteOpen(null);
      qc.invalidateQueries({ queryKey: ['user_store_assignments'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (isDemo) return;
    const { error } = await (supabase.from('user_store_assignments') as any).delete().eq('id', assignmentId);
    if (error) { toast.error(error.message); return; }
    toast.success('User removed from store');
    qc.invalidateQueries({ queryKey: ['user_store_assignments'] });
  };

  if (!isStoreAdmin) {
    return (
      <AppLayout title="Stores" subtitle="Store management">
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          You don't have permission to manage stores.
        </CardContent></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Stores" subtitle="Manage your store locations & team">
      <div className="flex items-center justify-between mb-5">
        <Badge variant="secondary" className="text-xs">{stores.length} Store{stores.length !== 1 ? 's' : ''}</Badge>
        <Dialog open={addStoreOpen} onOpenChange={setAddStoreOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Store</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Store</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Store Name *</Label><Input value={newStore.name} onChange={e => setNewStore(p => ({ ...p, name: e.target.value }))} placeholder="Main Branch" /></div>
              <div><Label>Location</Label><Input value={newStore.location} onChange={e => setNewStore(p => ({ ...p, location: e.target.value }))} placeholder="Dar es Salaam" /></div>
              <div><Label>Address</Label><Input value={newStore.address} onChange={e => setNewStore(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" /></div>
              <Button onClick={handleCreateStore} className="w-full">Create Store</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stores.map(store => {
          const storeAssignments = assignments.filter((a: any) => a.store_id === store.id);
          return (
            <Card key={store.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm">{store.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteStore(store.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {store.location && <p className="text-xs text-muted-foreground">{store.location}</p>}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground"><Users className="w-3 h-3 inline mr-1" />{storeAssignments.length} user{storeAssignments.length !== 1 ? 's' : ''}</span>
                    <Dialog open={inviteOpen === store.id} onOpenChange={o => setInviteOpen(o ? store.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Mail className="w-3 h-3" /> Assign User</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Assign User to {store.name}</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div><Label>User Email</Label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@company.com" /></div>
                          <div><Label>Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="store_admin">Store Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleInviteUser} className="w-full">Assign User</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {storeAssignments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                      <div>
                        <p className="text-xs font-medium">{a.profiles?.full_name || a.profiles?.email || 'Unknown'}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{a.role}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAssignment(a.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
