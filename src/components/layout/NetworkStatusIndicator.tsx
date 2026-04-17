import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/contexts/NetworkStatusContext';
import { cn } from '@/lib/utils';

function timeAgo(d: Date | null): string {
  if (!d) return 'never';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function NetworkStatusIndicator() {
  const { isOnline, syncState, pendingCount, conflictCount, lastSyncAt, lastError, forceSync } = useNetworkStatus();

  const status =
    !isOnline ? 'offline'
    : conflictCount > 0 ? 'conflict'
    : syncState === 'syncing' ? 'syncing'
    : syncState === 'error' ? 'error'
    : pendingCount > 0 ? 'pending'
    : 'ok';

  const colors = {
    offline:  'text-amber-500 bg-amber-500/10',
    conflict: 'text-red-500 bg-red-500/10',
    syncing:  'text-blue-500 bg-blue-500/10',
    error:    'text-red-500 bg-red-500/10',
    pending:  'text-amber-500 bg-amber-500/10',
    ok:       'text-emerald-500 bg-emerald-500/10',
  }[status];

  const Icon =
    status === 'offline' ? CloudOff
    : status === 'syncing' ? RefreshCw
    : status === 'error' || status === 'conflict' ? AlertTriangle
    : status === 'pending' ? Cloud
    : Check;

  const label = {
    offline: 'Offline',
    conflict: `${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`,
    syncing: 'Syncing…',
    error: 'Sync failed',
    pending: `${pendingCount} pending`,
    ok: 'Synced',
  }[status];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn('relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-90', colors)}
          aria-label="Sync status"
        >
          <Icon className={cn('w-3.5 h-3.5', status === 'syncing' && 'animate-spin')} />
          <span className="hidden sm:inline">{label}</span>
          {pendingCount > 0 && status !== 'syncing' && status !== 'offline' && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground font-bold">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Sync status</span>
            <Badge variant="outline" className={cn('text-[10px]', colors)}>{label}</Badge>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Network</span>
              <span className={isOnline ? 'text-emerald-500' : 'text-amber-500'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pending changes</span>
              <span>{pendingCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Conflicts</span>
              <span className={conflictCount > 0 ? 'text-red-500 font-medium' : ''}>{conflictCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Last sync</span>
              <span>{timeAgo(lastSyncAt)}</span>
            </div>
            {lastError && (
              <div className="pt-2 text-red-500 border-t border-border mt-2">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="break-words">{lastError}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={forceSync} disabled={!isOnline}>
              <RefreshCw className={cn('w-3 h-3 mr-1', syncState === 'syncing' && 'animate-spin')} />
              Sync now
            </Button>
            {conflictCount > 0 && (
              <Button size="sm" className="flex-1 text-xs h-8" asChild>
                <Link to="/conflicts">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Resolve
                </Link>
              </Button>
            )}
          </div>

          {!isOnline && (
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              You can keep working. Your changes will sync automatically when you reconnect.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
