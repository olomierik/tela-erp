import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired' },
  { value: 'lost', label: 'Lost' },
  { value: 'other', label: 'Other' },
];

interface Props {
  items: any[];
}

export function InventoryAdjustmentDialog({ items }: Props) {
  const { tenant } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    item_id: '',
    quantity: '1',
    reason: 'damaged',
    notes: '',
  });

  const selectedItem = items.find((i: any) => i.id === form.item_id);
  const qty = parseInt(form.quantity) || 0;
  const stockError = selectedItem && qty > selectedItem.quantity
    ? `Only ${selectedItem.quantity} units available`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedItem) return;
    if (qty <= 0 || qty > selectedItem.quantity) {
      toast.error('Invalid quantity');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert adjustment record
      const { error: adjErr } = await (supabase.from('inventory_adjustments') as any).insert({
        tenant_id: tenant.id,
        item_id: form.item_id,
        quantity: qty,
        type: 'deduction',
        reason: form.reason,
        notes: form.notes,
        adjusted_by_user_id: user?.id,
      });
      if (adjErr) throw adjErr;

      // Deduct from inventory
      const { error: updErr } = await (supabase.from('inventory_items') as any)
        .update({ quantity: selectedItem.quantity - qty })
        .eq('id', form.item_id);
      if (updErr) throw updErr;

      // Create inventory transaction
      await (supabase.from('inventory_transactions') as any).insert({
        tenant_id: tenant.id,
        item_id: form.item_id,
        type: 'adjustment',
        quantity: -qty,
        reference_id: `ADJ-${Date.now().toString(36).toUpperCase()}`,
        notes: `Manual deduction: ${form.reason} — ${form.notes}`,
      });

      // Audit log
      await (supabase.from('audit_log') as any).insert({
        tenant_id: tenant.id,
        action: 'inventory_adjustment',
        module: 'inventory',
        reference_id: form.item_id,
        details: { quantity: qty, reason: form.reason, notes: form.notes, item: selectedItem.name },
      });

      toast.success(`Deducted ${qty} units of ${selectedItem.name}`);
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
      qc.invalidateQueries({ queryKey: ['inventory_adjustments'] });
      setOpen(false);
      setForm({ item_id: '', quantity: '1', reason: 'damaged', notes: '' });
    } catch (err: any) {
      toast.error(err.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MinusCircle className="w-4 h-4" /> Manual Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Manual Inventory Adjustment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item</Label>
            <Select value={form.item_id} onValueChange={v => setForm(p => ({ ...p, item_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
              <SelectContent>
                {items.filter((i: any) => i.quantity > 0).map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.quantity} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity to Deduct</Label>
              <Input type="number" min="1" max={selectedItem?.quantity || 99999} required
                value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={v => setForm(p => ({ ...p, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {stockError && (
            <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md border border-destructive/20">
              ⚠️ {stockError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional details..." rows={2} />
          </div>

          <Button type="submit" variant="destructive" className="w-full" disabled={loading || !!stockError || !form.item_id}>
            {loading ? 'Processing...' : `Deduct ${qty} Unit${qty !== 1 ? 's' : ''}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
