/**
 * Single-flight sync scheduler.
 *
 * Responsibilities:
 * - Push: drain the outbox to the server in batches, retry on failure with exp backoff.
 * - Pull: fetch delta from server, merge into local Dexie tables, resolve conflicts.
 * - Coordinate across tabs via BroadcastChannel so only one tab syncs at a time.
 */

import { supabase } from '@/integrations/supabase/client';
import { db, OFFLINE_TABLES, OutboxEntry, OfflineTable, getMeta, setMeta, ConflictEntry } from './db';
import { IS_DESKTOP } from '@/lib/desktop';

const PUSH_BATCH_SIZE = 50;
const MIN_BACKOFF = 1000;
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
    if (!tenantId) return db._conflicts.count();
    return db._conflicts.where('tenant_id').equals(tenantId).count();
  }

  // ─── Push loop ────────────────────────────────────────────────────────────
  async kick(): Promise<void> {
    // Desktop app uses SQLite directly — no outbox sync needed.
    if (IS_DESKTOP || this.running || !navigator.onLine) return;
    this.running = true;
    this.emit({ type: 'started' });

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

      const { accepted, rejected } = await this.pushBatch(batch);

      if (accepted.length > 0) {
        await db._outbox.bulkDelete(accepted);
      }

      for (const r of rejected) {
        await this.handleReject(r);
      }

      this.emit({ type: 'pushed', accepted: accepted.length, rejected: rejected.length });
      this.backoff = MIN_BACKOFF;

      const stillQueued = await db._outbox.count();
      if (stillQueued > 0) setTimeout(() => this.kick(), 200);
    } catch (err) {
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
      this.emit({ type: 'error', error: (err as Error).message });
      setTimeout(() => this.kick(), this.backoff);
    } finally {
      this.running = false;
    }
  }

  private async pushBatch(batch: OutboxEntry[]): Promise<{ accepted: string[]; rejected: RejectionInfo[] }> {
    const { data, error } = await supabase.functions.invoke('sync-push', {
      body: {
        tenant_id: batch[0].tenant_id,
        operations: batch.map(b => ({
          idempotency_key: b.id,
          table: b.table,
          op: b.op,
          row_id: b.row_id,
          payload: b.payload,
          base_version: b.base_version,
          client_ts: b.client_ts,
        })),
      },
    });
    if (error) throw new Error(error.message);
    return {
      accepted: (data?.accepted ?? []) as string[],
      rejected: (data?.rejected ?? []) as RejectionInfo[],
    };
  }

  private async handleReject(r: RejectionInfo) {
    const entry = await db._outbox.get(r.idempotency_key);
    if (!entry) return;

    if (r.reason === 'version_conflict' && r.server_row) {
      // Record a conflict for user to resolve.
      const conflict: ConflictEntry = {
        id: `conf_${entry.id}`,
        tenant_id: entry.tenant_id,
        table: entry.table,
        row_id: entry.row_id,
        local: entry.payload,
        remote: r.server_row,
        reason: r.reason,
        created_at: Date.now(),
      };
      await db._conflicts.put(conflict);
      await db._outbox.delete(entry.id);
      this.emit({ type: 'conflict', count: await db._conflicts.count() });
      return;
    }

    if (r.reason === 'permanent') {
      await db._outbox.delete(entry.id);
      this.emit({ type: 'error', error: `Dropped ${entry.table}:${entry.row_id} (${r.message ?? 'permanent failure'})` });
      return;
    }

    // Transient — bump retries, keep in queue
    const retries = (entry.retries ?? 0) + 1;
    if (retries > 10) {
      await db._outbox.delete(entry.id);
      this.emit({ type: 'error', error: `Giving up on ${entry.table}:${entry.row_id} after 10 retries` });
    } else {
      await db._outbox.update(entry.id, { retries, last_error: r.message });
    }
  }

  // ─── Pull loop ────────────────────────────────────────────────────────────
  async pull(tenantId: string, tables: OfflineTable[] = OFFLINE_TABLES): Promise<void> {
    if (IS_DESKTOP || !navigator.onLine || !this.leader) return;

    for (const table of tables) {
      const key = `pull_token:${table}:${tenantId}`;
      const since = await getMeta<string | null>(key, null);

      try {
        const { data, error } = await supabase.functions.invoke('sync-pull', {
          body: { tenant_id: tenantId, table, since },
        });
        if (error) throw new Error(error.message);

        const changes = (data?.changes ?? []) as any[];
        const deletes = (data?.deletes ?? []) as string[];
        const nextToken = data?.next_token as string | undefined;

        await db.transaction('rw', (db as any)[table], async () => {
          for (const row of changes) {
            const local = await (db as any)[table].get(row.id);
            if (local?._dirty) continue; // never clobber local pending changes
            await (db as any)[table].put({ ...row, _dirty: 0 });
          }
          for (const id of deletes) {
            await (db as any)[table].delete(id);
          }
        });

        if (nextToken) await setMeta(key, nextToken);
        this.emit({ type: 'pulled', table, count: changes.length + deletes.length });
      } catch (err) {
        this.emit({ type: 'error', error: `pull ${table}: ${(err as Error).message}` });
      }
    }
  }

  startBackgroundPull(tenantId: string, intervalMs = 60_000) {
    this.stopBackgroundPull();
    const tick = () => {
      this.pull(tenantId).finally(() => {
        this.pullTimer = setTimeout(tick, intervalMs);
      });
    };
    this.pullTimer = setTimeout(tick, 2_000);
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
