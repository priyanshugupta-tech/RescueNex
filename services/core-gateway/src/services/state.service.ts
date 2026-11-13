import { STRATEGIC_SECTORS } from '../config/index.js';
import {
  EmergencyAlert,
  MountainSector,
  NodeTelemetry,
  SectorWeatherData,
  User
} from '../types/index.js';

class StateService {
  private sectors: Map<string, MountainSector> = new Map();
  private latestTelemetry: Map<string, NodeTelemetry> = new Map();
  private sectorWeather: Map<string, SectorWeatherData> = new Map();
  private activeAlerts: Map<string, EmergencyAlert> = new Map();
  private alertHistory: EmergencyAlert[] = [];
  public users: Map<string, User & { passwordHash: string }> = new Map();

  constructor() {
    STRATEGIC_SECTORS.forEach((sec) => {
      this.sectors.set(sec.id, { ...sec });
      this.sectorWeather.set(sec.id, {
        sectorId: sec.id,
        timestamp: Date.now(),
        rain1hIntensityMm: 0,
        rain24hCumulativeMm: 12.5,
        antecedentRain7dMm: 45.0,
        cloudburstRisk: false,
        temperatureC: 15.0,
        relativeHumidityPct: 65.0,
        weatherCode: 0
      });
    });
  }

  // Sectors
  public getAllSectors(): MountainSector[] {
    return Array.from(this.sectors.values());
  }

  public getSector(id: string): MountainSector | undefined {
    return this.sectors.get(id);
  }

  public updateSectorRisk(id: string, riskLevel: MountainSector['currentRiskLevel'], lsiScore: number): void {
    const sec = this.sectors.get(id);
    if (sec) {
      sec.currentRiskLevel = riskLevel;
      sec.currentLsiScore = lsiScore;
    }
  }

  public setSirenState(sectorId: string, active: boolean): boolean {
    const sec = this.sectors.get(sectorId);
    if (sec) {
      sec.sirenActive = active;
      return true;
    }
    return false;
  }

  // Telemetry
  public setTelemetry(telemetry: NodeTelemetry): void {
    this.latestTelemetry.set(telemetry.nodeId, telemetry);
  }

  public getTelemetry(nodeId: string): NodeTelemetry | undefined {
    return this.latestTelemetry.get(nodeId);
  }

  public getAllTelemetry(): NodeTelemetry[] {
    return Array.from(this.latestTelemetry.values());
  }

  // Weather
  public setWeather(sectorId: string, weather: SectorWeatherData): void {
    this.sectorWeather.set(sectorId, weather);
  }

  public getWeather(sectorId: string): SectorWeatherData | undefined {
    return this.sectorWeather.get(sectorId);
  }

  public getAllWeather(): SectorWeatherData[] {
    return Array.from(this.sectorWeather.values());
  }

  // Alerts
  public addAlert(alert: EmergencyAlert): void {
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 100) {
      this.alertHistory.pop();
    }
  }

  public getActiveAlerts(): EmergencyAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(): EmergencyAlert[] {
    return this.alertHistory;
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }
}

export const stateService = new StateService();
