import { useState, useMemo, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  ShoppingCart, Plus, Search, Trash2, User, CreditCard, Banknote,
  Smartphone, Wallet, Package, X, Minus, Receipt, Power, Wrench, Sparkles, Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenantQuery, useTenantInsert } from '@/hooks/use-tenant-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CartItem {
  item_id: string;          // synthetic for ad-hoc
  item_name: string;
  quantity: number;
  unit_price: number;
  stock: number | null;     // null = service / non-stocked
  kind: 'product' | 'service';
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mobile_money', label: 'M-Money', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank', icon: CreditCard },
  { value: 'credit', label: 'Credit', icon: Wallet },
];

type Mode = 'products' | 'services';

// Decide whether an inventory record represents a service / non-stocked item.
function isService(it: any): boolean {
  const t = String(it?.item_type ?? it?.type ?? '').toLowerCase();
  if (t === 'service' || t === 'non_stocked' || t === 'non-stocked') return true;
  if (it?.track_inventory === false) return true;
  if (it?.is_service === true) return true;
  return false;
}

export default function PointOfSale() {
  const { isDemo, tenant } = useAuth();
  const { formatMoney } = useCurrency();

  const { data: rawSessions, isLoading: sessionsLoading, refetch: refetchSessions } = useTenantQuery('pos_sessions' as any);
  const { data: inventoryData, isLoading: invLoading } = useTenantQuery('inventory_items');
  const insertSession = useTenantInsert('pos_sessions' as any);

  const demoSessions = [
    { id: '1', session_number: 'POS-001', cashier: 'Alice Boateng', opening_cash: 500, total_sales: 4320, total_orders: 38, status: 'open', opened_at: new Date().toISOString() },
    { id: '2', session_number: 'POS-002', cashier: 'James Asante', opening_cash: 500, total_sales: 2890, total_orders: 24, status: 'open', opened_at: new Date(Date.now() - 7200000).toISOString() },
  ];
  const sessions: any[] = (isDemo ? demoSessions : rawSessions) ?? [];
  const openSessions = sessions.filter(s => s.status === 'open');

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeSessionId && openSessions.length > 0) setActiveSessionId(openSessions[0].id);
  }, [openSessions, activeSessionId]);
  const activeSession = openSessions.find(s => s.id === activeSessionId);

  const inventoryItems: any[] = inventoryData ?? [];

  // Mode toggle: Products (stocked) vs Services (non-stocked)
  const [mode, setMode] = useState<Mode>('products');

  const productItems = useMemo(() => inventoryItems.filter(i => !isService(i)), [inventoryItems]);
  const serviceItems = useMemo(() => inventoryItems.filter(i => isService(i)), [inventoryItems]);
  const sourceItems = mode === 'products' ? productItems : serviceItems;

  const categories = useMemo(() => {
    const set = new Set<string>();
    sourceItems.forEach(i => i.category && set.add(i.category));
    return ['All', ...Array.from(set)];
  }, [sourceItems]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // reset category when mode changes
  useEffect(() => { setActiveCategory('All'); }, [mode]);

  const filteredItems = useMemo(() => {
    return sourceItems.filter(it => {
      // Stock gate only applies to products
      if (mode === 'products' && Number(it.quantity ?? 0) <= 0) return false;
      if (activeCategory !== 'All' && it.category !== activeCategory) return false;
      if (search && !(`${it.name} ${it.sku ?? ''}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [sourceItems, search, activeCategory, mode]);

  // Cart (mixed: products + services)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountPct, setDiscountPct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const addToCart = (item: any) => {
    const service = isService(item);
    const price = Number(item.selling_price) > 0 ? Number(item.selling_price) : Number(item.unit_cost ?? 0);
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        if (!service && existing.stock != null && nextQty > existing.stock) {
          toast.error(`Only ${existing.stock} in stock`);
          return prev;
        }
        return prev.map(c => c.item_id === item.id ? { ...c, quantity: nextQty } : c);
      }
      return [...prev, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: price,
        stock: service ? null : Number(item.quantity ?? 0),
        kind: service ? 'service' : 'product',
      }];
    });
  };

  // Quick add ad-hoc service / custom line
  const [customOpen, setCustomOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', price: '', qty: '1' });
  const handleAddCustom = () => {
    const name = customForm.name.trim();
    const price = parseFloat(customForm.price);
    const qty = Math.max(1, parseInt(customForm.qty) || 1);
    if (!name) { toast.error('Description required'); return; }
    if (!price || price <= 0) { toast.error('Price required'); return; }
    setCart(p => [...p, {
      item_id: `custom-${Date.now()}`,
      item_name: name,
      quantity: qty,
      unit_price: price,
      stock: null,
      kind: 'service',
    }]);
    setCustomOpen(false);
    setCustomForm({ name: '', price: '', qty: '1' });
    toast.success('Service added');
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(p => p.filter(c => c.item_id !== id)); return; }
    setCart(p => p.map(c => {
      if (c.item_id !== id) return c;
      const cap = c.stock == null ? qty : Math.min(qty, c.stock);
      return { ...c, quantity: cap };
    }));
  };
  const removeFromCart = (id: string) => setCart(p => p.filter(c => c.item_id !== id));
  const clearCart = () => { setCart([]); setDiscountPct(0); setTaxPct(0); setCustomerName('Walk-in Customer'); };

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);
  const discountAmt = subtotal * (discountPct / 100);
  const taxableAmt = subtotal - discountAmt;
  const taxAmt = taxableAmt * (taxPct / 100);
  const total = taxableAmt + taxAmt;
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (!activeSession) { toast.error('Open a POS session first'); return; }
    if (isDemo) {
      toast.success(`Sale completed — ${formatMoney(total)} (demo)`);
      clearCart();
      return;
    }
    if (!tenant?.id) return;
    setSubmitting(true);
    try {
      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
      // Use first non-custom item for header item_id, else null
      const headerItem = cart.find(c => !c.item_id.startsWith('custom-')) ?? cart[0];
      const { data: salesOrder, error } = await (supabase as any)
        .from('sales_orders')
        .insert({
          tenant_id: tenant.id,
          order_number: orderNumber,
          customer_name: customerName,
          customer_email: '',
          item_id: headerItem.item_id.startsWith('custom-') ? null : headerItem.item_id,
          quantity: itemCount,
          total_amount: total,
          status: 'delivered',
          custom_fields: {
            source: 'pos',
            session_id: activeSession.id,
            payment_method: paymentMethod,
            discount_pct: discountPct,
            tax_pct: taxPct,
            line_items: cart,
          },
        })
        .select()
        .single();
      if (error) throw error;
      if (salesOrder) {
        const lines = cart.map(li => ({
          tenant_id: tenant.id,
          sales_order_id: salesOrder.id,
          item_id: li.item_id.startsWith('custom-') ? null : li.item_id,
          description: li.item_name,
          quantity: li.quantity,
          unit_price: li.unit_price,
        }));
        await (supabase as any).from('sales_order_lines').insert(lines);
      }
      toast.success(`Sale ${orderNumber} — ${formatMoney(total)}`);
      clearCart();
      refetchSessions();
    } catch (err: any) {
      toast.error('Checkout failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Session dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    cashier_name: '', opening_cash: '', opened_at: new Date().toISOString().slice(0, 16),
  });

  const handleCreateSession = async () => {
    if (isDemo) { toast.success('Session opened (demo)'); setCreateOpen(false); return; }
    if (!form.cashier_name.trim()) { toast.error('Cashier name required'); return; }
    try {
      await insertSession.mutateAsync({
        cashier: form.cashier_name.trim(),
        opening_cash: Number(form.opening_cash) || 0,
        status: 'open',
        opened_at: form.opened_at,
        session_number: `POS-${Date.now().toString(36).toUpperCase()}`,
        total_sales: 0,
        total_orders: 0,
      });
      toast.success('Session opened');
      setCreateOpen(false);
      setForm({ cashier_name: '', opening_cash: '', opened_at: new Date().toISOString().slice(0, 16) });
      refetchSessions();
    } catch {
      toast.error('Failed to open session');
    }
  };

  return (
    <AppLayout title="Point of Sale" subtitle="Touch-screen retail checkout">
      <div className="flex flex-col h-[calc(100vh-9rem)] -m-4 sm:-m-5 md:-m-7 select-none">
        {/* Top control bar */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Point of Sale</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {activeSession ? `${activeSession.session_number} · ${activeSession.cashier}` : 'No active session'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {openSessions.length > 0 && (
              <Select value={activeSessionId ?? ''} onValueChange={setActiveSessionId}>
                <SelectTrigger className="h-10 w-[200px] text-xs">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {openSessions.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.session_number} — {s.cashier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant={openSessions.length === 0 ? 'default' : 'outline'} className="h-10 gap-1.5">
                  <Power className="w-3.5 h-3.5" /> Open Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px]">
                <DialogHeader><DialogTitle>Open POS Session</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Cashier Name *</Label>
                    <Input value={form.cashier_name} onChange={e => setForm(f => ({ ...f, cashier_name: e.target.value }))} placeholder="e.g. Alice Boateng" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Opening Cash</Label>
                    <Input type="number" value={form.opening_cash} onChange={e => setForm(f => ({ ...f, opening_cash: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Opened At</Label>
                    <Input type="datetime-local" value={form.opened_at} onChange={e => setForm(f => ({ ...f, opened_at: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button className="flex-1 h-11" onClick={handleCreateSession} disabled={insertSession.isPending}>
                      {insertSession.isPending ? 'Opening...' : 'Open Session'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main split layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_440px] min-h-0 overflow-hidden">
          {/* LEFT: Catalog */}
          <div className="flex flex-col min-h-0 border-r border-border bg-muted/20">
            {/* Mode toggle + Search + Custom add */}
            <div className="p-3 md:p-4 border-b border-border bg-card space-y-3">
              {/* Type toggle (touch-friendly segmented control) */}
              <div className="flex items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-muted border border-border flex-1 sm:flex-none">
                  <button
                    onClick={() => setMode('products')}
                    className={cn(
                      'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold transition-all',
                      mode === 'products'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Boxes className="w-4 h-4" />
                    Products
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{productItems.length}</Badge>
                  </button>
                  <button
                    onClick={() => setMode('services')}
                    className={cn(
                      'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-11 rounded-lg text-sm font-semibold transition-all',
                      mode === 'services'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Wrench className="w-4 h-4" />
                    Services
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{serviceItems.length}</Badge>
                  </button>
                </div>
                <Button
                  variant="outline"
                  className="h-11 gap-1.5 ml-auto"
                  onClick={() => setCustomOpen(true)}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Quick Item</span>
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={mode === 'products' ? 'Search products or scan barcode...' : 'Search services...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-12 text-base"
                  autoFocus
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'px-4 h-9 rounded-full text-xs font-medium whitespace-nowrap transition-colors border',
                      activeCategory === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Item grid — touch-sized tiles */}
            <ScrollArea className="flex-1">
              <div className="p-3 md:p-4">
                {invLoading && !isDemo ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    {mode === 'products' ? (
                      <Package className="w-12 h-12 text-muted-foreground/40 mb-3" />
                    ) : (
                      <Wrench className="w-12 h-12 text-muted-foreground/40 mb-3" />
                    )}
                    <div className="text-sm font-medium">
                      No {mode === 'products' ? 'products' : 'services'} found
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mode === 'services'
                        ? 'Use Quick Item to add a one-off service'
                        : 'Try a different search or category'}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredItems.map(item => {
                      const service = isService(item);
                      const price = Number(item.selling_price) > 0 ? Number(item.selling_price) : Number(item.unit_cost ?? 0);
                      const inCart = cart.find(c => c.item_id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className={cn(
                            'group relative text-left p-3 rounded-xl border-2 bg-card transition-all min-h-[148px]',
                            'active:scale-[0.97] active:shadow-inner',
                            'hover:border-primary hover:shadow-md hover:-translate-y-0.5',
                            inCart ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                          )}
                        >
                          <div className={cn(
                            'aspect-square rounded-lg flex items-center justify-center mb-2 overflow-hidden',
                            service
                              ? 'bg-gradient-to-br from-violet-500/10 to-indigo-500/10'
                              : 'bg-gradient-to-br from-muted to-muted/50'
                          )}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : service ? (
                              <Wrench className="w-9 h-9 text-violet-500/60" />
                            ) : (
                              <Package className="w-9 h-9 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="text-xs font-semibold leading-tight line-clamp-2 mb-1">{item.name}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-primary">{formatMoney(price)}</span>
                            {service ? (
                              <span className="text-[10px] font-medium text-violet-500">Service</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">{item.quantity} left</span>
                            )}
                          </div>
                          {inCart && (
                            <Badge className="absolute top-1.5 right-1.5 h-6 min-w-6 px-1.5 text-[11px] bg-primary">
                              {inCart.quantity}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Cart */}
          <div className="flex flex-col min-h-0 bg-card">
            {/* Customer */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0 font-medium text-sm"
                />
              </div>
            </div>

            {/* Cart lines */}
            <ScrollArea className="flex-1">
              <div className="p-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <div className="text-sm font-medium text-muted-foreground">Cart is empty</div>
                    <div className="text-xs text-muted-foreground/70 mt-1">Tap items to add</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.item_id} className="flex items-start gap-2 p-3 rounded-xl border border-border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {item.kind === 'service' ? (
                              <Wrench className="w-3 h-3 text-violet-500 flex-shrink-0" />
                            ) : (
                              <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="text-xs font-semibold truncate">{item.item_name}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{formatMoney(item.unit_price)} each</div>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg" onClick={() => updateQty(item.item_id, item.quantity - 1)}>
                              <Minus className="w-4 h-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateQty(item.item_id, parseInt(e.target.value) || 0)}
                              className="h-9 w-14 text-center text-sm font-semibold px-1"
                            />
                            <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg" onClick={() => updateQty(item.item_id, item.quantity + 1)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            onClick={() => removeFromCart(item.item_id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="text-sm font-bold">{formatMoney(item.quantity * item.unit_price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Totals + Checkout */}
            <div className="border-t border-border p-4 space-y-3 bg-muted/20">
              {/* Discount + Tax */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Discount %</Label>
                  <Input type="number" value={discountPct} onChange={e => setDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} className="h-10 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax %</Label>
                  <Input type="number" value={taxPct} onChange={e => setTaxPct(Math.max(0, parseFloat(e.target.value) || 0))} className="h-10 text-sm" />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-medium text-foreground">{formatMoney(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount ({discountPct}%)</span>
                    <span className="text-destructive">-{formatMoney(discountAmt)}</span>
                  </div>
                )}
                {taxPct > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({taxPct}%)</span>
                    <span>{formatMoney(taxAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatMoney(total)}</span>
                </div>
              </div>

              {/* Payment methods */}
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 h-14 rounded-lg border text-[11px] font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Clear
                </Button>
                <Button
                  className="flex-[2] h-12 gap-2 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0 || !activeSession}
                >
                  <Receipt className="w-5 h-5" />
                  {submitting ? 'Processing...' : `Pay ${formatMoney(total)}`}
                </Button>
              </div>
              {!activeSession && (
                <p className="text-[10px] text-center text-amber-600 dark:text-amber-400">
                  Open a POS session to start selling
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick custom item dialog (ad-hoc service) */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" /> Quick Item / Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                value={customForm.name}
                onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Installation fee, Delivery, Repair"
                className="h-11"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={customForm.price}
                  onChange={e => setCustomForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={customForm.qty}
                  onChange={e => setCustomForm(f => ({ ...f, qty: e.target.value }))}
                  className="h-11 text-base"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setCustomOpen(false)}>Cancel</Button>
              <Button className="flex-1 h-11" onClick={handleAddCustom}>Add to Cart</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
