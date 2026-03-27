import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/erp/PageHeader';
import DataTable, { Column } from '@/components/erp/DataTable';
import {
  Building, Plus, Wrench, TrendingDown, DollarSign, AlertTriangle,
  CheckCircle2, PlayCircle, ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  disposed: 'bg-slate-100 text-slate-600',
  under_maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  fully_depreciated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const CATEGORIES = ['equipment', 'furniture', 'vehicle', 'property', 'software', 'intangible', 'other'];

export default function FixedAssets() {
  const { tenant, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    asset_number: `AST-${Date.now().toString(36).toUpperCase()}`,
    name: '', category: 'equipment', purchase_date: '',
    purchase_cost: '', salvage_value: '0', useful_life_years: '5',
    depreciation_method: 'straight_line', location: '', serial_number: '',
  });

  const { data: rawData, isLoading } = useTenantQuery('fixed_assets' as any);
  const insertAsset = useTenantInsert('fixed_assets' as any);
  const deleteAsset = useTenantDelete('fixed_assets' as any);

  const demoData = [
    { id: '1', asset_number: 'AST-001', name: 'Server Rack A', category: 'equipment', purchase_cost: 18500, current_value: 12400, accumulated_depreciation: 6100, status: 'active', location: 'Data Center', purchase_date: '2022-01-15', useful_life_years: 5, depreciation_method: 'straight_line' },
    { id: '2', asset_number: 'AST-002', name: 'Company Vehicle #1', category: 'vehicle', purchase_cost: 42000, current_value: 28500, accumulated_depreciation: 13500, status: 'active', location: 'Main Office', purchase_date: '2021-06-10', useful_life_years: 7, depreciation_method: 'declining_balance' },
    { id: '3', asset_number: 'AST-003', name: 'Office Renovation', category: 'property', purchase_cost: 85000, current_value: 68000, accumulated_depreciation: 17000, status: 'active', location: 'HQ Floor 3', purchase_date: '2020-03-01', useful_life_years: 20, depreciation_method: 'straight_line' },
    { id: '4', asset_number: 'AST-004', name: 'CRM Software License', category: 'software', purchase_cost: 12000, current_value: 4000, accumulated_depreciation: 8000, status: 'active', location: 'Cloud', purchase_date: '2021-01-01', useful_life_years: 3, depreciation_method: 'straight_line' },
    { id: '5', asset_number: 'AST-005', name: 'Laptop Fleet (20x)', category: 'equipment', purchase_cost: 30000, current_value: 0, accumulated_depreciation: 30000, status: 'fully_depreciated', location: 'Various', purchase_date: '2019-09-01', useful_life_years: 4, depreciation_method: 'straight_line' },
  ];

  const assets: any[] = (isDemo ? demoData : rawData) ?? [];

  const totalValue = assets.reduce((s, a) => s + Number(a.current_value ?? a.purchase_cost ?? 0), 0);
  const totalCost = assets.reduce((s, a) => s + Number(a.purchase_cost ?? 0), 0);
  const totalDepreciation = assets.reduce((s, a) => s + Number(a.accumulated_depreciation ?? 0), 0);
  const activeCount = assets.filter(a => a.status === 'active').length;

  const runDepreciation = async () => {
    if (isDemo) { toast.success('Depreciation run completed (demo). Journal entries created.'); return; }
    toast.info('Calculating depreciation for active assets...');
    let count = 0;
    for (const asset of assets.filter(a => a.status === 'active')) {
      const annualDep = (Number(asset.purchase_cost) - Number(asset.salvage_value ?? 0)) / Number(asset.useful_life_years ?? 5);
      const monthlyDep = annualDep / 12;
      await (supabase.from('asset_depreciation_entries') as any).insert({
        tenant_id: tenant?.id,
        asset_id: asset.id,
        period_date: new Date().toISOString().slice(0, 10),
        depreciation_amount: monthlyDep,
        book_value_after: Math.max(0, Number(asset.current_value) - monthlyDep),
      });
      await (supabase.from('fixed_assets') as any)
        .update({ accumulated_depreciation: Number(asset.accumulated_depreciation ?? 0) + monthlyDep, current_value: Math.max(0, Number(asset.current_value) - monthlyDep) })
        .eq('id', asset.id);
      // Create accounting journal entry
      await (supabase.from('transactions') as any).insert({
        tenant_id: tenant?.id, type: 'expense', category: 'Depreciation',
        amount: monthlyDep,
        description: `Monthly depreciation: ${asset.name}`,
        date: new Date().toISOString().slice(0, 10),
      });
      count++;
    }
    toast.success(`Depreciation calculated for ${count} assets. Journal entries created.`);
  };

  const columns: Column[] = [
    { key: 'asset_number', label: 'Asset #', className: 'font-mono text-xs' },
    { key: 'name', label: 'Asset Name', render: (v, r) => (
      <div>
        <p className="font-medium text-foreground">{v}</p>
        <p className="text-xs text-muted-foreground capitalize">{r.category} · {r.location}</p>
      </div>
    )},
    { key: 'purchase_cost', label: 'Cost', render: v => <span className="font-medium">{formatMoney(v)}</span> },
    { key: 'current_value', label: 'Book Value', render: v => <span className="font-semibold text-indigo-600">{formatMoney(v)}</span> },
    { key: 'accumulated_depreciation', label: 'Depreciation', render: (v, r) => (
      <div>
        <p className="text-sm font-medium text-orange-600">{formatMoney(v)}</p>
        <p className="text-xs text-muted-foreground">{r.purchase_cost > 0 ? Math.round((v / r.purchase_cost) * 100) : 0}% depreciated</p>
      </div>
    )},
    { key: 'depreciation_method', label: 'Method', render: v => <span className="text-xs capitalize">{String(v).replace('_', ' ')}</span> },
    { key: 'status', label: 'Status', render: v => (
      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', STATUS_COLORS[v] ?? STATUS_COLORS.active)}>
        {String(v).replace('_', ' ')}
      </span>
    )},
  ];

  const handleCreate = async () => {
    await insertAsset.mutateAsync({
      ...form,
      purchase_cost: Number(form.purchase_cost),
      current_value: Number(form.purchase_cost),
      salvage_value: Number(form.salvage_value),
      useful_life_years: Number(form.useful_life_years),
      accumulated_depreciation: 0,
    });
    setCreateOpen(false);
  };

  return (
    <AppLayout title="Fixed Assets" subtitle="Asset register, depreciation, and maintenance">
      <div className="max-w-7xl">
        <PageHeader
          title="Fixed Assets"
          subtitle="Track assets, run depreciation schedules, and manage maintenance"
          icon={Building}
          breadcrumb={[{ label: 'Finance' }, { label: 'Fixed Assets' }]}
          actions={[
            { label: 'Run Depreciation', icon: TrendingDown, onClick: runDepreciation, variant: 'outline' },
            { label: 'Add Asset', icon: Plus, onClick: () => setCreateOpen(true) },
          ]}
          stats={[
            { label: 'Total Assets', value: assets.length },
            { label: 'Active', value: activeCount },
            { label: 'Total Cost', value: formatMoney(totalCost) },
            { label: 'Book Value', value: formatMoney(totalValue) },
            { label: 'Depreciated', value: formatMoney(totalDepreciation) },
          ]}
        />

        <DataTable
          data={assets}
          columns={columns}
          loading={isLoading && !isDemo}
          searchPlaceholder="Search assets..."
          emptyTitle="No fixed assets yet"
          emptyDescription="Add your first asset to start tracking depreciation."
          emptyAction={{ label: 'Add Asset', onClick: () => setCreateOpen(true) }}
          onBulkDelete={isDemo ? undefined : ids => ids.forEach(id => deleteAsset.mutate(id))}
        />

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-indigo-600" /> Add Fixed Asset</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Asset Number</Label><Input value={form.asset_number} onChange={e => setForm(f => ({ ...f, asset_number: e.target.value }))} /></div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Asset Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Server Rack, Company Vehicle" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Purchase Cost *</Label><Input type="number" value={form.purchase_cost} onChange={e => setForm(f => ({ ...f, purchase_cost: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Salvage Value</Label><Input type="number" value={form.salvage_value} onChange={e => setForm(f => ({ ...f, salvage_value: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Useful Life (years)</Label><Input type="number" value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Depreciation Method</Label>
                <Select value={form.depreciation_method} onValueChange={v => setForm(f => ({ ...f, depreciation_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">Straight Line</SelectItem>
                    <SelectItem value="declining_balance">Declining Balance</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Main Office" /></div>
                <div className="space-y-1.5"><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
              </div>
            </div>
            <SheetFooter className="mt-8 flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!form.name || !form.purchase_cost || insertAsset.isPending} onClick={handleCreate}>
                {insertAsset.isPending ? 'Adding...' : 'Add Asset'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
