import { useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Package, AlertTriangle, TrendingDown, Warehouse, Trash2, FileDown, Search, Filter, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePDFReport } from '@/lib/pdf-reports';
import { BulkUpload } from '@/components/erp/BulkUpload';
import { InventoryAdjustmentDialog } from '@/components/erp/InventoryAdjustmentDialog';
import { ParsedInventoryRow } from '@/lib/excel-utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const fields = [
  { name: 'sku', label: 'SKU', required: true },
  { name: 'name', label: 'Name', required: true },
  { name: 'category', label: 'Category', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
  { name: 'unit_cost', label: 'Unit Cost', type: 'number' as const, required: true },
  { name: 'reorder_level', label: 'Reorder Level', type: 'number' as const, defaultValue: '10' },
  { name: 'warehouse_location', label: 'Warehouse Location' },
  { name: 'description', label: 'Description' },
];

function getStockStatus(qty: number, reorder: number) {
  if (qty <= reorder * 0.5) return { status: 'Critical', variant: 'destructive' as const };
  if (qty <= reorder) return { status: 'Low Stock', variant: 'warning' as const };
  return { status: 'In Stock', variant: 'success' as const };
}

function MiniStat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card px-4 py-3", alert && "border-warning/40")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", alert ? "text-warning" : "text-foreground")}>{value}</p>
    </div>
  );
}

export default function Inventory() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data, isLoading } = useTenantQuery('inventory_items');
  const insert = useTenantInsert('inventory_items');
  const remove = useTenantDelete('inventory_items');
  const qc = useQueryClient();
  useRealtimeSync('inventory_items');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const pendingUploadId = useRef<string | null>(null);

  const handleImageUpload = async (itemId: string, file: File) => {
    setUploadingItemId(itemId);
    try {
      const ext = file.name.split('.').pop();
      const path = `${tenant?.id}/${itemId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      const { error: updateError } = await (supabase.from('inventory_items') as any).update({ image_url: urlData.publicUrl }).eq('id', itemId);
      if (updateError) throw updateError;
      toast.success('Image uploaded');
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingItemId(null);
    }
  };

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState('all');

  const items = data ?? [];

  const totalValue = items.reduce((s: number, i: any) => s + i.quantity * Number(i.unit_cost), 0);
  const lowStock = items.filter((i: any) => i.quantity <= i.reorder_level);
  const damagedItems = items.filter((i: any) => i.status === 'damaged');
  const expiredItems = items.filter((i: any) => i.status === 'expired');
  const categories = [...new Set(items.map((i: any) => i.category || 'Uncategorized'))];

  const filtered = items.filter((i: any) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (tab === 'low_stock') return i.quantity <= i.reorder_level;
    if (tab === 'expired') return i.status === 'expired';
    if (tab === 'damaged') return i.status === 'damaged';
    return true;
  });

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'Inventory Report',
      subtitle: `Generated for ${tenant?.name || 'TELA-ERP'}`,
      tenantName: tenant?.name,
      headers: ['SKU', 'Name', 'Category', 'Qty', 'Unit Cost', 'Value', 'Status'],
      rows: filtered.map((i: any) => {
        const s = getStockStatus(i.quantity, i.reorder_level);
        return [i.sku, i.name, i.category, i.quantity, formatMoney(Number(i.unit_cost)), formatMoney(i.quantity * Number(i.unit_cost)), i.status === 'good' ? s.status : i.status];
      }),
      stats: [
        { label: 'Total Items', value: String(items.length) },
        { label: 'Stock Value', value: formatMoney(totalValue) },
        { label: 'Low Stock', value: String(lowStock.length) },
      ],
    });
  };

  const handleBulkUpload = async (parsed: ParsedInventoryRow[]) => {
    if (!tenant?.id) return;
    const payload = parsed.map(r => ({ ...r, tenant_id: tenant.id }));
    const { error } = await (supabase.from('inventory_items') as any).insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(`${parsed.length} items imported`); qc.invalidateQueries({ queryKey: ['inventory_items'] }); }
  };

  return (
    <AppLayout title="Inventory" subtitle="Stock levels & warehouse tracking">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Total Items" value={isDemo ? '1,247' : String(items.length)} />
        <MiniStat label="Stock Value" value={isDemo ? formatMoney(124500) : formatMoney(totalValue)} />
        <MiniStat label="Low Stock" value={isDemo ? '8' : String(lowStock.length)} alert={lowStock.length > 0} />
        <MiniStat label="Damaged / Expired" value={isDemo ? '2' : String(damagedItems.length + expiredItems.length)} alert={damagedItems.length + expiredItems.length > 0} />
      </div>

      {/* Header Bar */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search by name or SKU..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="not_sellable">Not Sellable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {!isDemo && (
                <>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportPDF} disabled={filtered.length === 0}>
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <BulkUpload onUpload={handleBulkUpload} />
                  <InventoryAdjustmentDialog items={items} />
                  <CreateDialog title="Add Item" buttonLabel="+ Add Item" fields={fields} onSubmit={insert.mutate} isPending={insert.isPending} />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-7">All <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{items.length}</Badge></TabsTrigger>
          <TabsTrigger value="low_stock" className="text-xs h-7">Low Stock <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{lowStock.length}</Badge></TabsTrigger>
          <TabsTrigger value="expired" className="text-xs h-7">Expired <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{expiredItems.length}</Badge></TabsTrigger>
          <TabsTrigger value="damaged" className="text-xs h-7">Damaged <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{damagedItems.length}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      {isLoading && !isDemo ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['', 'Product', 'SKU', 'Category', 'Warehouse', 'Qty', 'Value', 'Status', ...(!isDemo ? [''] : [])].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i: any) => {
                  const s = getStockStatus(i.quantity, i.reorder_level);
                  const displayStatus = i.status === 'good' ? s.status : (i.status || 'good').charAt(0).toUpperCase() + (i.status || 'good').slice(1);
                  const displayVariant = i.status === 'good' ? s.variant : 'destructive';
                  return (
                    <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 w-12">
                        {i.image_url ? (
                          <img src={i.image_url} alt={i.name} className="w-9 h-9 rounded object-cover border border-border" />
                        ) : (
                          <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {i.name?.[0] || '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{i.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{i.sku}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{i.category || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{i.warehouse_location || '—'}</td>
                      <td className="px-4 py-2.5 font-medium">{i.quantity.toLocaleString()}</td>
                      <td className="px-4 py-2.5">{formatMoney(i.quantity * Number(i.unit_cost))}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={displayStatus} variant={displayVariant} /></td>
                      {!isDemo && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <input type="file" accept="image/*" className="hidden" ref={uploadingItemId === i.id ? fileInputRef : undefined}
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(i.id, f); }} />
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={uploadingItemId === i.id}
                              onClick={() => { setUploadingItemId(i.id); setTimeout(() => fileInputRef.current?.click(), 50); }}>
                              <ImagePlus className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(i.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">No items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
