import { useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/erp/SharedComponents';
import { CreateDialog } from '@/components/erp/CreateDialog';
import { Package, AlertTriangle, TrendingDown, Warehouse, Trash2, FileDown, Search, Filter, ImagePlus, Brain, Loader2, RefreshCw, TrendingUp, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { triggerAutomation } from '@/lib/automation';
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

// ─── Reorder Priority Badge ────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', map[priority] || map.low)}>
      {priority}
    </span>
  );
}

// ─── AI Demand Forecast Panel ──────────────────────────────────────────────
function AIForecastPanel({ items, salesData }: { items: any[]; salesData: any[] }) {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const { formatMoney } = useCurrency();

  const runForecast = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-demand-forecast', {
        body: { inventoryItems: items.slice(0, 20), salesHistory: salesData.slice(0, 50) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForecasts(data?.forecasts || []);
      setRan(true);
    } catch (e: any) {
      toast.error(e.message || 'Forecast failed');
    } finally {
      setLoading(false);
    }
  };

  if (!ran && !loading) {
    return (
      <Card className="rounded-xl border-border">
        <CardContent className="py-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">AI Demand Forecast</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Claude analyzes your inventory levels and sales patterns to predict demand for the next 30, 60, and 90 days — helping you avoid stockouts and overstock.
          </p>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={runForecast}>
            <Brain className="w-4 h-4" /> Run Demand Forecast
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Requires Anthropic API key in Settings → AI Settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">AI Demand Forecast</h3>
          <p className="text-xs text-muted-foreground mt-0.5">30/60/90-day predictions powered by Claude</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={runForecast} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : forecasts.length === 0 ? (
        <Card className="rounded-xl border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            No forecast data. Make sure you have inventory items and an Anthropic API key configured.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="rounded-xl border-border"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Items Forecasted</p>
              <p className="text-xl font-bold text-foreground">{forecasts.length}</p>
            </CardContent></Card>
            <Card className="rounded-xl border-border"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Critical Priority</p>
              <p className="text-xl font-bold text-red-600">{forecasts.filter(f => f.reorder_priority === 'critical').length}</p>
            </CardContent></Card>
            <Card className="rounded-xl border-border"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Stockout &lt; 7 days</p>
              <p className="text-xl font-bold text-amber-600">{forecasts.filter(f => f.days_until_stockout <= 7).length}</p>
            </CardContent></Card>
            <Card className="rounded-xl border-border"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Healthy Stock</p>
              <p className="text-xl font-bold text-green-600">{forecasts.filter(f => f.reorder_priority === 'low').length}</p>
            </CardContent></Card>
          </div>

          {/* Forecast table */}
          <Card className="rounded-xl border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Item</th>
                    <th className="text-right px-4 py-3 font-medium">Current Stock</th>
                    <th className="text-right px-4 py-3 font-medium">Daily Velocity</th>
                    <th className="text-right px-4 py-3 font-medium">Days Until Stockout</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">30d</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">60d</th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">90d</th>
                    <th className="text-center px-4 py-3 font-medium">Priority</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Reorder Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {forecasts.sort((a, b) => {
                    const pri = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (pri[a.reorder_priority as keyof typeof pri] ?? 3) - (pri[b.reorder_priority as keyof typeof pri] ?? 3);
                  }).map((f, i) => (
                    <tr key={i} className={cn('hover:bg-accent/40 transition-colors', f.reorder_priority === 'critical' && 'bg-red-50/50 dark:bg-red-950/10')}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{f.item_name}</p>
                        {f.insight && <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{f.insight}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{f.current_stock}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{Number(f.daily_velocity).toFixed(1)}/day</td>
                      <td className={cn('px-4 py-3 text-right font-bold', f.days_until_stockout <= 7 ? 'text-red-600' : f.days_until_stockout <= 30 ? 'text-amber-600' : 'text-green-600')}>
                        {f.days_until_stockout === 999 ? '∞' : `${f.days_until_stockout}d`}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{f.forecast_30_days}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{f.forecast_60_days}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">{f.forecast_90_days}</td>
                      <td className="px-4 py-3 text-center"><PriorityBadge priority={f.reorder_priority} /></td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600 hidden sm:table-cell">{f.recommended_reorder_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const fields = [
  { name: 'sku', label: 'SKU', required: true },
  { name: 'name', label: 'Name', required: true },
  { name: 'category', label: 'Category', required: true },
  { name: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
  { name: 'unit_cost', label: 'Unit Cost (Purchase)', type: 'number' as const, required: true },
  { name: 'selling_price', label: 'Selling Price', type: 'number' as const, required: true },
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
  const { data: reservations = [] } = useTenantQuery('inventory_reservations');
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
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef}
        onChange={e => { const f = e.target.files?.[0]; if (f && pendingUploadId.current) { handleImageUpload(pendingUploadId.current, f); } e.target.value = ''; }} />
      
      {/* Low Stock Alert Banner */}
      {(lowStock.length > 0 || (isDemo)) && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">
            {isDemo ? '8 items' : `${lowStock.length} item${lowStock.length !== 1 ? 's' : ''}`} below reorder level —{' '}
            <button className="underline hover:no-underline" onClick={() => setTab('low_stock')}>View low stock items</button>
          </p>
        </div>
      )}

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
                  <CreateDialog title="Add Item" buttonLabel="+ Add Item" fields={fields} onSubmit={(row) => {
                    insert.mutate(row, {
                      onSuccess: () => {
                        const qty = Number(row.quantity ?? 0);
                        const reorder = Number(row.reorder_level ?? 10);
                        if (qty === 0) {
                          void triggerAutomation('stock_out', { name: row.name, sku: row.sku, quantity: qty }, tenant?.id ?? '');
                        } else if (qty <= reorder) {
                          void triggerAutomation('stock_low', { name: row.name, sku: row.sku, quantity: qty, reorder_level: reorder }, tenant?.id ?? '');
                        }
                      },
                    });
                  }} isPending={insert.isPending} />
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
          <TabsTrigger value="ai_forecast" className="text-xs h-7 gap-1"><Brain className="w-3 h-3" /> AI Forecast</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* AI Forecast Panel */}
      {tab === 'ai_forecast' && (
        <AIForecastPanel items={items} salesData={[]} />
      )}

      {/* Table */}
      {tab !== 'ai_forecast' && (isLoading && !isDemo ? (
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
                  const reservedQty = (reservations as any[])
                    .filter(r => r.item_id === i.id && r.status === 'reserved')
                    .reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
                  const availableQty = Math.max(0, i.quantity - reservedQty);
                  const s = getStockStatus(availableQty, i.reorder_level);
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
                      <td className="px-4 py-2.5 font-medium">
                        {availableQty.toLocaleString()}
                        {reservedQty > 0 && <span className="ml-1 text-xs text-muted-foreground">({reservedQty} reserved)</span>}
                      </td>
                      <td className="px-4 py-2.5">{formatMoney(availableQty * Number(i.unit_cost))}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={displayStatus} variant={displayVariant} /></td>
                      {!isDemo && (
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={uploadingItemId === i.id}
                              onClick={() => { pendingUploadId.current = i.id; fileInputRef.current?.click(); }}>
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
      ))}
    </AppLayout>
  );
}
