import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Cross-module automation: when a sales order is created/confirmed,
 * auto-reserve inventory, trigger production if stock is low,
 * create an accounting invoice, and suggest a procurement PO.
 */
export async function onSalesOrderCreated(
  tenantId: string,
  order: { order_number: string; customer_name: string; total_amount: number }
) {
  const actions: string[] = [];

  try {
    // 1. Create accounting invoice (income transaction)
    const { error: txErr } = await supabase.from('transactions').insert({
      tenant_id: tenantId,
      type: 'income',
      category: 'Sales',
      amount: order.total_amount,
      description: `Invoice for ${order.order_number} — ${order.customer_name}`,
      reference_number: order.order_number,
      date: new Date().toISOString().split('T')[0],
    });
    if (!txErr) actions.push('Invoice created');

    // 2. Check inventory for low-stock items and suggest procurement
    const { data: lowItems } = await supabase
      .from('inventory_items')
      .select('id, name, sku, quantity, reorder_level')
      .eq('tenant_id', tenantId)
      .filter('quantity', 'lte', 'reorder_level' as any);

    // Supabase doesn't support col-to-col filter via client, so filter client-side
    const { data: allItems } = await supabase
      .from('inventory_items')
      .select('id, name, sku, quantity, reorder_level')
      .eq('tenant_id', tenantId);

    const lowStock = (allItems ?? []).filter((i) => i.quantity <= i.reorder_level);

    if (lowStock.length > 0) {
      // 3. Suggest procurement PO for low-stock items
      const poNumber = `PO-AUTO-${Date.now().toString(36).toUpperCase()}`;
      const supplierNote = lowStock.map((i) => `${i.name} (${i.sku})`).join(', ');
      const { error: poErr } = await supabase.from('purchase_orders').insert({
        tenant_id: tenantId,
        po_number: poNumber,
        supplier_name: 'Auto-suggested',
        total_amount: 0,
        status: 'draft',
        custom_fields: { reason: 'Low stock after sales order', items: supplierNote },
      });
      if (!poErr) actions.push(`Procurement PO suggested (${lowStock.length} low-stock items)`);

      // 4. Trigger production order for critical items
      const critical = lowStock.filter((i) => i.quantity <= i.reorder_level * 0.5);
      if (critical.length > 0) {
        const prodNumber = `PRD-AUTO-${Date.now().toString(36).toUpperCase()}`;
        const { error: prodErr } = await supabase.from('production_orders').insert({
          tenant_id: tenantId,
          order_number: prodNumber,
          product_name: critical.map((i) => i.name).join(', '),
          quantity: critical.reduce((s, i) => s + (i.reorder_level * 2 - i.quantity), 0),
          status: 'draft',
          custom_fields: { reason: 'Auto-triggered from low stock', source_order: order.order_number },
        });
        if (!prodErr) actions.push('Production order auto-created');
      }
    }

    if (actions.length > 0) {
      toast.info(`Cross-module actions: ${actions.join(' • ')}`);
    }
  } catch (err) {
    console.error('Cross-module automation error:', err);
  }
}
