import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  Wrench, Plus, Search, Trash2, Edit2, CheckCircle, XCircle,
  DollarSign, Tag, Clock, FileDown, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/use-tenant-query';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { generatePDFReport } from '@/lib/pdf-reports';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Service items are stored as inventory_items with custom_fields.item_type = 'service'

const SERVICE_UNITS = ['visit', 'hour', 'day', 'project', 'item'] as const;
const SERVICE_UNIT_LABELS: Record<string, string> = {
  visit: 'Per Visit',
  hour: 'Per Hour',
  day: 'Per Day',
  project: 'Per Project',
  item: 'Per Item',
};

const DEFAULT_CATEGORIES = [
  'General', 'Consulting', 'Cleaning', 'Repair & Maintenance', 'Installation',
  'Medical & Health', 'Legal', 'Training', 'Transportation', 'Beauty & Wellness',
  'IT & Tech', 'Construction', 'Landscaping', 'Security', 'Catering',
];

// ─── Service Form Sheet ────────────────────────────────────────────────────────

interface ServiceFormProps {
  initial?: Record<string, any>;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  isPending: boolean;
}

function ServiceForm({ initial, onClose, onSave, isPending }: ServiceFormProps) {
  const cf = initial?.custom_fields ?? {};
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? 'General',
    price: initial?.selling_price ?? '',
    duration_minutes: cf.duration_minutes ?? 60,
    unit: cf.service_unit ?? 'visit',
    is_active: cf.is_active !== false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Service name is required'); return; }
    const price = parseFloat(String(form.price));
    if (isNaN(price) || price < 0) { toast.error('Enter a valid price'); return; }
    onSave({
      name: form.name.trim(),
      description: form.description || null,
      category: form.category,
      selling_price: price,
      unit_cost: 0,
      quantity: 9999,
      reorder_level: 0,
      sku: initial?.sku ?? `SVC-${Date.now().toString(36).toUpperCase()}`,
      custom_fields: {
        ...((initial?.custom_fields as object) ?? {}),
        item_type: 'service',
        service_unit: form.unit,
        duration_minutes: Number(form.duration_minutes) || 60,
        is_active: form.is_active,
      },
    });
  };

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
        <SheetTitle>{initial ? 'Edit Service' : 'New Service'}</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Service Name *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Deep House Cleaning" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pricing Unit</Label>
            <Select value={form.unit} onValueChange={v => set('unit', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_UNITS.map(u => <SelectItem key={u} value={u}>{SERVICE_UNIT_LABELS[u]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Price *</Label>
            <Input
              type="number" min="0" step="0.01"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Input
              type="number" min="0"
              value={form.duration_minutes}
              onChange={e => set('duration_minutes', e.target.value)}
              placeholder="60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Briefly describe this service..."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
          <div>
            <p className="text-sm font-medium text-foreground">Active</p>
            <p className="text-xs text-muted-foreground">Inactive services won't appear on new orders</p>
          </div>
          <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
        </div>
      </div>
      <SheetFooter className="px-6 py-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          onClick={handleSubmit}
          disabled={isPending}
        >
          <CheckCircle className="w-4 h-4" />
          {initial ? 'Save Changes' : 'Add Service'}
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Main Services Page ────────────────────────────────────────────────────────

export default function Services() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();
  const { data: rawItems, isLoading } = useTenantQuery('inventory_items');
  const insertMutation = useTenantInsert('inventory_items');
  const updateMutation = useTenantUpdate('inventory_items');
  const remove = useTenantDelete('inventory_items');
  useRealtimeSync('inventory_items');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Service items are inventory_items tagged with custom_fields.item_type = 'service'
  const allItems: any[] = rawItems ?? [];
  const services = allItems.filter((i: any) => i.custom_fields?.item_type === 'service');

  const activeCount = services.filter(s => s.custom_fields?.is_active !== false).length;
  const categories = Array.from(new Set(services.map((s: any) => s.category))).sort();
  const avgPrice = services.length
    ? services.reduce((sum: number, s: any) => sum + Number(s.selling_price), 0) / services.length
    : 0;

  const filtered = services.filter((s: any) => {
    const matchSearch = !search
      || s.name?.toLowerCase().includes(search.toLowerCase())
      || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleCreate = (data: Record<string, any>) => {
    insertMutation.mutate(data, { onSuccess: () => setCreateOpen(false) });
  };

  const handleEdit = (data: Record<string, any>) => {
    updateMutation.mutate({ id: editItem.id, ...data }, { onSuccess: () => setEditItem(null) });
  };

  const toggleActive = (service: any) => {
    const current = service.custom_fields?.is_active !== false;
    updateMutation.mutate({
      id: service.id,
      custom_fields: { ...(service.custom_fields ?? {}), is_active: !current },
    });
  };

  const handleExportPDF = () => {
    generatePDFReport({
      title: 'Service Catalog',
      subtitle: tenant?.name,
      tenantName: tenant?.name,
      headers: ['Service', 'Category', 'Price', 'Unit', 'Duration', 'Status'],
      rows: filtered.map((s: any) => [
        s.name,
        s.category ?? '—',
        formatMoney(Number(s.selling_price)),
        SERVICE_UNIT_LABELS[s.custom_fields?.service_unit] ?? s.custom_fields?.service_unit ?? '—',
        s.custom_fields?.duration_minutes
          ? s.custom_fields.duration_minutes < 60
            ? `${s.custom_fields.duration_minutes} min`
            : `${(s.custom_fields.duration_minutes / 60).toFixed(1)} hrs`
          : '—',
        s.custom_fields?.is_active !== false ? 'Active' : 'Inactive',
      ]),
      stats: [
        { label: 'Total Services', value: String(services.length) },
        { label: 'Active', value: String(activeCount) },
        { label: 'Avg Price', value: formatMoney(avgPrice) },
      ],
    });
  };

  return (
    <AppLayout title="Service Catalog" subtitle="Manage your services and pricing">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Services', value: isDemo ? '12' : String(services.length), icon: ListChecks, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
            { label: 'Active Services', value: isDemo ? '10' : String(activeCount), icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
            { label: 'Categories', value: isDemo ? '5' : String(categories.length), icon: Tag, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Avg Price', value: isDemo ? formatMoney(85) : formatMoney(avgPrice), icon: DollarSign, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          ].map(stat => (
            <motion.div key={stat.label} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="rounded-xl border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {!isDemo && (
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleExportPDF} disabled={filtered.length === 0}>
                <FileDown className="w-3.5 h-3.5" /> Export PDF
              </Button>
            )}
            {!isDemo && (
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> New Service
              </Button>
            )}
          </div>
        </div>

        {/* Service Grid */}
        {isLoading && !isDemo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-base mb-1">No services found</p>
            <p className="text-sm mb-4">Add services to your catalog so you can include them on service orders.</p>
            {!isDemo && (
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> Add First Service
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((service: any) => {
              const cf = service.custom_fields ?? {};
              const isActive = cf.is_active !== false;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={cn('rounded-xl border-border h-full', !isActive && 'opacity-60')}>
                    <CardContent className="p-4 flex flex-col gap-3 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{service.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{service.category}</Badge>
                            {isActive
                              ? <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-0">Active</Badge>
                              : <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 border-0">Inactive</Badge>
                            }
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-teal-600">{formatMoney(Number(service.selling_price))}</p>
                          <p className="text-[10px] text-muted-foreground">{SERVICE_UNIT_LABELS[cf.service_unit] ?? cf.service_unit ?? 'Per Visit'}</p>
                        </div>
                      </div>

                      {service.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                      )}

                      {cf.duration_minutes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{cf.duration_minutes < 60
                            ? `${cf.duration_minutes} min`
                            : `${(cf.duration_minutes / 60).toFixed(1)} hrs`
                          }</span>
                        </div>
                      )}

                      {!isDemo && (
                        <div className="flex items-center justify-between pt-1 mt-auto border-t border-border">
                          <button
                            onClick={() => toggleActive(service)}
                            className={cn(
                              'text-xs flex items-center gap-1 transition-colors',
                              isActive ? 'text-green-600 hover:text-red-500' : 'text-muted-foreground hover:text-green-600'
                            )}
                          >
                            {isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditItem(service)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remove.mutate(service.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          <ServiceForm
            onClose={() => setCreateOpen(false)}
            onSave={handleCreate}
            isPending={insertMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0" side="right">
          {editItem && (
            <ServiceForm
              initial={editItem}
              onClose={() => setEditItem(null)}
              onSave={handleEdit}
              isPending={updateMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
