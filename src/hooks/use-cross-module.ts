import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface SaleLineItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
}

export interface ProcurementLineItem {
  item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Write an immutable audit trail entry. Failures are swallowed so they
 *  never block the main business operation. */
async function writeAuditLog(
  tenantId: string,
  module: string,
  action: string,
  referenceId: string,
  details: Record<string, any> = {}
) {
  try {
    await (supabase.from('audit_log') as any).insert({
      tenant_id: tenantId,
      action,
      module,
      reference_id: referenceId,
      details,
    });
  } catch {
    // Audit failures must never surface to users
  }
}

/** Create a single-sided accounting transaction record.
 *  Double-entry intent is encoded in the `journal` field of custom_fields. */
async function createAccountingEntry(
  tenantId: string,
  type: 'income' | 'expense',
  category: string,
  amount: number,
  description: string,
  reference: string,
  journal: string
) {
  if (amount <= 0) return;
  const { error } = await (supabase.from('transactions') as any).insert({
    tenant_id: tenantId,
    type,
    category,
    amount: Math.round(amount * 100) / 100,
    description,
    reference_number: reference,
    date: new Date().toISOString().split('T')[0],
    custom_fields: { journal, auto: true },
  });
  if (error) console.error(`Accounting entry error [${journal}]:`, error.message);
}

/** Record a movement in the inventory_transactions ledger. */
async function createInventoryTransaction(
  tenantId: string,
  itemId: string | null,
  type: string,
  quantity: number,
  referenceId: string,
  notes: string
) {
  const { error } = await (supabase.from('inventory_transactions') as any).insert({
    tenant_id: tenantId,
    item_id: itemId || null,
    type,
    quantity,
    reference_id: referenceId,
    notes,
  });
  if (error) console.error(`Inventory transaction error [${type}]:`, error.message);
}

// ─── Sales Order Created ──────────────────────────────────────────────────────
/**
 * SALE_CREATED event
 *
 * Triggered immediately when a new sales order is saved (status = pending).
 * Actions:
 *   1. Deduct stock per line item — prevents double-selling.
 *   2. Record COGS per item (debit COGS / credit Inventory).
 *   3. Record Revenue (debit AR / credit Revenue).
 *   4. Auto-draft procurement PO for any item that drops below reorder level.
 *   5. Write audit log entry.
 *
 * If a line item has no item_id it is skipped for inventory purposes (e.g.
 * a service line). The revenue entry is always created for the full total.
 */
export async function onSalesOrderCreated(
  tenantId: string,
  order: { id: string; order_number: string; customer_name: string; total_amount: number },
  lineItems: SaleLineItem[]
) {
  const actions: string[] = [];
  try {
    // ── 1. Revenue / AR journal entry ────────────────────────────────────────
    await createAccountingEntry(
      tenantId, 'income', 'Sales Revenue',
      order.total_amount,
      `Sales Order ${order.order_number} — ${order.customer_name}`,
      order.order_number,
      'debit_AR_credit_Revenue'
    );
    actions.push('Revenue entry');

    // ── 2. Per-item: inventory deduction + COGS + low-stock detection ────────
    const validLines = lineItems.filter(li => li.item_id && li.quantity > 0);
    for (const li of validLines) {
      const { data: item, error: fetchErr } = await (supabase.from('inventory_items') as any)
        .select('id, name, quantity, reorder_level, unit_cost')
        .eq('id', li.item_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (fetchErr || !item) continue;

      // Deduct quantity (floor at 0 — negative stock is prevented by UI validation)
      const newQty = Math.max(0, (item.quantity as number) - li.quantity);
      await (supabase.from('inventory_items') as any)
        .update({ quantity: newQty })
        .eq('id', li.item_id);

      // Inventory ledger record
      await createInventoryTransaction(
        tenantId, li.item_id, 'sales_out',
        -li.quantity, order.order_number,
        `Sold in ${order.order_number} — ${order.customer_name}`
      );

      // COGS (unit_cost × qty)
      const cogs = li.quantity * Number(item.unit_cost);
      if (cogs > 0) {
        await createAccountingEntry(
          tenantId, 'expense', 'Cost of Goods Sold',
          cogs,
          `COGS — ${li.item_name} (${li.quantity} units) — ${order.order_number}`,
          order.order_number,
          'debit_COGS_credit_Inventory'
        );
      }

      // Auto-draft procurement PO if now below reorder level
      const reorderLevel = Number(item.reorder_level ?? 0);
      if (reorderLevel > 0 && newQty <= reorderLevel) {
        const poNumber = `PO-AUTO-${Date.now().toString(36).toUpperCase()}`;
        await (supabase.from('purchase_orders') as any).insert({
          tenant_id: tenantId,
          po_number: poNumber,
          supplier_name: 'Auto-suggested',
          total_amount: 0,
          status: 'draft',
          custom_fields: {
            reason: `Low stock — ${item.name} dropped to ${newQty} (reorder at ${reorderLevel})`,
            source_order: order.order_number,
            auto: true,
          },
        });
      }
    }

    if (validLines.length > 0) actions.push('Inventory deducted');

    // ── 3. Audit log ─────────────────────────────────────────────────────────
    await writeAuditLog(tenantId, 'sales', 'SALE_CREATED', order.order_number, {
      order_id: order.id,
      customer: order.customer_name,
      total: order.total_amount,
      line_count: validLines.length,
    });

    if (actions.length) {
      toast.info(`Order ${order.order_number}: ${actions.join(' · ')}`);
    }
  } catch (err) {
    console.error('[onSalesOrderCreated] error:', err);
  }
}

// ─── Sales Order Cancelled ────────────────────────────────────────────────────
/**
 * SALE_CANCELLED event
 *
 * Restores inventory when an order is cancelled, reversing the deduction made
 * at creation. Records a reversal accounting entry.
 */
export async function onSalesOrderCancelled(
  tenantId: string,
  order: { id: string; order_number: string; total_amount: number },
  lineItems: SaleLineItem[]
) {
  try {
    for (const li of lineItems.filter(li => li.item_id && li.quantity > 0)) {
      const { data: item } = await (supabase.from('inventory_items') as any)
        .select('id, quantity')
        .eq('id', li.item_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (item) {
        await (supabase.from('inventory_items') as any)
          .update({ quantity: (item.quantity as number) + li.quantity })
          .eq('id', li.item_id);

        await createInventoryTransaction(
          tenantId, li.item_id, 'adjustment',
          li.quantity, order.order_number,
          `Reversal — cancelled order ${order.order_number}`
        );
      }
    }

    // Reversal accounting entry
    await createAccountingEntry(
      tenantId, 'expense', 'Sales Reversal',
      order.total_amount,
      `Reversal for cancelled order ${order.order_number}`,
      order.order_number,
      'debit_Revenue_credit_AR_reversal'
    );

    await writeAuditLog(tenantId, 'sales', 'SALE_CANCELLED', order.order_number, {
      order_id: order.id,
      total: order.total_amount,
    });

    toast.info(`Order ${order.order_number} cancelled — stock restored`);
  } catch (err) {
    console.error('[onSalesOrderCancelled] error:', err);
  }
}

// ─── Production Order Completed ───────────────────────────────────────────────
/**
 * PRODUCTION_COMPLETED event
 *
 * Triggered when a production order status is set to 'completed'.
 * Actions:
 *   1. Add finished goods to inventory (by item_id or name-match fallback).
 *   2. Record manufacturing cost journal entry (debit Finished Goods / credit WIP).
 *   3. Deduct raw materials per BOM lines (with wastage).
 *   4. Write audit log entry.
 *
 * BOM lookup: find bom_templates where finished_item_id = production_order.item_id,
 * then deduct each bom_lines.raw_material_id × quantity × production qty.
 */
export async function onProductionCompleted(
  tenantId: string,
  order: {
    id: string;
    order_number: string;
    product_name: string;
    quantity: number;
    item_id?: string | null;
  }
) {
  const actions: string[] = [];
  try {
    let finishedItemId: string | null = order.item_id ?? null;
    let unitCost = 0;

    // ── 1. Add finished goods to inventory ───────────────────────────────────
    if (finishedItemId) {
      const { data: item } = await (supabase.from('inventory_items') as any)
        .select('id, quantity, unit_cost')
        .eq('id', finishedItemId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (item) {
        unitCost = Number(item.unit_cost);
        await (supabase.from('inventory_items') as any)
          .update({ quantity: (item.quantity as number) + order.quantity })
          .eq('id', finishedItemId);
        actions.push(`+${order.quantity} units added`);
      }
    } else {
      // Fallback: name-based lookup (for orders not linked to an inventory item)
      const firstName = order.product_name.split(',')[0].trim();
      const { data: items } = await (supabase.from('inventory_items') as any)
        .select('id, quantity, unit_cost')
        .eq('tenant_id', tenantId)
        .ilike('name', `%${firstName}%`)
        .limit(1);

      if (items && items.length > 0) {
        finishedItemId = items[0].id;
        unitCost = Number(items[0].unit_cost);
        await (supabase.from('inventory_items') as any)
          .update({ quantity: (items[0].quantity as number) + order.quantity })
          .eq('id', finishedItemId);
        actions.push(`+${order.quantity} units added`);
      }
    }

    // Inventory ledger record
    await createInventoryTransaction(
      tenantId, finishedItemId, 'production_in',
      order.quantity, order.order_number,
      `Production completed: ${order.product_name}`
    );

    // ── 2. Manufacturing cost journal entry ───────────────────────────────────
    const mfgCost = order.quantity * unitCost;
    if (mfgCost > 0) {
      await createAccountingEntry(
        tenantId, 'expense', 'Manufacturing Cost',
        mfgCost,
        `Manufacturing cost — ${order.order_number} (${order.quantity} × ${order.product_name})`,
        order.order_number,
        'debit_FinishedGoods_credit_WIP'
      );
      actions.push('Mfg cost recorded');
    }

    // ── 3. Deduct raw materials via BOM ───────────────────────────────────────
    if (finishedItemId) {
      const { data: boms } = await (supabase.from('bom_templates') as any)
        .select('id, output_quantity')
        .eq('tenant_id', tenantId)
        .eq('finished_item_id', finishedItemId)
        .eq('is_active', true)
        .limit(1);

      if (boms && boms.length > 0) {
        const bom = boms[0];
        const outputQty = Number(bom.output_quantity) || 1;
        // How many BOM runs needed to produce `order.quantity` units
        const runs = order.quantity / outputQty;

        const { data: bomLines } = await (supabase.from('bom_lines') as any)
          .select('raw_material_id, quantity, wastage_percent')
          .eq('bom_id', bom.id);

        if (bomLines && bomLines.length > 0) {
          for (const line of bomLines) {
            const wasteFactor = 1 + (Number(line.wastage_percent) || 0) / 100;
            const consumed = Math.ceil(Number(line.quantity) * runs * wasteFactor);

            const { data: rawItem } = await (supabase.from('inventory_items') as any)
              .select('id, quantity, name')
              .eq('id', line.raw_material_id)
              .eq('tenant_id', tenantId)
              .maybeSingle();

            if (rawItem && (rawItem.quantity as number) >= consumed) {
              await (supabase.from('inventory_items') as any)
                .update({ quantity: (rawItem.quantity as number) - consumed })
                .eq('id', line.raw_material_id);

              await createInventoryTransaction(
                tenantId, line.raw_material_id, 'production_out',
                -consumed, order.order_number,
                `Raw material for ${order.order_number}: ${rawItem.name}`
              );
            } else if (rawItem) {
              // Not enough raw material — deduct what's available
              await (supabase.from('inventory_items') as any)
                .update({ quantity: 0 })
                .eq('id', line.raw_material_id);
              await createInventoryTransaction(
                tenantId, line.raw_material_id, 'production_out',
                -(rawItem.quantity as number), order.order_number,
                `Partial raw material for ${order.order_number}: ${rawItem.name} (shortage)`
              );
            }
          }
          actions.push('Raw materials deducted');
        }
      }
    }

    // ── 4. Audit log ──────────────────────────────────────────────────────────
    await writeAuditLog(tenantId, 'production', 'PRODUCTION_COMPLETED', order.order_number, {
      order_id: order.id,
      product: order.product_name,
      quantity: order.quantity,
      item_id: finishedItemId,
    });

    toast.success(`Production ${order.order_number} completed: ${actions.join(' · ')}`);
  } catch (err) {
    console.error('[onProductionCompleted] error:', err);
  }
}

// ─── Procurement Received ─────────────────────────────────────────────────────
/**
 * PROCUREMENT_RECEIVED event
 *
 * Triggered when a PO status changes to 'received' (Goods Received Note).
 * Actions:
 *   1. Record AP liability journal entry (debit Inventory / credit AP).
 *   2. For each line item with an item_id, increase inventory quantity.
 *   3. Write inventory transaction (procurement_in) per item.
 *   4. Write audit log entry.
 *
 * Line items without an item_id are tracked in the transaction ledger only
 * (no inventory item update — e.g. services or un-catalogued goods).
 */
export async function onProcurementReceived(
  tenantId: string,
  po: { id: string; po_number: string; supplier_name: string; total_amount: number },
  lineItems?: ProcurementLineItem[]
) {
  const actions: string[] = [];
  try {
    // ── 1. AP / Inventory asset journal entry ─────────────────────────────────
    await createAccountingEntry(
      tenantId, 'expense', 'Accounts Payable',
      po.total_amount,
      `PO ${po.po_number} received from ${po.supplier_name}`,
      po.po_number,
      'debit_InventoryAsset_credit_AP'
    );
    actions.push('AP entry created');

    // ── 2 & 3. Inventory update per line item ─────────────────────────────────
    const linkedLines = (lineItems ?? []).filter(li => li.item_id && li.quantity > 0);

    if (linkedLines.length > 0) {
      for (const li of linkedLines) {
        const { data: item } = await (supabase.from('inventory_items') as any)
          .select('id, quantity')
          .eq('id', li.item_id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (item) {
          await (supabase.from('inventory_items') as any)
            .update({ quantity: (item.quantity as number) + li.quantity })
            .eq('id', li.item_id);

          await createInventoryTransaction(
            tenantId, li.item_id!, 'procurement_in',
            li.quantity, po.po_number,
            `Received from ${po.supplier_name} via ${po.po_number}: ${li.description}`
          );
        }
      }
      actions.push(`${linkedLines.length} item(s) restocked`);
    } else {
      // Generic procurement_in record even when no items are linked
      await createInventoryTransaction(
        tenantId, null, 'procurement_in',
        0, po.po_number,
        `Received from ${po.supplier_name} (no inventory items linked)`
      );
    }

    // ── 4. Audit log ──────────────────────────────────────────────────────────
    await writeAuditLog(tenantId, 'procurement', 'PROCUREMENT_RECEIVED', po.po_number, {
      po_id: po.id,
      supplier: po.supplier_name,
      total: po.total_amount,
      lines: linkedLines.length,
    });

    toast.success(`PO ${po.po_number} received: ${actions.join(' · ')}`);
  } catch (err) {
    console.error('[onProcurementReceived] error:', err);
  }
}

// ─── Stock Transfer Completed ─────────────────────────────────────────────────
/**
 * TRANSFER_COMPLETED event
 *
 * Triggered when a stock transfer is marked 'completed'.
 * Actions:
 *   1. Deduct quantity from source store inventory item.
 *   2. Add quantity to matching item (by SKU) at destination store.
 *      If no matching item exists at destination, a copy is created.
 *   3. Record inventory transactions at both ends (transfer_out / transfer_in).
 *   4. Write audit log entry.
 *
 * Validation: if source has insufficient stock the transfer is aborted and
 * the user receives an error toast.
 */
export async function onStockTransferCompleted(
  tenantId: string,
  transfer: {
    id: string;
    transfer_number: string;
    source_store_id: string;
    destination_store_id: string;
    item_id: string;
    quantity: number;
  }
) {
  try {
    // ── 1. Fetch source inventory item ────────────────────────────────────────
    const { data: sourceItem, error: srcErr } = await (supabase.from('inventory_items') as any)
      .select('id, sku, name, category, quantity, unit_cost, reorder_level, warehouse_location')
      .eq('id', transfer.item_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (srcErr || !sourceItem) {
      toast.error('Source inventory item not found');
      return;
    }
    if ((sourceItem.quantity as number) < transfer.quantity) {
      toast.error(
        `Insufficient stock at source — available: ${sourceItem.quantity}, requested: ${transfer.quantity}`
      );
      return;
    }

    // ── 2. Deduct from source ─────────────────────────────────────────────────
    await (supabase.from('inventory_items') as any)
      .update({ quantity: (sourceItem.quantity as number) - transfer.quantity })
      .eq('id', sourceItem.id);

    await createInventoryTransaction(
      tenantId, sourceItem.id, 'transfer_out',
      -transfer.quantity, transfer.transfer_number,
      `Transfer ${transfer.transfer_number} — dispatched from store`
    );

    // ── 3. Add to destination (find by SKU + destination_store_id) ────────────
    const { data: destItems } = await (supabase.from('inventory_items') as any)
      .select('id, quantity')
      .eq('tenant_id', tenantId)
      .eq('store_id', transfer.destination_store_id)
      .eq('sku', sourceItem.sku)
      .limit(1);

    if (destItems && destItems.length > 0) {
      // Existing item at destination — increment quantity
      await (supabase.from('inventory_items') as any)
        .update({ quantity: (destItems[0].quantity as number) + transfer.quantity })
        .eq('id', destItems[0].id);

      await createInventoryTransaction(
        tenantId, destItems[0].id, 'transfer_in',
        transfer.quantity, transfer.transfer_number,
        `Transfer ${transfer.transfer_number} — received at destination store`
      );
    } else {
      // No item at destination — create a new record (copy of source metadata)
      const { data: newItem } = await (supabase.from('inventory_items') as any)
        .insert({
          tenant_id: tenantId,
          store_id: transfer.destination_store_id,
          sku: sourceItem.sku,
          name: sourceItem.name,
          category: sourceItem.category || '',
          quantity: transfer.quantity,
          unit_cost: sourceItem.unit_cost,
          reorder_level: sourceItem.reorder_level,
          warehouse_location: sourceItem.warehouse_location,
        })
        .select()
        .single();

      if (newItem) {
        await createInventoryTransaction(
          tenantId, newItem.id, 'transfer_in',
          transfer.quantity, transfer.transfer_number,
          `Transfer ${transfer.transfer_number} — new stock created at destination store`
        );
      }
    }

    // ── 4. Audit log ──────────────────────────────────────────────────────────
    await writeAuditLog(tenantId, 'transfers', 'TRANSFER_COMPLETED', transfer.transfer_number, {
      transfer_id: transfer.id,
      item_id: transfer.item_id,
      item_name: sourceItem.name,
      quantity: transfer.quantity,
      from_store: transfer.source_store_id,
      to_store: transfer.destination_store_id,
    });

    toast.success(
      `Transfer ${transfer.transfer_number} completed — ${transfer.quantity} × ${sourceItem.name} moved`
    );
  } catch (err) {
    console.error('[onStockTransferCompleted] error:', err);
    toast.error('Transfer completion failed — check console for details');
  }
}
