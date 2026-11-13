export type UserRole = 'ADMIN' | 'OPERATOR' | 'SCOUT' | 'PUBLIC';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: UserRole;
  agency?: 'SDMA' | 'SDRF' | 'BRO' | 'COMMUTER';
  isApproved: boolean;
}

export interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  soilMoisturePct: number;    // 0 - 100%
  temperatureC: number;
  humidityPct: number;
  tiltX: number;              // degrees
  tiltY: number;              // degrees
  tiltMagnitude: number;      // sqrt(tiltX^2 + tiltY^2)
  tiltDelta: number;          // deviation from baseline
  accelRms: number;           // acceleration magnitude
  vibrationDetected: boolean;
  batteryPct?: number;
  isPhysicalNode?: boolean;   // true for your live hardware node
}

export interface SectorWeatherData {
  sectorId: string;
  timestamp: number;
  rain1hIntensityMm: number;
  rain24hCumulativeMm: number;
  antecedentRain7dMm: number;
  cloudburstRisk: boolean;
  temperatureC: number;
  relativeHumidityPct: number;
  weatherCode: number;
}

export type RiskLevel = 'LOW' | 'ADVISORY' | 'WARNING' | 'CRITICAL';

export interface LSIResult {
  lsiScore: number;           // 0.0 to 1.0
  riskLevel: RiskLevel;
  confidence: number;
  anomalyDetected: boolean;
  isFalseAlarm: boolean;
  triggerSiren: boolean;
  recommendation: string;
  explanation: {
    soilFactor: number;
    tiltFactor: number;
    rainFactor: number;
  };
}

export interface FusedFeaturePayload {
  nodeId: string;
  sectorId: string;
  latitude: number;
  longitude: number;
  telemetry: NodeTelemetry;
  weather: SectorWeatherData;
}

export interface MountainSector {
  id: string;
  name: string;
  highway: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  sirenActive: boolean;
  currentRiskLevel: RiskLevel;
  currentLsiScore: number;
}

export interface EmergencyAlert {
  id: string;
  sectorId: string;
  sectorName: string;
  nodeId: string;
  timestamp: number;
  riskLevel: RiskLevel;
  lsiScore: number;
  headline: string;
  descriptions: {
    en: string;
    hi: string;
    dogri: string;
    kashmiri: string;
  };
  sirenTriggered: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}
