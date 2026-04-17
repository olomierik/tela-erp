import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Check, X, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { db, ConflictEntry } from '@/lib/offline/db';
import { scheduler } from '@/lib/offline/scheduler';
import { cn } from '@/lib/utils';

function fieldDiff(local: any, remote: any): { key: string; local: any; remote: any; changed: boolean }[] {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  const out: { key: string; local: any; remote: any; changed: boolean }[] = [];
  for (const k of keys) {
    if (k.startsWith('_') || k === 'created_at' || k === 'updated_at') continue;
    const lv = local?.[k];
    const rv = remote?.[k];
    out.push({ key: k, local: lv, remote: rv, changed: JSON.stringify(lv) !== JSON.stringify(rv) });
  }
  return out.sort((a, b) => Number(b.changed) - Number(a.changed));
}

export default function ConflictInbox() {
  const { tenant } = useAuth();
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function refresh() {
    if (!tenant?.id) return;
    const list = await db._conflicts.where('tenant_id').equals(tenant.id).reverse().sortBy('created_at');
    setConflicts(list);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [tenant?.id]);

  async function resolve(c: ConflictEntry, winner: 'local' | 'remote' | 'merge') {
    if (!tenant?.id) return;
    setResolving(c.id);
    try {
      if (winner === 'remote') {
        // Accept server — just drop local conflict & let the pull cycle update the row.
        await db._conflicts.delete(c.id);
        await (db as any)[c.table].put({ ...c.remote, _dirty: 0 });
        toast.success('Kept server version');
      } else {
        const payload =
          winner === 'local'
            ? { ...c.local, _version: c.remote._version ?? 0 }
            : { ...c.remote, ...c.local, _version: c.remote._version ?? 0 };

        await db.transaction('rw', (db as any)[c.table], db._outbox, db._conflicts, async () => {
          await (db as any)[c.table].put({ ...payload, _dirty: 1 });
          await db._outbox.put({
            id: crypto.randomUUID(),
            tenant_id: tenant.id,
            user_id: '',
            table: c.table,
            op: 'upsert',
            row_id: c.row_id,
            payload,
            base_version: c.remote._version ?? 0,
            client_ts: Date.now(),
            retries: 0,
          });
          await db._conflicts.delete(c.id);
        });

        toast.success(winner === 'local' ? 'Kept your version' : 'Merged both versions');
        scheduler.kick();
      }
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResolving(null);
    }
  }

  return (
    <AppLayout title="Conflict Inbox" subtitle="Resolve items that couldn't be auto-merged">
      <Helmet><title>Conflicts — TELA-ERP</title></Helmet>

      <div className="max-w-4xl mx-auto space-y-4">
        {loading && (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
            Loading conflicts...
          </div>
        )}

        {!loading && conflicts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No conflicts</h3>
              <p className="text-sm text-muted-foreground">All your changes are in sync with the server.</p>
            </CardContent>
          </Card>
        )}

        {!loading && conflicts.length > 0 && (
          <>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {conflicts.length} change{conflicts.length !== 1 ? 's' : ''} need your attention
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These were edited both on your device and somewhere else while you were offline. Pick which version to keep.
                  </p>
                </div>
              </CardContent>
            </Card>

            {conflicts.map(c => {
              const diffs = fieldDiff(c.local, c.remote);
              const changed = diffs.filter(d => d.changed);
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{c.table}</Badge>
                          <span className="text-muted-foreground font-mono text-xs">{c.row_id.slice(0, 8)}…</span>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {changed.length} field{changed.length !== 1 ? 's' : ''} differ — edited {new Date(c.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left p-2 font-semibold">Field</th>
                            <th className="text-left p-2 font-semibold">Your version</th>
                            <th className="text-left p-2 font-semibold">Server version</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changed.slice(0, 8).map(d => (
                            <tr key={d.key} className="border-t border-border">
                              <td className="p-2 font-medium">{d.key}</td>
                              <td className={cn('p-2 font-mono break-all', d.changed && 'bg-blue-500/5 text-blue-700 dark:text-blue-400')}>
                                {JSON.stringify(d.local) ?? '—'}
                              </td>
                              <td className={cn('p-2 font-mono break-all', d.changed && 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-400')}>
                                {JSON.stringify(d.remote) ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Button
                        size="sm" variant="outline"
                        disabled={resolving === c.id}
                        onClick={() => resolve(c, 'local')}
                      >
                        <Check className="w-3 h-3 mr-1" /> Keep mine
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={resolving === c.id}
                        onClick={() => resolve(c, 'remote')}
                      >
                        <X className="w-3 h-3 mr-1" /> Keep theirs
                      </Button>
                      <Button
                        size="sm"
                        disabled={resolving === c.id}
                        onClick={() => resolve(c, 'merge')}
                      >
                        <ArrowRight className="w-3 h-3 mr-1" /> Merge (mine wins)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </AppLayout>
  );
}
