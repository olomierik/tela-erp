import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Cross-module automation: when a sales order is created/confirmed,
 * auto-reserve inventory, trigger production if low, create accounting
 * invoice with journal entries (AR/Revenue + COGS), and suggest procurement PO.
 */
export async function onSalesOrderCreated(
  tenantId: string,
  order: { order_number: string; customer_name: string; total_amount: number }
) {
  const actions: string[] = [];

  try {
    // 1. Create accounting invoice (income) + journal entry (debit AR, credit Revenue)
    const { error: txErr } = await (supabase.from('transactions') as any).insert([
      {
        tenant_id: tenantId,
        type: 'income',
        category: 'Sales Revenue',
        amount: order.total_amount,
        description: `Invoice for ${order.order_number} — ${order.customer_name}`,
        reference_number: order.order_number,
        date: new Date().toISOString().split('T')[0],
        custom_fields: { journal: 'debit_AR_credit_Revenue', auto: true },
      },
    ]);
    if (!txErr) actions.push('Invoice + journal entry created');

    // 2. Check inventory for low-stock items
    const { data: allItems } = await (supabase.from('inventory_items') as any)
      .select('id, name, sku, quantity, reorder_level, unit_cost')
      .eq('tenant_id', tenantId);

    const lowStock = (allItems ?? []).filter((i: any) => i.quantity <= i.reorder_level);

    // 3. Calculate and record COGS (average cost method)
    if (allItems && allItems.length > 0) {
      const avgCost = allItems.reduce((s: number, i: any) => s + Number(i.unit_cost), 0) / allItems.length;
      const estimatedCogs = avgCost * Math.max(1, Math.round(order.total_amount / avgCost / 10));
      if (estimatedCogs > 0) {
        await (supabase.from('transactions') as any).insert({
          tenant_id: tenantId,
          type: 'expense',
          category: 'Cost of Goods Sold',
          amount: Math.round(estimatedCogs * 100) / 100,
          description: `COGS for ${order.order_number}`,
          reference_number: order.order_number,
          date: new Date().toISOString().split('T')[0],
          custom_fields: { journal: 'debit_COGS_credit_Inventory', auto: true },
        });
        actions.push('COGS recorded');
      }
    }

    // 4. Create inventory transaction (sales_out) for tracking
    if (allItems && allItems.length > 0) {
      await (supabase.from('inventory_transactions') as any).insert({
        tenant_id: tenantId,
        type: 'sales_out',
        quantity: -1,
        reference_id: order.order_number,
        notes: `Sales order ${order.order_number} — ${order.customer_name}`,
      });
    }

    if (lowStock.length > 0) {
      // 5. Suggest procurement PO for low-stock items
      const poNumber = `PO-AUTO-${Date.now().toString(36).toUpperCase()}`;
      const supplierNote = lowStock.map((i: any) => `${i.name} (${i.sku})`).join(', ');
      const { error: poErr } = await (supabase.from('purchase_orders') as any).insert({
        tenant_id: tenantId,
        po_number: poNumber,
        supplier_name: 'Auto-suggested',
        total_amount: 0,
        status: 'draft',
        custom_fields: { reason: 'Low stock after sales order', items: supplierNote },
      });
      if (!poErr) {
        actions.push(`Procurement PO suggested (${lowStock.length} low-stock items)`);

        // Auto-create liability entry for procurement
        await (supabase.from('transactions') as any).insert({
          tenant_id: tenantId,
          type: 'expense',
          category: 'Accounts Payable',
          amount: 0,
          description: `Liability for ${poNumber} (pending pricing)`,
          reference_number: poNumber,
          date: new Date().toISOString().split('T')[0],
          custom_fields: { journal: 'debit_Inventory_credit_AP', auto: true },
        });
      }

      // 6. Trigger production order for critical items
      const critical = lowStock.filter((i: any) => i.quantity <= i.reorder_level * 0.5);
      if (critical.length > 0) {
        const prodNumber = `PRD-AUTO-${Date.now().toString(36).toUpperCase()}`;
        const { error: prodErr } = await (supabase.from('production_orders') as any).insert({
          tenant_id: tenantId,
          order_number: prodNumber,
          product_name: critical.map((i: any) => i.name).join(', '),
          quantity: critical.reduce((s: number, i: any) => s + (i.reorder_level * 2 - i.quantity), 0),
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

/**
 * When a production order is completed, add produced quantity to inventory
 * and create an inventory transaction.
 */
export async function onProductionCompleted(
  tenantId: string,
  order: { order_number: string; product_name: string; quantity: number }
) {
  const actions: string[] = [];

  try {
    // Find matching inventory item by name
    const { data: items } = await (supabase.from('inventory_items') as any)
      .select('id, name, quantity, unit_cost')
      .eq('tenant_id', tenantId)
      .ilike('name', `%${order.product_name.split(',')[0].trim()}%`)
      .limit(1);

    if (items && items.length > 0) {
      const item = items[0];
      // Update inventory quantity
      await (supabase.from('inventory_items') as any)
        .update({ quantity: item.quantity + order.quantity })
        .eq('id', item.id);

      // Create inventory transaction
      await (supabase.from('inventory_transactions') as any).insert({
        tenant_id: tenantId,
        item_id: item.id,
        type: 'production_in',
        quantity: order.quantity,
        reference_id: order.order_number,
        notes: `Production completed: ${order.product_name}`,
      });
      actions.push(`+${order.quantity} units added to inventory`);

      // Track manufacturing cost
      const mfgCost = order.quantity * Number(item.unit_cost);
      await (supabase.from('transactions') as any).insert({
        tenant_id: tenantId,
        type: 'expense',
        category: 'Manufacturing Cost',
        amount: mfgCost,
        description: `Manufacturing cost for ${order.order_number}`,
        reference_number: order.order_number,
        date: new Date().toISOString().split('T')[0],
        custom_fields: { journal: 'debit_WIP_credit_Manufacturing', auto: true },
      });
      actions.push('Manufacturing cost recorded');
    } else {
      // Create inventory transaction without item link
      await (supabase.from('inventory_transactions') as any).insert({
        tenant_id: tenantId,
        type: 'production_in',
        quantity: order.quantity,
        reference_id: order.order_number,
        notes: `Production completed: ${order.product_name} (no matching inventory item)`,
      });
      actions.push('Production recorded (no matching inventory item)');
    }

    if (actions.length > 0) {
      toast.info(`Production → ${actions.join(' • ')}`);
    }
  } catch (err) {
    console.error('Production completion automation error:', err);
  }
}

/**
 * When a procurement PO is received, add stock + create accounting liability entry.
 */
export async function onProcurementReceived(
  tenantId: string,
  po: { po_number: string; supplier_name: string; total_amount: number }
) {
  try {
    // Create liability accounting entry
    await (supabase.from('transactions') as any).insert({
      tenant_id: tenantId,
      type: 'expense',
      category: 'Accounts Payable',
      amount: po.total_amount,
      description: `Procurement received: ${po.po_number} from ${po.supplier_name}`,
      reference_number: po.po_number,
      date: new Date().toISOString().split('T')[0],
      custom_fields: { journal: 'debit_Inventory_credit_AP', auto: true },
    });

    // Create inventory transaction
    await (supabase.from('inventory_transactions') as any).insert({
      tenant_id: tenantId,
      type: 'procurement_in',
      quantity: 0,
      reference_id: po.po_number,
      notes: `Received from ${po.supplier_name}`,
    });

    toast.info(`Procurement ${po.po_number} → AP entry created`);
  } catch (err) {
    console.error('Procurement automation error:', err);
  }
}
