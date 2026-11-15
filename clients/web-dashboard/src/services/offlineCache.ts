import { MountainSector, NodeTelemetry, SectorWeatherData, EmergencyAlert, FieldReport } from '../types/index.ts';

const CACHE_PREFIX = 'rescuenex_cache_';

export interface OfflineCacheBundle {
  sectors: MountainSector[];
  nodes: NodeTelemetry[];
  latestTelemetry: NodeTelemetry | null;
  weather: SectorWeatherData | null;
  alerts: EmergencyAlert[];
  fieldReports: FieldReport[];
  lastCachedAt: number;
}

class OfflineCacheService {
  public save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
      localStorage.setItem(`${CACHE_PREFIX}last_sync_timestamp`, Date.now().toString());
    } catch (e) {
      console.warn(`[OfflineCache] Failed to save key "${key}":`, e);
    }
  }

  public get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch (e) {
      console.warn(`[OfflineCache] Failed to parse key "${key}":`, e);
    }
    return fallback;
  }

  public getLastSyncTime(): number {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}last_sync_timestamp`);
      if (raw) return parseInt(raw, 10);
    } catch {}
    return 0;
  }

  public getAllCachedBundle(): OfflineCacheBundle {
    return {
      sectors: this.get<MountainSector[]>('sectors', []),
      nodes: this.get<NodeTelemetry[]>('nodes', []),
      latestTelemetry: this.get<NodeTelemetry | null>('latest_telemetry', null),
      weather: this.get<SectorWeatherData | null>('weather', null),
      alerts: this.get<EmergencyAlert[]>('alerts', []),
      fieldReports: this.get<FieldReport[]>('field_reports', []),
      lastCachedAt: this.getLastSyncTime()
    };
  }

  public formatLastSyncTime(): string {
    const ts = this.getLastSyncTime();
    if (!ts) return 'Never';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

export const offlineCache = new OfflineCacheService();
