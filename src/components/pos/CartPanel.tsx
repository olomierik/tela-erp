import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, ShoppingCart, AlertTriangle } from 'lucide-react';
import type { POSCartItem } from '@/hooks/use-pos-cache';

interface CartPanelProps {
  items: POSCartItem[];
  onUpdateQuantity: (index: number, qty: number) => void;
  onUpdateDiscount: (index: number, discount: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  taxRate: number;
  formatMoney: (amount: number) => string;
  canDiscount: boolean;
  lastScannedId?: string;
}

export default function CartPanel({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  onCheckout,
  taxRate,
  formatMoney,
  canDiscount,
  lastScannedId,
}: CartPanelProps) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity;
    const discountAmt = lineTotal * (item.discount / 100);
    return sum + lineTotal - discountAmt;
  }, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Cart</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {items.reduce((s, i) => s + i.quantity, 0)} items
          </span>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={onClearCart}>
            Clear
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">Scan a product to start</p>
            <p className="text-xs mt-1">or search from the product grid</p>
          </div>
        ) : (
          items.map((item, i) => {
            const lineTotal = item.unitPrice * item.quantity * (1 - item.discount / 100);
            const isLowStock = item.product.quantity <= item.product.reorder_level;
            const isLastScanned = item.product.id === lastScannedId;

            return (
              <div
                key={item.product.id}
                className={`p-2.5 rounded-lg border transition-all duration-300 ${
                  isLastScanned
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      {isLowStock && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{item.product.sku}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(item.unitPrice)} each · Stock: {item.product.quantity}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                    onClick={() => onRemoveItem(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-r-none"
                      onClick={() => onUpdateQuantity(i, Math.max(1, item.quantity - 1))}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(i, Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-7 w-12 text-center text-xs border-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min={1}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-l-none"
                      onClick={() => onUpdateQuantity(i, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {canDiscount && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={item.discount || ''}
                        onChange={(e) => onUpdateDiscount(i, Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        placeholder="0"
                        className="h-7 w-14 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min={0}
                        max={100}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  )}

                  <span className="ml-auto text-sm font-semibold">{formatMoney(lineTotal)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span>{formatMoney(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
            <span>Total</span>
            <span className="text-primary">{formatMoney(total)}</span>
          </div>
          <Button
            className="w-full mt-2 h-11 text-sm font-semibold gap-2"
            onClick={onCheckout}
          >
            <ShoppingCart className="w-4 h-4" />
            Checkout — {formatMoney(total)}
          </Button>
        </div>
      )}
    </div>
  );
}
