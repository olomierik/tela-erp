import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { scheduler, SyncEvent } from '@/lib/offline/scheduler';
import { useAuth } from '@/contexts/AuthContext';

type SyncState = 'idle' | 'syncing' | 'error';

interface NetworkStatusContextType {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  conflictCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
  forceSync: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const { tenant, user, isDemo } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingCount, setPending] = useState(0);
  const [conflictCount, setConflicts] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // online/offline detection
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // subscribe to scheduler events
  useEffect(() => {
    const unsubscribe = scheduler.subscribe((e: SyncEvent) => {
      if (e.type === 'started') setSyncState('syncing');
      if (e.type === 'pushed') {
        setSyncState('idle');
        setLastSyncAt(new Date());
        setLastError(null);
      }
      if (e.type === 'pulled') { setLastSyncAt(new Date()); setSyncState('idle'); }
      if (e.type === 'idle') setSyncState('idle');
      if (e.type === 'error') { setSyncState('error'); setLastError(e.error); }
      if (e.type === 'conflict') setConflicts(e.count);

      // refresh counts
      const tid = tenant?.id;
      if (tid) {
        scheduler.pendingCount(tid).then(setPending);
        scheduler.conflictCount(tid).then(setConflicts);
      }
    });
    return () => { unsubscribe(); };
  }, [tenant?.id]);

  // refresh counts initially and periodically
  useEffect(() => {
    const tid = tenant?.id;
    if (!tid) return;
    const refresh = () => {
      scheduler.pendingCount(tid).then(setPending);
      scheduler.conflictCount(tid).then(setConflicts);
    };
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [tenant?.id]);

  // kick off background pull + push loop when we have an authenticated tenant
  useEffect(() => {
    if (isDemo || !user || !tenant?.id) return;
    scheduler.startBackgroundPull(tenant.id);
    scheduler.kick();
    return () => scheduler.stopBackgroundPull();
  }, [isDemo, user?.id, tenant?.id]);

  // kick push whenever we come online
  useEffect(() => {
    if (isOnline) scheduler.kick();
  }, [isOnline]);

  const forceSync = () => {
    scheduler.kick();
    if (tenant?.id) scheduler.pull(tenant.id);
  };

  return (
    <NetworkStatusContext.Provider value={{
      isOnline, syncState, pendingCount, conflictCount, lastSyncAt, lastError, forceSync,
    }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext);
  if (!ctx) throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
  return ctx;
}
