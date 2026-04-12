import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Banknote, Smartphone, Building2, CheckCircle2 } from 'lucide-react';
import type { POSCartItem } from '@/hooks/use-pos-cache';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: POSCartItem[];
  taxRate: number;
  formatMoney: (amount: number) => string;
  onComplete: (data: { customerName: string; paymentMethod: string; amountPaid: number }) => Promise<void>;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'credit', label: 'Credit', icon: CreditCard },
];

export default function CheckoutDialog({
  open,
  onOpenChange,
  items,
  taxRate,
  formatMoney,
  onComplete,
}: CheckoutDialogProps) {
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.unitPrice * item.quantity;
    return sum + lineTotal * (1 - item.discount / 100);
  }, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const paid = parseFloat(amountPaid) || 0;
  const change = paid - total;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onComplete({
        customerName,
        paymentMethod,
        amountPaid: paid || total,
      });
      setCustomerName('Walk-in Customer');
      setAmountPaid('');
      setPaymentMethod('cash');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Complete Sale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border border-border p-3 space-y-1.5 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items</span>
              <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>{formatMoney(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
              <span>Total</span>
              <span className="text-primary">{formatMoney(total)}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label className="text-xs">Customer Name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              className="h-9"
              onFocus={(e) => e.stopPropagation()}
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(pm => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      paymentMethod === pm.value
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {pm.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Paid (for cash) */}
          {paymentMethod === 'cash' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Amount Paid</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={total.toFixed(2)}
                className="h-9 text-right font-mono"
                onFocus={(e) => e.stopPropagation()}
              />
              {paid > 0 && paid >= total && (
                <p className="text-xs text-emerald-600 font-medium">
                  Change: {formatMoney(change)}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (paymentMethod === 'cash' && paid > 0 && paid < total)}
            className="gap-2"
          >
            {submitting ? 'Processing...' : `Pay ${formatMoney(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
