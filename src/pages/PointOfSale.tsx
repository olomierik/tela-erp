import { useState, useCallback, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ShoppingCart, PackageOpen, Wifi, WifiOff, Printer, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePermission } from '@/hooks/use-permission';
import { usePOSCache, type POSCartItem, type POSProduct, type OfflineTransaction } from '@/hooks/use-pos-cache';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import BarcodeInput from '@/components/pos/BarcodeInput';
import CartPanel from '@/components/pos/CartPanel';
import ProductGrid from '@/components/pos/ProductGrid';
import CheckoutDialog from '@/components/pos/CheckoutDialog';
import QuickCreateProduct from '@/components/pos/QuickCreateProduct';
import ReceivingMode from '@/components/pos/ReceivingMode';
import POSReceipt, { printReceipt } from '@/components/pos/POSReceipt';

const TAX_RATE = 0; // Can be made configurable

export default function PointOfSale() {
  const { tenant, profile, isDemo } = useAuth();
  const { formatMoney } = useCurrency();
  const { canEdit, isAdmin, role } = usePermission();
  const canDiscount = isAdmin || role === 'user'; // managers+ can discount

  const {
    products, loading, isOnline,
    findByBarcode, fetchProducts,
    saveOfflineTransaction, getOfflineTransactions, markTransactionSynced,
  } = usePOSCache();

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [lastScannedId, setLastScannedId] = useState<string>();
  const [mode, setMode] = useState<'sell' | 'receive'>('sell');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState('');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const scanFeedbackRef = useRef<ReturnType<typeof setTimeout>>();

  // Check pending offline transactions
  useEffect(() => {
    getOfflineTransactions().then(txs => setPendingSync(txs.length));
  }, [getOfflineTransactions]);

  // Sync offline transactions when online
  useEffect(() => {
    if (!isOnline || !tenant?.id || pendingSync === 0) return;
    const sync = async () => {
      const txs = await getOfflineTransactions();
      for (const tx of txs) {
        try {
          await processSaleOnline(tx);
          await markTransactionSynced(tx.id);
        } catch {
          // Will retry next time
        }
      }
      const remaining = await getOfflineTransactions();
      setPendingSync(remaining.length);
      if (txs.length > 0 && remaining.length === 0) {
        toast.success('All offline transactions synced!');
      }
    };
    sync();
  }, [isOnline, pendingSync]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement?.tagName;
      if (active === 'INPUT' || active === 'TEXTAREA') return;

      if (e.key === 'F2') { e.preventDefault(); setCheckoutOpen(true); }
      if (e.key === 'Escape') { setCart([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addToCart = useCallback((product: POSProduct) => {
    if (product.quantity <= 0 && product.status === 'good') {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }
    if (product.status !== 'good') {
      toast.error(`"${product.name}" is not sellable (${product.status})`);
      return;
    }

    setCart(prev => {
      const existing = prev.findIndex(i => i.product.id === product.id);
      if (existing >= 0) {
        const currentQty = prev[existing].quantity;
        if (currentQty + 1 > product.quantity && !isAdmin) {
          toast.error(`Insufficient stock for "${product.name}" (${product.quantity} available)`);
          return prev;
        }
        return prev.map((item, idx) =>
          idx === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0, unitPrice: product.unit_cost }];
    });

    setLastScannedId(product.id);
    if (scanFeedbackRef.current) clearTimeout(scanFeedbackRef.current);
    scanFeedbackRef.current = setTimeout(() => setLastScannedId(undefined), 2000);

    // Low stock warning
    if (product.quantity > 0 && product.quantity <= product.reorder_level) {
      toast.warning(`Low stock warning: "${product.name}" — ${product.quantity} remaining`, { duration: 3000 });
    }
  }, [isAdmin]);

  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = findByBarcode(barcode);
    if (product) {
      addToCart(product);
      toast.success(`✓ ${product.name}`, { duration: 1500 });
    } else {
      setUnknownBarcode(barcode);
      setQuickCreateOpen(true);
      toast.error(`Product not found: ${barcode}`);
    }
  }, [findByBarcode, addToCart]);

  const updateCartQuantity = useCallback((index: number, qty: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (qty > item.product.quantity && !isAdmin) {
        toast.error(`Only ${item.product.quantity} available`);
        return item;
      }
      return { ...item, quantity: qty };
    }));
  }, [isAdmin]);

  const updateCartDiscount = useCallback((index: number, discount: number) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, discount } : item));
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processSaleOnline = async (tx: OfflineTransaction | {
    items: POSCartItem[];
    total: number;
    paymentMethod: string;
    customerName: string;
    timestamp: string;
  }) => {
    if (!tenant?.id) throw new Error('No tenant');
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
    const firstItem = tx.items[0];

    const { data: salesOrder, error } = await (supabase as any)
      .from('sales_orders')
      .insert({
        tenant_id: tenant.id,
        order_number: orderNumber,
        customer_name: tx.customerName,
        customer_email: '',
        item_id: firstItem.product.id,
        quantity: tx.items.reduce((s, i) => s + i.quantity, 0),
        total_amount: tx.total,
        status: 'delivered',
        custom_fields: {
          source: 'pos',
          payment_method: tx.paymentMethod,
          line_items: tx.items.map(i => ({
            item_id: i.product.id,
            item_name: i.product.name,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            discount: i.discount,
          })),
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Insert sales order lines
    if (salesOrder) {
      const lines = tx.items.map(i => ({
        tenant_id: tenant.id,
        sales_order_id: salesOrder.id,
        item_id: i.product.id,
        description: i.product.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      }));
      await (supabase as any).from('sales_order_lines').insert(lines);
    }

    return { orderNumber, salesOrder };
  };

  const handleCheckout = async (data: { customerName: string; paymentMethod: string; amountPaid: number }) => {
    const subtotal = cart.reduce((sum, item) => {
      const lineTotal = item.unitPrice * item.quantity;
      return sum + lineTotal * (1 - item.discount / 100);
    }, 0);
    const taxAmount = subtotal * (TAX_RATE / 100);
    const total = subtotal + taxAmount;

    const txData = {
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      items: cart,
      total,
      paymentMethod: data.paymentMethod,
      customerName: data.customerName,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    if (!isOnline || isDemo) {
      // Save offline
      await saveOfflineTransaction(txData);
      setPendingSync(p => p + 1);
      toast.success('Sale saved offline — will sync when connected');
    } else {
      try {
        const result = await processSaleOnline(txData);
        toast.success(`Sale ${result.orderNumber} completed — ${formatMoney(total)}`);
      } catch (err: any) {
        // Fallback to offline
        await saveOfflineTransaction(txData);
        setPendingSync(p => p + 1);
        toast.warning('Sale saved offline (network error) — will sync automatically');
      }
    }

    // Set receipt data for printing
    setReceiptData({
      companyName: tenant?.name || 'Company',
      companyAddress: (tenant as any)?.address || '',
      companyPhone: (tenant as any)?.phone || '',
      receiptNumber: txData.id.slice(4, 16).toUpperCase(),
      date: new Date().toLocaleString(),
      cashier: profile?.full_name || 'Cashier',
      customerName: data.customerName,
      paymentMethod: data.paymentMethod,
      items: cart,
      subtotal,
      taxRate: TAX_RATE,
      taxAmount,
      total,
      amountPaid: data.amountPaid || total,
      change: Math.max(0, (data.amountPaid || total) - total),
      formatMoney,
    });

    setCart([]);
    setCheckoutOpen(false);
    fetchProducts(); // Refresh stock
  };

  const handleProductCreated = useCallback((product: POSProduct) => {
    addToCart(product);
    fetchProducts();
  }, [addToCart, fetchProducts]);

  return (
    <AppLayout title="Point of Sale" subtitle="Barcode-driven POS">
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold">POS Terminal</h1>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'sell' | 'receive')} className="ml-2">
            <TabsList className="h-8">
              <TabsTrigger value="sell" className="text-xs h-7 px-3">
                <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Sell
              </TabsTrigger>
              <TabsTrigger value="receive" className="text-xs h-7 px-3">
                <PackageOpen className="w-3.5 h-3.5 mr-1" /> Receive
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1" />

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {pendingSync > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-amber-600" onClick={() => {
                if (isOnline) setPendingSync(p => p); // trigger sync
              }}>
                <RotateCcw className="w-3.5 h-3.5" />
                {pendingSync} pending
              </Button>
            )}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {receiptData && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={printReceipt}>
                <Printer className="w-3.5 h-3.5" /> Receipt
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {mode === 'sell' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Products + Barcode */}
            <div className="flex-1 flex flex-col border-r border-border min-w-0">
              {/* Barcode Scanner */}
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <BarcodeInput onScan={handleBarcodeScan} />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Scan barcode, type SKU + Enter, or click a product below. <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">F2</kbd> Checkout
                </p>
              </div>

              {/* Product Grid */}
              <ProductGrid
                products={products.filter(p => p.status === 'good')}
                onAddToCart={addToCart}
                loading={loading}
                formatMoney={formatMoney}
              />
            </div>

            {/* Right: Cart */}
            <div className="w-[340px] xl:w-[380px] flex flex-col bg-card shrink-0">
              <CartPanel
                items={cart}
                onUpdateQuantity={updateCartQuantity}
                onUpdateDiscount={updateCartDiscount}
                onRemoveItem={removeFromCart}
                onClearCart={() => setCart([])}
                onCheckout={() => setCheckoutOpen(true)}
                taxRate={TAX_RATE}
                formatMoney={formatMoney}
                canDiscount={canDiscount}
                lastScannedId={lastScannedId}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ReceivingMode
              findByBarcode={findByBarcode}
              onComplete={fetchProducts}
              formatMoney={formatMoney}
            />
          </div>
        )}

        {/* Hidden receipt for printing */}
        {receiptData && (
          <div className="hidden">
            <POSReceipt {...receiptData} />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={cart}
        taxRate={TAX_RATE}
        formatMoney={formatMoney}
        onComplete={handleCheckout}
      />

      <QuickCreateProduct
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        barcode={unknownBarcode}
        onCreated={handleProductCreated}
      />
    </AppLayout>
  );
}
