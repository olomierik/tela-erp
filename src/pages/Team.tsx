import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Users, Shield, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Team() {
  const { tenant, isDemo } = useAuth();
  const [search, setSearch] = useState('');

  // Fetch all profiles for this tenant
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['team_profiles', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Get roles for each user
      const userIds = data.map((p: any) => p.user_id);
      const { data: roles } = await (supabase.from('user_roles') as any)
        .select('user_id, role')
        .in('user_id', userIds);

      // Get store assignments
      const { data: storeAssigns } = await (supabase.from('user_store_assignments') as any)
        .select('user_id, store_id, role')
        .eq('tenant_id', tenant.id);

      // Get stores
      const { data: stores } = await (supabase.from('stores') as any)
        .select('id, name')
        .eq('tenant_id', tenant.id);

      const roleMap = new Map();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      const storeMap = new Map();
      (stores ?? []).forEach((s: any) => storeMap.set(s.id, s.name));

      const assignMap = new Map<string, { store: string; role: string }[]>();
      (storeAssigns ?? []).forEach((a: any) => {
        const list = assignMap.get(a.user_id) || [];
        list.push({ store: storeMap.get(a.store_id) || 'Unknown', role: a.role });
        assignMap.set(a.user_id, list);
      });

      return data.map((p: any) => ({
        ...p,
        app_role: roleMap.get(p.user_id) || 'user',
        store_assignments: assignMap.get(p.user_id) || [],
      }));
    },
    enabled: !isDemo && !!tenant?.id,
  });

  const demoMembers = [
    { id: '1', full_name: 'Alex Morgan', email: 'admin@tela-erp.com', app_role: 'admin', is_active: true, created_at: '2026-03-01', store_assignments: [{ store: 'Main Store', role: 'store_admin' }] },
    { id: '2', full_name: 'Sarah Chen', email: 'sarah@tela-erp.com', app_role: 'user', is_active: true, created_at: '2026-03-05', store_assignments: [{ store: 'Main Store', role: 'user' }] },
    { id: '3', full_name: 'James Wilson', email: 'james@tela-erp.com', app_role: 'user', is_active: true, created_at: '2026-03-08', store_assignments: [{ store: 'Branch A', role: 'user' }] },
  ];

  const members = isDemo ? demoMembers : profiles;
  const filtered = members.filter((m: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.full_name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s);
  });

  const roleVariant = (role: string) => {
    if (role === 'admin' || role === 'reseller') return 'info';
    return 'default';
  };

  return (
    <AppLayout title="Team Management" subtitle="All users in your organization">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Members</p>
          <p className="text-lg font-bold text-foreground">{members.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="text-lg font-bold text-foreground">{members.filter((m: any) => m.app_role === 'admin' || m.app_role === 'reseller').length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-lg font-bold text-foreground">{members.filter((m: any) => m.is_active !== false).length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Stores</p>
          <p className="text-lg font-bold text-foreground">{new Set(members.flatMap((m: any) => m.store_assignments?.map((s: any) => s.store) || [])).size}</p>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search members..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Name', 'Email', 'Role', 'Stores', 'Status', 'Joined'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: any) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{m.full_name || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.email}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={m.app_role} variant={roleVariant(m.app_role)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {m.store_assignments?.length > 0 ? m.store_assignments.map((s: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {s.store} ({s.role})
                          </Badge>
                        )) : <span className="text-xs text-muted-foreground">No store</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={m.is_active !== false ? 'Active' : 'Inactive'} variant={m.is_active !== false ? 'success' : 'default'} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No team members found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
