/**
 * Single-flight sync scheduler.
 *
 * Works entirely with direct Supabase table queries — no Edge Functions needed.
 *
 * Push: drain the outbox to Supabase in batches (insert / update / delete).
 * Pull: fetch rows updated since the last pull token, merge into Dexie.
 * Coordinate across tabs via BroadcastChannel so only one tab syncs at a time.
 */

import { supabase } from '@/integrations/supabase/client';
import { db, OFFLINE_TABLES, OutboxEntry, OfflineTable, getMeta, setMeta } from './db';
import { IS_DESKTOP } from '@/lib/desktop';

const PUSH_BATCH_SIZE = 50;
const MIN_BACKOFF = 2_000;
const MAX_BACKOFF = 60_000;
const SYNC_CHANNEL = 'tela-sync-lock';

export type SyncEvent =
  | { type: 'started' }
  | { type: 'pushed'; accepted: number; rejected: number }
  | { type: 'pulled'; table: string; count: number }
  | { type: 'error'; error: string }
  | { type: 'idle' }
  | { type: 'conflict'; count: number };

type Listener = (e: SyncEvent) => void;

class Scheduler {
  private running = false;
  private backoff = MIN_BACKOFF;
  private pullTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<Listener> = new Set();
  private channel: BroadcastChannel | null = null;
  private leader = true;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online',  () => this.kick());
    window.addEventListener('offline', () => this.emit({ type: 'idle' }));

    try {
      this.channel = new BroadcastChannel(SYNC_CHANNEL);
      this.channel.onmessage = (msg) => {
        if (msg.data?.type === 'leader-ping') this.leader = false;
      };
      setInterval(() => {
        this.channel?.postMessage({ type: 'leader-ping', t: Date.now() });
        this.leader = true;
      }, 15_000);
    } catch { /* BroadcastChannel unavailable */ }
  }

  // ─── Pub/sub ──────────────────────────────────────────────────────────────
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(e: SyncEvent) { this.listeners.forEach(l => l(e)); }

  // ─── Status ───────────────────────────────────────────────────────────────
  async pendingCount(tenantId?: string): Promise<number> {
    if (!tenantId) return db._outbox.count();
    return db._outbox.where('tenant_id').equals(tenantId).count();
  }

  async conflictCount(tenantId?: string): Promise<number> {
    return db._conflicts.count();
  }

  // ─── Push loop ────────────────────────────────────────────────────────────
  async kick(): Promise<void> {
    if (IS_DESKTOP || this.running || !navigator.onLine) return;
    this.running = true;

    try {
      const batch = await db._outbox
        .orderBy('client_ts')
        .limit(PUSH_BATCH_SIZE)
        .toArray();

      if (batch.length === 0) {
        this.backoff = MIN_BACKOFF;
        this.emit({ type: 'idle' });
        return;
      }

      this.emit({ type: 'started' });

      let accepted = 0;
      let rejected = 0;
      const toDelete: string[] = [];

      for (const entry of batch) {
        try {
          await this.applyOutboxEntry(entry);
          toDelete.push(entry.id);
          accepted++;
        } catch (err) {
          const retries = (entry.retries ?? 0) + 1;
          if (retries > 10) {
            // Give up after 10 retries
            toDelete.push(entry.id);
            rejected++;
          } else {
            await db._outbox.update(entry.id, {
              retries,
              last_error: (err as Error).message,
            });
          }
        }
      }

      if (toDelete.length) await db._outbox.bulkDelete(toDelete);

      this.emit({ type: 'pushed', accepted, rejected });
      this.backoff = MIN_BACKOFF;

      const stillQueued = await db._outbox.count();
      if (stillQueued > 0) setTimeout(() => this.kick(), 200);
      else this.emit({ type: 'idle' });
    } catch (err) {
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
      this.emit({ type: 'error', error: (err as Error).message });
      setTimeout(() => this.kick(), this.backoff);
    } finally {
      this.running = false;
    }
  }

  /** Apply a single outbox entry directly to Supabase. */
  private async applyOutboxEntry(entry: OutboxEntry): Promise<void> {
    const table = entry.table as any;

    if (entry.op === 'delete') {
      const { error } = await supabase.from(table)
        .delete()
        .eq('id', entry.row_id)
        .eq('tenant_id', entry.tenant_id);
      if (error) throw new Error(error.message);
      return;
    }

    if (entry.op === 'upsert' || entry.op === 'insert') {
      const payload = entry.payload ?? {};
      const { error } = await supabase.from(table)
        .upsert({ ...payload, tenant_id: entry.tenant_id }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      return;
    }

    if (entry.op === 'update') {
      const { id, tenant_id: _tid, ...rest } = entry.payload ?? {};
      const { error } = await supabase.from(table)
        .update(rest)
        .eq('id', entry.row_id)
        .eq('tenant_id', entry.tenant_id);
      if (error) throw new Error(error.message);
      return;
    }
  }

  // ─── Pull loop ────────────────────────────────────────────────────────────
  /** Pull rows updated since the last token directly from Supabase. */
  async pull(tenantId: string, tables: OfflineTable[] = OFFLINE_TABLES): Promise<void> {
    if (IS_DESKTOP || !navigator.onLine || !this.leader) return;

    for (const table of tables) {
      const metaKey = `pull_since:${table}:${tenantId}`;
      const since = await getMeta<string | null>(metaKey, null);
      const pullStart = new Date().toISOString();

      try {
        let query = (supabase.from(table as any) as any)
          .select('*')
          .eq('tenant_id', tenantId);

        if (since) {
          query = query.gte('updated_at', since);
        }

        const { data, error } = await query.order('updated_at', { ascending: true }).limit(500);
        if (error) throw new Error(error.message);

        const rows: any[] = data ?? [];
        if (rows.length === 0) continue;

        await db.transaction('rw', (db as any)[table], async () => {
          for (const row of rows) {
            const local = await (db as any)[table].get(row.id);
            // Never overwrite a locally-dirty (pending) row
            if (local?._dirty) continue;
            await (db as any)[table].put({ ...row, _dirty: 0 });
          }
        });

        await setMeta(metaKey, pullStart);
        this.emit({ type: 'pulled', table, count: rows.length });
      } catch (err) {
        // Pull failures are non-critical — log but don't surface as UI error.
        console.warn(`[sync] pull ${table}:`, (err as Error).message);
      }
    }
  }

  startBackgroundPull(tenantId: string, intervalMs = 120_000) {
    this.stopBackgroundPull();
    const tick = () => {
      this.pull(tenantId).finally(() => {
        this.pullTimer = setTimeout(tick, intervalMs);
      });
    };
    // Delay first pull by 5s to avoid hammering on login
    this.pullTimer = setTimeout(tick, 5_000);
  }

  stopBackgroundPull() {
    if (this.pullTimer) { clearTimeout(this.pullTimer); this.pullTimer = null; }
  }
}

interface RejectionInfo {
  idempotency_key: string;
  reason: 'version_conflict' | 'validation' | 'permanent' | 'transient';
  message?: string;
  server_row?: any;
}

export const scheduler = new Scheduler();
