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

// ─── Chart of Accounts ────────────────────────────────────────────────────────

/** Standard GL account definitions used by auto-posting. */
const GL_ACCOUNTS: Record<string, { code: string; name: string; account_type: string }> = {
  ar:                   { code: '1100', name: 'Accounts Receivable',   account_type: 'asset' },
  inventory_asset:      { code: '1300', name: 'Inventory Asset',       account_type: 'asset' },
  wip:                  { code: '1340', name: 'Work In Progress',       account_type: 'asset' },
  finished_goods:       { code: '1350', name: 'Finished Goods',        account_type: 'asset' },
  ap:                   { code: '2000', name: 'Accounts Payable',      account_type: 'liability' },
  wages_payable:        { code: '2100', name: 'Wages Payable',         account_type: 'liability' },
  tax_payable:          { code: '2200', name: 'Tax Payable',           account_type: 'liability' },
  revenue:              { code: '4000', name: 'Sales Revenue',         account_type: 'revenue' },
  service_revenue:      { code: '4100', name: 'Service Revenue',       account_type: 'revenue' },
  cogs:                 { code: '5000', name: 'Cost of Goods Sold',    account_type: 'expense' },
  salary_expense:       { code: '5200', name: 'Salary Expense',        account_type: 'expense' },
  payroll_deductions:   { code: '5210', name: 'Payroll Deductions',    account_type: 'expense' },
  manufacturing_cost:   { code: '5300', name: 'Manufacturing Cost',    account_type: 'expense' },
};

/** Maps journal label to [debit account key, credit account key]. */
const JOURNAL_MAP: Record<string, [string, string]> = {
  debit_AR_credit_Revenue:                   ['ar',                 'revenue'],
  debit_COGS_credit_Inventory:               ['cogs',               'inventory_asset'],
  debit_InventoryAsset_credit_AP:            ['inventory_asset',    'ap'],
  debit_FinishedGoods_credit_WIP:            ['finished_goods',     'wip'],
  debit_Revenue_credit_AR_reversal:          ['revenue',            'ar'],
  debit_SalaryExpense_credit_PayableWages:   ['salary_expense',     'wages_payable'],
  debit_PayrollDeductions_credit_TaxPayable: ['payroll_deductions', 'tax_payable'],
  debit_AR_credit_ServiceRevenue:            ['ar',                 'service_revenue'],
  debit_ServiceRevenue_credit_AR_reversal:   ['service_revenue',    'ar'],
};

/**
 * Returns the id of the GL account with the given code, creating it if needed.
 * Failures are silently swallowed to avoid blocking business operations.
 */
async function getOrCreateGLAccount(tenantId: string, key: string): Promise<string | null> {
  const def = GL_ACCOUNTS[key];
  if (!def) return null;
  try {
    const { data: existing } = await (supabase.from('chart_of_accounts') as any)
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', def.code)
      .maybeSingle();

    if (existing?.id) return existing.id as string;

    const { data: created } = await (supabase.from('chart_of_accounts') as any)
      .insert({
        tenant_id: tenantId,
        code: def.code,
        name: def.name,
        account_type: def.account_type,
        is_system: true,
        balance: 0,
      })
      .select('id')
      .single();

    return created?.id ?? null;
  } catch {
    return null;
  }
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

interface AccountingEntryParams {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  reference: string;
  journal: string;
  referenceType?: string;
}

/**
 * Creates a transaction entry AND a matching journal_entry for double-entry GL.
 * The journal_entry is posted to chart_of_accounts accounts (auto-created if needed).
 */
async function createAccountingEntry(tenantId: string, p: AccountingEntryParams) {
  if (p.amount <= 0) return;
  const amount = Math.round(p.amount * 100) / 100;

  // 1. Write to transactions (existing simplified ledger)
  const { error: txnErr } = await (supabase.from('transactions') as any).insert({
    tenant_id: tenantId,
    type: p.type,
    category: p.category,
    amount,
    description: p.description,
    reference_number: p.reference,
    date: new Date().toISOString().split('T')[0],
    custom_fields: { journal: p.journal, auto: true },
  });
  if (txnErr) console.error(`Accounting entry error [${p.journal}]:`, txnErr.message);

  // 2. Write a proper double-entry journal record (used by Trial Balance / General Ledger)
  const keys = JOURNAL_MAP[p.journal];
  if (keys) {
    const [debitKey, creditKey] = keys;
    const [debitId, creditId] = await Promise.all([
      getOrCreateGLAccount(tenantId, debitKey),
      getOrCreateGLAccount(tenantId, creditKey),
    ]);

    if (debitId && creditId) {
      const { error: jeErr } = await (supabase.from('journal_entries') as any).insert({
        tenant_id: tenantId,
        entry_date: new Date().toISOString().split('T')[0],
        description: p.description,
        reference_type: p.referenceType ?? 'auto',
        reference_id: p.reference,
        debit_account_id: debitId,
        credit_account_id: creditId,
        amount,
        is_auto: true,
      });
      if (jeErr) console.error(`Journal entry error [${p.journal}]:`, jeErr.message);
    }
  }
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
 *   4. Mark inventory_reservations as fulfilled.
 *   5. Auto-draft procurement PO for any item that drops below reorder level.
 *   6. Write audit log entry.
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
    await createAccountingEntry(tenantId, {
      type: 'income',
      category: 'Sales Revenue',
      amount: order.total_amount,
      description: `Sales Order ${order.order_number} — ${order.customer_name}`,
      reference: order.order_number,
      journal: 'debit_AR_credit_Revenue',
      referenceType: 'sales_order',
    });
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
        await createAccountingEntry(tenantId, {
          type: 'expense',
          category: 'Cost of Goods Sold',
          amount: cogs,
          description: `COGS — ${li.item_name} (${li.quantity} units) — ${order.order_number}`,
          reference: order.order_number,
          journal: 'debit_COGS_credit_Inventory',
          referenceType: 'sales_order',
        });
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

    // ── 3. Mark inventory reservations as fulfilled ───────────────────────────
    if (order.id && validLines.length > 0) {
      await (supabase.from('inventory_reservations') as any)
        .update({ status: 'fulfilled' })
        .eq('sales_order_id', order.id)
        .eq('tenant_id', tenantId);
    }

    // ── 4. Audit log ─────────────────────────────────────────────────────────
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
    await createAccountingEntry(tenantId, {
      type: 'expense',
      category: 'Sales Reversal',
      amount: order.total_amount,
      description: `Reversal for cancelled order ${order.order_number}`,
      reference: order.order_number,
      journal: 'debit_Revenue_credit_AR_reversal',
      referenceType: 'sales_order',
    });

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
      await createAccountingEntry(tenantId, {
        type: 'expense',
        category: 'Manufacturing Cost',
        amount: mfgCost,
        description: `Manufacturing cost — ${order.order_number} (${order.quantity} × ${order.product_name})`,
        reference: order.order_number,
        journal: 'debit_FinishedGoods_credit_WIP',
        referenceType: 'production_order',
      });
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
 */
export async function onProcurementReceived(
  tenantId: string,
  po: { id: string; po_number: string; supplier_name: string; total_amount: number },
  lineItems?: ProcurementLineItem[]
) {
  const actions: string[] = [];
  try {
    // ── 1. AP / Inventory asset journal entry ─────────────────────────────────
    await createAccountingEntry(tenantId, {
      type: 'expense',
      category: 'Accounts Payable',
      amount: po.total_amount,
      description: `PO ${po.po_number} received from ${po.supplier_name}`,
      reference: po.po_number,
      journal: 'debit_InventoryAsset_credit_AP',
      referenceType: 'purchase_order',
    });
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

// ─── BOM Material Availability Validation ─────────────────────────────────────
/**
 * Checks whether sufficient raw materials exist to start a production order.
 * Returns { valid, shortfalls[] }. If no BOM is found, returns valid=true.
 * Designed to be called BEFORE allowing status → 'in_progress'.
 */
export interface BOMShortfall {
  material: string;
  required: number;
  available: number;
  shortage: number;
}

export async function validateBOMAvailability(
  tenantId: string,
  productionOrder: { item_id?: string | null; quantity: number; product_name: string }
): Promise<{ valid: boolean; shortfalls: BOMShortfall[] }> {
  if (!productionOrder.item_id) return { valid: true, shortfalls: [] };

  try {
    const { data: bom } = await (supabase.from('bom_templates') as any)
      .select('id, output_quantity, bom_lines(raw_material_id, quantity, wastage_percent)')
      .eq('tenant_id', tenantId)
      .eq('finished_item_id', productionOrder.item_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!bom) return { valid: true, shortfalls: [] };

    const outputQty = Number(bom.output_quantity) || 1;
    const runs = productionOrder.quantity / outputQty;
    const shortfalls: BOMShortfall[] = [];

    for (const line of bom.bom_lines ?? []) {
      const wasteFactor = 1 + (Number(line.wastage_percent) || 0) / 100;
      const required = Math.ceil(Number(line.quantity) * runs * wasteFactor);

      const { data: rawItem } = await (supabase.from('inventory_items') as any)
        .select('id, name, quantity')
        .eq('id', line.raw_material_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const available = Number(rawItem?.quantity ?? 0);
      if (available < required) {
        shortfalls.push({
          material: rawItem?.name ?? line.raw_material_id,
          required,
          available,
          shortage: required - available,
        });
      }
    }

    return { valid: shortfalls.length === 0, shortfalls };
  } catch (err) {
    console.error('[validateBOMAvailability] error:', err);
    return { valid: true, shortfalls: [] }; // Don't block on error
  }
}

// ─── Payroll Approved ─────────────────────────────────────────────────────────
/**
 * PAYROLL_APPROVED event
 *
 * Triggered when a payroll run is approved/paid.
 * Actions:
 *   1. Post salary expense to accounting (debit Salary Expense / credit Wages Payable).
 *   2. Post statutory deductions entry (debit Payroll Deductions / credit Tax Payable).
 *   3. Write audit log entry.
 */
export async function onPayrollApproved(
  tenantId: string,
  payrollRun: { id: string; month: number; year: number },
  lines: Array<{ gross_salary: number; net_salary: number }>
) {
  try {
    const totalNet = lines.reduce((s, l) => s + Number(l.net_salary), 0);
    const totalGross = lines.reduce((s, l) => s + Number(l.gross_salary), 0);
    const totalDeductions = totalGross - totalNet;
    const period = `${payrollRun.month}/${payrollRun.year}`;
    const reference = `PAYROLL-${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}`;

    // 1. Net salary expense
    await createAccountingEntry(tenantId, {
      type: 'expense',
      category: 'Salary Expense',
      amount: totalNet,
      description: `Payroll ${period} — ${lines.length} employee${lines.length !== 1 ? 's' : ''}`,
      reference,
      journal: 'debit_SalaryExpense_credit_PayableWages',
      referenceType: 'payroll_run',
    });

    // 2. Statutory deductions (PAYE + NSSF + SDL + WCF)
    if (totalDeductions > 0) {
      await createAccountingEntry(tenantId, {
        type: 'expense',
        category: 'Payroll Deductions',
        amount: totalDeductions,
        description: `Statutory deductions — ${period} (PAYE, NSSF, SDL, WCF)`,
        reference,
        journal: 'debit_PayrollDeductions_credit_TaxPayable',
        referenceType: 'payroll_run',
      });
    }

    // 3. Audit log
    await writeAuditLog(tenantId, 'hr', 'PAYROLL_APPROVED', reference, {
      run_id: payrollRun.id,
      period,
      total_gross: totalGross,
      total_net: totalNet,
      total_deductions: totalDeductions,
      employee_count: lines.length,
    });

    toast.success(`Payroll ${period} posted to accounting — ${lines.length} employees`);
  } catch (err) {
    console.error('[onPayrollApproved] error:', err);
    toast.error('Failed to post payroll to accounting');
  }
}

// ─── Service Order Created ────────────────────────────────────────────────────
/**
 * SERVICE_ORDER_CREATED event
 *
 * Triggered when a new service order is confirmed (not just saved as pending).
 * Actions:
 *   1. Post service revenue entry (debit AR / credit Service Revenue).
 *   2. Write audit log entry.
 *
 * No inventory impact — services are intangible. If a service order also
 * includes physical parts, those should go through a separate sales order.
 */
export async function onServiceOrderCreated(
  tenantId: string,
  order: { id: string; order_number: string; customer_name: string; total_amount: number }
) {
  try {
    await createAccountingEntry(tenantId, {
      type: 'income',
      category: 'Service Revenue',
      amount: order.total_amount,
      description: `Service Order ${order.order_number} — ${order.customer_name}`,
      reference: order.order_number,
      journal: 'debit_AR_credit_ServiceRevenue',
      referenceType: 'service_order',
    });

    await writeAuditLog(tenantId, 'service_delivery', 'SERVICE_ORDER_CREATED', order.order_number, {
      order_id: order.id,
      customer: order.customer_name,
      total: order.total_amount,
    });

    toast.info(`Service Order ${order.order_number}: revenue posted`);
  } catch (err) {
    console.error('[onServiceOrderCreated] error:', err);
  }
}

// ─── Service Order Cancelled ──────────────────────────────────────────────────
/**
 * SERVICE_ORDER_CANCELLED event
 *
 * Reverses the revenue entry when a service order is cancelled.
 */
export async function onServiceOrderCancelled(
  tenantId: string,
  order: { id: string; order_number: string; total_amount: number }
) {
  try {
    await createAccountingEntry(tenantId, {
      type: 'expense',
      category: 'Service Revenue Reversal',
      amount: order.total_amount,
      description: `Reversal for cancelled service order ${order.order_number}`,
      reference: order.order_number,
      journal: 'debit_ServiceRevenue_credit_AR_reversal',
      referenceType: 'service_order',
    });

    await writeAuditLog(tenantId, 'service_delivery', 'SERVICE_ORDER_CANCELLED', order.order_number, {
      order_id: order.id,
      total: order.total_amount,
    });

    toast.info(`Service Order ${order.order_number} cancelled — revenue reversed`);
  } catch (err) {
    console.error('[onServiceOrderCancelled] error:', err);
  }
}
