import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PackagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { POSProduct } from '@/hooks/use-pos-cache';

interface QuickCreateProductProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  onCreated: (product: POSProduct) => void;
}

export default function QuickCreateProduct({ open, onOpenChange, barcode, onCreated }: QuickCreateProductProps) {
  const { tenant } = useAuth();
  const [form, setForm] = useState({
    name: '',
    unit_cost: '',
    category: 'General',
    quantity: '',
    reorder_level: '5',
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!tenant?.id) return;

    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('inventory_items')
        .insert({
          tenant_id: tenant.id,
          name: form.name.trim(),
          sku: barcode,
          category: form.category || 'General',
          unit_cost: parseFloat(form.unit_cost) || 0,
          quantity: parseInt(form.quantity) || 0,
          reorder_level: parseInt(form.reorder_level) || 5,
          status: 'good',
        })
        .select('id, name, sku, category, quantity, unit_cost, reorder_level, status, image_url')
        .single();

      if (error) throw error;
      toast.success(`Product "${data.name}" created`);
      onCreated(data);
      onOpenChange(false);
      setForm({ name: '', unit_cost: '', category: 'General', quantity: '', reorder_level: '5' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            New Product
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Barcode / SKU</Label>
            <Input value={barcode} disabled className="h-9 font-mono bg-muted" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Product Name *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="h-9" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Selling Price</Label>
              <Input type="number" value={form.unit_cost} onChange={(e) => setForm(f => ({ ...f, unit_cost: e.target.value }))} className="h-9" placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Initial Stock</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} className="h-9" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reorder Level</Label>
              <Input type="number" value={form.reorder_level} onChange={(e) => setForm(f => ({ ...f, reorder_level: e.target.value }))} className="h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create & Add to Cart'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
