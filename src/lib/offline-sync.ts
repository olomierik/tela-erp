/**
 * Offline-First Data Synchronization Module
 * 
 * This module provides seamless synchronization between local SQLite database
 * and Supabase cloud database, enabling offline-first functionality.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SyncQueue {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: Date;
  synced: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
}

class OfflineSyncManager {
  private syncQueue: SyncQueue[] = [];
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    syncInProgress: false,
  };

  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initializeOfflineDetection();
    this.loadSyncQueue();
  }

  /**
   * Initialize online/offline detection
   */
  private initializeOfflineDetection() {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.notifyListeners();
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.notifyListeners();
    });
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue() {
    const stored = localStorage.getItem('tela_sync_queue');
    if (stored) {
      try {
        this.syncQueue = JSON.parse(stored);
        this.syncStatus.pendingChanges = this.syncQueue.filter(q => !q.synced).length;
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    }
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue() {
    localStorage.setItem('tela_sync_queue', JSON.stringify(this.syncQueue));
    this.syncStatus.pendingChanges = this.syncQueue.filter(q => !q.synced).length;
    this.notifyListeners();
  }

  /**
   * Queue a change for synchronization
   */
  async queueChange(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ) {
    const change: SyncQueue = {
      id: `sync_${Date.now()}_${Math.random()}`,
      table,
      operation,
      data,
      timestamp: new Date(),
      synced: false,
    };

    this.syncQueue.push(change);
    this.saveSyncQueue();

    // If online, try to sync immediately
    if (this.syncStatus.isOnline) {
      await this.syncPendingChanges();
    }
  }

  /**
   * Sync all pending changes to Supabase
   */
  async syncPendingChanges() {
    if (this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.notifyListeners();

    const unsyncedChanges = this.syncQueue.filter(q => !q.synced);

    for (const change of unsyncedChanges) {
      try {
        await this.syncChange(change);
        change.synced = true;
      } catch (error) {
        console.error(`Failed to sync change ${change.id}:`, error);
        // Keep the change in queue for retry
      }
    }

    this.saveSyncQueue();
    this.syncStatus.lastSync = new Date();
    this.syncStatus.syncInProgress = false;
    this.notifyListeners();
  }

  /**
   * Sync a single change to Supabase
   */
  private async syncChange(change: SyncQueue) {
    const { table, operation, data } = change;

    switch (operation) {
      case 'insert':
        await (supabase as any).from(table).insert(data);
        break;
      case 'update':
        const { id, ...updateData } = data;
        await supabase.from(table).update(updateData).eq('id', id);
        break;
      case 'delete':
        await supabase.from(table).delete().eq('id', data.id);
        break;
    }
  }

  /**
   * Pull changes from Supabase (for multi-device sync)
   */
  async pullChanges(table: string, lastSync: Date | null) {
    if (!this.syncStatus.isOnline) {
      return [];
    }

    try {
      let query = supabase.from(table).select('*');

      if (lastSync) {
        query = query.gte('updated_at', lastSync.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to pull changes from ${table}:`, error);
      return [];
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getSyncStatus()));
  }

  /**
   * Clear sync queue (use with caution)
   */
  clearSyncQueue() {
    this.syncQueue = [];
    this.saveSyncQueue();
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.syncQueue.filter(q => !q.synced).length;
  }

  /**
   * Force sync with Supabase
   */
  async forceSync() {
    return this.syncPendingChanges();
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncManager();
