import { api } from './api.ts';
import { SyncQueueItem } from '../types/index.ts';

const QUEUE_STORAGE_KEY = 'rescuenex_offline_queue';

export type SyncStatusListener = (isOnline: boolean, pendingCount: number) => void;
export type SyncCompletionListener = (syncedCount: number) => void;

class OfflineSyncService {
  private queue: SyncQueueItem[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private statusListeners: Set<SyncStatusListener> = new Set();
  private completionListeners: Set<SyncCompletionListener> = new Set();
  private heartbeatTimer: any = null;

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);

      // Heartbeat check every 15 seconds to verify real connectivity & sync
      this.heartbeatTimer = setInterval(() => {
        this.checkConnectivityAndSync();
      }, 15000);
    }
  }

  private loadQueue(): void {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('[OfflineSync] Failed to persist sync queue:', e);
    }
    this.notifyStatusListeners();
  }

  private handleOnlineEvent = () => {
    this.isOnline = true;
    this.notifyStatusListeners();
    this.flushQueue();
  };

  private handleOfflineEvent = () => {
    this.isOnline = false;
    this.notifyStatusListeners();
  };

  private notifyStatusListeners(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.isOnline, this.queue.length);
      } catch (err) {
        console.error('[OfflineSync] Status listener error:', err);
      }
    });
  }

  private notifyCompletionListeners(count: number): void {
    this.completionListeners.forEach((listener) => {
      try {
        listener(count);
      } catch (err) {
        console.error('[OfflineSync] Completion listener error:', err);
      }
    });
  }

  public subscribeStatus(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.isOnline, this.queue.length);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeCompletion(listener: SyncCompletionListener): () => void {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public enqueueAction(actionType: SyncQueueItem['actionType'], payload: any): SyncQueueItem {
    const item: SyncQueueItem = {
      id: `SYNC_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actionType,
      payload,
      queuedAt: Date.now()
    };
    this.queue.push(item);
    this.saveQueue();

    // If currently online, try to flush immediately
    if (this.isOnline) {
      this.flushQueue();
    }

    return item;
  }

  public async checkConnectivityAndSync(): Promise<void> {
    try {
      // Lightweight health check to verify actual gateway reachability
      const res = await api.get('/api/health');
      if (res.status === 200) {
        if (!this.isOnline) {
          this.isOnline = true;
          this.notifyStatusListeners();
        }
        if (this.queue.length > 0) {
          await this.flushQueue();
        }
      }
    } catch {
      if (this.isOnline) {
        this.isOnline = false;
        this.notifyStatusListeners();
      }
    }
  }

  public async flushQueue(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) return;

    this.isSyncing = true;
    try {
      const itemsToSync = [...this.queue];
      const res = await api.post('/api/sync/batch', { items: itemsToSync });

      if (res.data?.success && Array.isArray(res.data?.syncedIds)) {
        const syncedSet = new Set(res.data.syncedIds);
        this.queue = this.queue.filter((item) => !syncedSet.has(item.id));
        this.saveQueue();

        if (res.data.syncedCount > 0) {
          this.notifyCompletionListeners(res.data.syncedCount);
        }
      }
    } catch (err) {
      console.warn('[OfflineSync] Flush queue failed (network still unreachable):', err);
      this.isOnline = false;
      this.notifyStatusListeners();
    } finally {
      this.isSyncing = false;
    }
  }
}

export const offlineSync = new OfflineSyncService();
