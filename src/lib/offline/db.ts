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
  | 'sales_orders'
  | 'inventory_items'
  | 'invoices'
  | 'invoice_lines'
  | 'customers'
  | 'suppliers'
  | 'transactions'
  | 'pos_orders'
  | 'pos_order_items'
  | 'inventory_transactions'
  | 'inventory_adjustments'
  | 'payments';

export const OFFLINE_TABLES: OfflineTable[] = [
  'sales_orders', 'inventory_items', 'invoices', 'invoice_lines',
  'customers', 'suppliers', 'transactions', 'pos_orders',
  'pos_order_items', 'inventory_transactions', 'inventory_adjustments', 'payments',
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
  sales_orders!: Table<any, string>;
  inventory_items!: Table<any, string>;
  invoices!: Table<any, string>;
  invoice_lines!: Table<any, string>;
  customers!: Table<any, string>;
  suppliers!: Table<any, string>;
  transactions!: Table<any, string>;
  pos_orders!: Table<any, string>;
  pos_order_items!: Table<any, string>;
  inventory_transactions!: Table<any, string>;
  inventory_adjustments!: Table<any, string>;
  payments!: Table<any, string>;

  _outbox!: Table<OutboxEntry, string>;
  _conflicts!: Table<ConflictEntry, string>;
  _sync_meta!: Table<SyncMetaEntry, string>;

  constructor() {
    super('tela-erp-offline');

    const rowSchema = 'id, tenant_id, updated_at, _version, _dirty';

    this.version(1).stores({
      sales_orders: rowSchema + ', store_id, status',
      inventory_items: rowSchema + ', store_id, sku',
      invoices: rowSchema + ', status',
      invoice_lines: rowSchema + ', invoice_id',
      customers: rowSchema + ', email',
      suppliers: rowSchema + ', email',
      transactions: rowSchema + ', type, date',
      pos_orders: rowSchema + ', session_id, status',
      pos_order_items: rowSchema + ', pos_order_id',
      inventory_transactions: rowSchema + ', item_id',
      inventory_adjustments: rowSchema + ', item_id',
      payments: rowSchema + ', invoice_id',

      _outbox: 'id, client_ts, tenant_id, [tenant_id+table]',
      _conflicts: 'id, tenant_id, [tenant_id+table], created_at',
      _sync_meta: 'key',
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
  // Wipe everything for a tenant (on logout / tenant switch).
  await db.transaction('rw', db.tables, async () => {
    for (const t of OFFLINE_TABLES) {
      await (db as any)[t].where('tenant_id').equals(tenantId).delete();
    }
    await db._outbox.where('tenant_id').equals(tenantId).delete();
    await db._conflicts.where('tenant_id').equals(tenantId).delete();
    // sync_meta is keyed by string; wipe entries that contain the tenant id
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
