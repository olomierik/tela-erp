/**
 * Offline-first Dexie database for TELA-ERP.
 *
 * Design:
 * - One DB per user session (cleared on logout).
 * - Each cached table carries: id, tenant_id, updated_at, _version (server), _dirty (local).
 * - The _outbox holds pending mutations to be flushed to the server.
 * - _sync_meta tracks the last successful pull token per table.
 * - _conflicts stores rows that couldn't be auto-merged (shown in ConflictInbox).
 */

import Dexie, { Table } from 'dexie';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OfflineTable =
  // Core transactional tables
  | 'sales_orders'
  | 'inventory_items'
  | 'invoices'
  | 'invoice_lines'
  | 'customers'
  | 'suppliers'
  | 'transactions'
  | 'pos_orders'
  | 'pos_order_lines'
  | 'inventory_transactions'
  | 'inventory_adjustments'
  | 'payments'
  // Extended tables — all app features
  | 'production_orders'
  | 'campaigns'
  | 'purchase_orders'
  | 'inventory_reservations'
  | 'audit_log'
  | 'categories'
  | 'stock_transfers'
  | 'bom_templates'
  | 'bom_lines'
  | 'chart_of_accounts'
  | 'journal_entries'
  | 'stores'
  | 'projects'
  | 'project_tasks'
  | 'notifications'
  | 'employees'
  | 'departments'
  | 'attendance_logs'
  | 'leave_requests'
  | 'payroll_runs'
  | 'payroll_lines'
  | 'crm_deals'
  | 'crm_activities'
  | 'scanned_documents'
  | 'fixed_assets'
  | 'expense_claims'
  | 'expense_items'
  | 'budgets'
  | 'budget_lines'
  | 'automation_rules'
  | 'tax_rates'
  | 'team_invites';

export const OFFLINE_TABLES: OfflineTable[] = [
  // Core
  'sales_orders', 'inventory_items', 'invoices', 'invoice_lines',
  'customers', 'suppliers', 'transactions', 'pos_orders',
  'pos_order_lines', 'inventory_transactions', 'inventory_adjustments', 'payments',
  // Extended
  'production_orders', 'campaigns', 'purchase_orders', 'inventory_reservations',
  'audit_log', 'categories', 'stock_transfers', 'bom_templates', 'bom_lines',
  'chart_of_accounts', 'journal_entries', 'stores', 'projects', 'project_tasks',
  'notifications', 'employees', 'departments', 'attendance_logs', 'leave_requests',
  'payroll_runs', 'payroll_lines', 'crm_deals', 'crm_activities', 'scanned_documents',
  'fixed_assets', 'expense_claims', 'expense_items', 'budgets', 'budget_lines',
  'automation_rules', 'tax_rates', 'team_invites',
];

export interface OutboxEntry {
  id: string;                   // idempotency key (uuid)
  tenant_id: string;
  user_id: string;
  table: OfflineTable;
  op: 'upsert' | 'delete';
  row_id: string;
  payload: any;                 // full row for upsert, null for delete
  base_version: number;         // last known server version (for OCC)
  client_ts: number;            // Lamport-ish client clock
  retries: number;
  last_error?: string;
}

export interface ConflictEntry {
  id: string;
  tenant_id: string;
  table: OfflineTable;
  row_id: string;
  local: any;
  remote: any;
  reason: string;
  created_at: number;
}

export interface SyncMetaEntry {
  key: string;                  // e.g. "pull_token:sales_orders:<tenant>"
  value: any;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

class TelaOfflineDB extends Dexie {
  // Core tables
  sales_orders!: Table<any, string>;
  inventory_items!: Table<any, string>;
  invoices!: Table<any, string>;
  invoice_lines!: Table<any, string>;
  customers!: Table<any, string>;
  suppliers!: Table<any, string>;
  transactions!: Table<any, string>;
  pos_orders!: Table<any, string>;
  pos_order_lines!: Table<any, string>;
  inventory_transactions!: Table<any, string>;
  inventory_adjustments!: Table<any, string>;
  payments!: Table<any, string>;

  // Extended tables
  production_orders!: Table<any, string>;
  campaigns!: Table<any, string>;
  purchase_orders!: Table<any, string>;
  inventory_reservations!: Table<any, string>;
  audit_log!: Table<any, string>;
  categories!: Table<any, string>;
  stock_transfers!: Table<any, string>;
  bom_templates!: Table<any, string>;
  bom_lines!: Table<any, string>;
  chart_of_accounts!: Table<any, string>;
  journal_entries!: Table<any, string>;
  stores!: Table<any, string>;
  projects!: Table<any, string>;
  project_tasks!: Table<any, string>;
  notifications!: Table<any, string>;
  employees!: Table<any, string>;
  departments!: Table<any, string>;
  attendance_logs!: Table<any, string>;
  leave_requests!: Table<any, string>;
  payroll_runs!: Table<any, string>;
  payroll_lines!: Table<any, string>;
  crm_deals!: Table<any, string>;
  crm_activities!: Table<any, string>;
  scanned_documents!: Table<any, string>;
  fixed_assets!: Table<any, string>;
  expense_claims!: Table<any, string>;
  expense_items!: Table<any, string>;
  budgets!: Table<any, string>;
  budget_lines!: Table<any, string>;
  automation_rules!: Table<any, string>;
  tax_rates!: Table<any, string>;
  team_invites!: Table<any, string>;

  _outbox!: Table<OutboxEntry, string>;
  _conflicts!: Table<ConflictEntry, string>;
  _sync_meta!: Table<SyncMetaEntry, string>;

  constructor() {
    super('tela-erp-offline');

    const row = 'id, tenant_id, updated_at, _version, _dirty';

    // Version 1: original 12 core tables (including now-renamed pos_order_items)
    this.version(1).stores({
      sales_orders:            row + ', store_id, status',
      inventory_items:         row + ', store_id, sku',
      invoices:                row + ', status',
      invoice_lines:           row + ', invoice_id',
      customers:               row + ', email',
      suppliers:               row + ', email',
      transactions:            row + ', type, date',
      pos_orders:              row + ', session_id, status',
      pos_order_items:         row + ', pos_order_id',    // legacy name
      inventory_transactions:  row + ', item_id',
      inventory_adjustments:   row + ', item_id',
      payments:                row + ', invoice_id',
      _outbox:     'id, client_ts, tenant_id, [tenant_id+table]',
      _conflicts:  'id, tenant_id, [tenant_id+table], created_at',
      _sync_meta:  'key',
    });

    // Version 2: rename pos_order_items → pos_order_lines + add all app tables
    this.version(2).stores({
      pos_order_items: null,                               // drop legacy table
      pos_order_lines:          row + ', pos_order_id',
      production_orders:        row + ', store_id, status',
      campaigns:                row + ', store_id, status',
      purchase_orders:          row + ', store_id, status',
      inventory_reservations:   row + ', item_id',
      audit_log:                row + ', table_name',
      categories:               row + ', parent_id',
      stock_transfers:          row + ', store_id, status',
      bom_templates:            row + ', status',
      bom_lines:                row + ', template_id',
      chart_of_accounts:        row + ', type',
      journal_entries:          row + ', status',
      stores:                   row + ', status',
      projects:                 row + ', status',
      project_tasks:            row + ', project_id, status',
      notifications:            row + ', user_id',
      employees:                row + ', store_id, department_id',
      departments:              row + ', store_id',
      attendance_logs:          row + ', employee_id',
      leave_requests:           row + ', employee_id, status',
      payroll_runs:             row + ', status',
      payroll_lines:            row + ', payroll_run_id',
      crm_deals:                row + ', status',
      crm_activities:           row + ', deal_id',
      scanned_documents:        row + ', type',
      fixed_assets:             row + ', status',
      expense_claims:           row + ', store_id, status',
      expense_items:            row + ', claim_id',
      budgets:                  row + ', status',
      budget_lines:             row + ', budget_id',
      automation_rules:         row + ', status',
      tax_rates:                row + ', type',
      team_invites:             row + ', email, status',
    });
  }
}

export const db = new TelaOfflineDB();

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function getMeta<T = any>(key: string, fallback: T): Promise<T> {
  const row = await db._sync_meta.get(key);
  return (row?.value as T) ?? fallback;
}

export async function setMeta(key: string, value: any): Promise<void> {
  await db._sync_meta.put({ key, value });
}

export async function clearTenantData(tenantId: string): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of OFFLINE_TABLES) {
      await (db as any)[t].where('tenant_id').equals(tenantId).delete();
    }
    await db._outbox.where('tenant_id').equals(tenantId).delete();
    await db._conflicts.where('tenant_id').equals(tenantId).delete();
    const allMeta = await db._sync_meta.toArray();
    for (const m of allMeta) {
      if (typeof m.key === 'string' && m.key.includes(tenantId)) {
        await db._sync_meta.delete(m.key);
      }
    }
  });
}

export function isOfflineTable(table: string): table is OfflineTable {
  return (OFFLINE_TABLES as readonly string[]).includes(table);
}

/** Stable Lamport-ish timestamp that's monotonic per tab. */
let lastTs = 0;
export function nextClientTs(): number {
  const now = Date.now();
  lastTs = now > lastTs ? now : lastTs + 1;
  return lastTs;
}
