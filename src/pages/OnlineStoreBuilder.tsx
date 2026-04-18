import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Globe, Plus, ExternalLink, Settings, Trash2, Eye, EyeOff, Palette, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OnlineStore {
  id: string;
  tenant_id: string;
  store_id: string | null;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_published: boolean;
  settings: any;
  created_at: string;
}

export default function OnlineStoreBuilder() {
  const { tenant, isDemo } = useAuth();
  const { stores } = useStore();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editStore, setEditStore] = useState<OnlineStore | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', store_id: '', primary_color: '#3B82F6', secondary_color: '#10B981' });

  const { data: onlineStores = [], isLoading } = useQuery<OnlineStore[]>({
    queryKey: ['online_stores', tenant?.id],
    queryFn: async () => {
      if (isDemo || !tenant?.id) return [];
      const { data, error } = await (supabase.from('online_stores') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !isDemo && !!tenant?.id,
  });

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug are required'); return; }
    try {
      const { error } = await (supabase.from('online_stores') as any).insert({
        tenant_id: tenant?.id,
        store_id: form.store_id || null,
        slug: form.slug,
        name: form.name,
        description: form.description,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
      });
      if (error) throw error;
      toast.success('Online store created!');
      setCreateOpen(false);
      setForm({ name: '', slug: '', description: '', store_id: '', primary_color: '#3B82F6', secondary_color: '#10B981' });
      qc.invalidateQueries({ queryKey: ['online_stores'] });
    } catch (e: any) {
      toast.error(e.message?.includes('unique') ? 'Slug already taken' : e.message);
    }
  };

  const togglePublish = async (store: OnlineStore) => {
    const { error } = await (supabase.from('online_stores') as any)
      .update({ is_published: !store.is_published })
      .eq('id', store.id);
    if (error) { toast.error(error.message); return; }
    toast.success(store.is_published ? 'Store unpublished' : 'Store published!');
    qc.invalidateQueries({ queryKey: ['online_stores'] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from('online_stores') as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Store deleted');
    qc.invalidateQueries({ queryKey: ['online_stores'] });
  };

  const handleUpdate = async () => {
    if (!editStore) return;
    const { error } = await (supabase.from('online_stores') as any)
      .update({
        name: form.name,
        description: form.description,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        store_id: form.store_id || null,
      })
      .eq('id', editStore.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Store updated!');
    setEditStore(null);
    qc.invalidateQueries({ queryKey: ['online_stores'] });
  };

  const storeUrl = (slug: string) => `${window.location.origin}/store/${slug}`;

  return (
    <AppLayout title="Online Store Builder" subtitle="Create and manage your public storefronts">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{onlineStores.length} Store{onlineStores.length !== 1 ? 's' : ''}</Badge>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Create Online Store</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Online Store</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Store Name *</Label>
                <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) })); }} placeholder="My Online Shop" />
              </div>
              <div>
                <Label>Store URL Slug *</Label>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Globe className="w-3 h-3" /> {window.location.origin}/store/<span className="font-mono text-primary">{form.slug || '...'}</span>
                </div>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: generateSlug(e.target.value) }))} placeholder="my-shop" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Welcome to our store..." rows={2} />
              </div>
              <div>
                <Label>Linked Physical Store (optional)</Label>
                <Select value={form.store_id || 'none'} onValueChange={v => setForm(f => ({ ...f, store_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="All stores / None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Stores (company-wide)</SelectItem>
                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                    <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                    <Input value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="font-mono text-xs" />
                  </div>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Create Store</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {onlineStores.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Online Stores Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Create your first online storefront to start selling products to customers. Your ERP inventory syncs automatically.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Your First Store</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {onlineStores.map(store => (
          <Card key={store.id} className="relative overflow-hidden">
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${store.primary_color}, ${store.secondary_color})` }} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{store.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">/store/{store.slug}</CardDescription>
                </div>
                <Badge variant={store.is_published ? 'default' : 'secondary'}>
                  {store.is_published ? 'Live' : 'Draft'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {store.description && <p className="text-xs text-muted-foreground line-clamp-2">{store.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => togglePublish(store)}>
                  {store.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {store.is_published ? 'Unpublish' : 'Publish'}
                </Button>
                {store.is_published && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={storeUrl(store.slug)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" /> Visit
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  setEditStore(store);
                  setForm({ name: store.name, slug: store.slug, description: store.description || '', store_id: store.store_id || '', primary_color: store.primary_color, secondary_color: store.secondary_color });
                }}>
                  <Settings className="w-3 h-3" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(store.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editStore} onOpenChange={o => !o && setEditStore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Store Settings</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Store Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Linked Physical Store</Label>
              <Select value={form.store_id || 'none'} onValueChange={v => setForm(f => ({ ...f, store_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Stores</SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Primary</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Secondary</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                  <Input value={form.secondary_color} onChange={e => setForm(f => ({ ...f, secondary_color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
