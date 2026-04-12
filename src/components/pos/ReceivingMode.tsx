import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PackagePlus, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BarcodeInput from './BarcodeInput';
import type { POSProduct } from '@/hooks/use-pos-cache';

interface ReceivingItem {
  product: POSProduct;
  quantity: number;
  costPrice: number;
}

interface ReceivingModeProps {
  findByBarcode: (code: string) => POSProduct | null;
  onComplete: () => void;
  formatMoney: (amount: number) => string;
}

export default function ReceivingMode({ findByBarcode, onComplete, formatMoney }: ReceivingModeProps) {
  const { tenant } = useAuth();
  const [items, setItems] = useState<ReceivingItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleScan = useCallback((barcode: string) => {
    const product = findByBarcode(barcode);
    if (!product) {
      toast.error(`Product not found: ${barcode}`);
      return;
    }
    setItems(prev => {
      const existing = prev.findIndex(i => i.product.id === product.id);
      if (existing >= 0) {
        return prev.map((item, idx) =>
          idx === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, costPrice: product.unit_cost }];
    });
    toast.success(`Added: ${product.name}`);
  }, [findByBarcode]);

  const updateItem = (index: number, field: keyof ReceivingItem, value: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleReceive = async () => {
    if (!tenant?.id || items.length === 0) return;
    setSubmitting(true);
    try {
      for (const item of items) {
        // Update inventory quantity
        await (supabase as any)
          .from('inventory_items')
          .update({
            quantity: item.product.quantity + item.quantity,
            unit_cost: item.costPrice,
          })
          .eq('id', item.product.id)
          .eq('tenant_id', tenant.id);

        // Log inventory transaction
        await (supabase as any)
          .from('inventory_transactions')
          .insert({
            tenant_id: tenant.id,
            item_id: item.product.id,
            type: 'stock_in',
            quantity: item.quantity,
            notes: `POS Stock-in: ${item.quantity} units @ ${formatMoney(item.costPrice)}`,
          });
      }

      toast.success(`Received ${items.length} product(s) into inventory`);
      setItems([]);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive stock');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <PackagePlus className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm">Receiving Mode — Stock In</h3>
        </div>
        <BarcodeInput onScan={handleScan} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <PackagePlus className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Scan products to receive stock</p>
          </div>
        ) : (
          items.map((item, i) => (
            <div key={item.product.id} className="p-3 rounded-lg border border-border bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                  <p className="text-xs text-muted-foreground">Current stock: {item.product.quantity}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70" onClick={() => removeItem(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-sm"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cost Price</Label>
                  <Input
                    type="number"
                    value={item.costPrice}
                    onChange={(e) => updateItem(i, 'costPrice', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Total Cost</span>
            <span>{formatMoney(totalCost)}</span>
          </div>
          <Button
            className="w-full h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleReceive}
            disabled={submitting}
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Receiving...' : `Receive ${items.length} Item(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
