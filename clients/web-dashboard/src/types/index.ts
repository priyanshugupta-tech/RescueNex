export type UserRole = 'ADMIN' | 'OPERATOR' | 'SCOUT' | 'PUBLIC';

export interface User {
  id: string;
  userName: string;
  email: string;
  role: UserRole;
  agency?: string;
  isVerified: boolean;
  isApproved: boolean;
  authProvider: 'LOCAL' | 'GOOGLE';
}

export interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitudeM: number;
  gpsFix: boolean;
  soilMoisturePct: number;
  temperatureC: number;
  humidityPct: number;
  tiltX: number;
  tiltY: number;
  tiltMagnitude: number;
  tiltDelta: number;
  accelRms: number;
  vibrationDetected: boolean;
  batteryPct: number;
  isPhysicalNode: boolean;
}

export interface MountainSector {
  id: string;
  name: string;
  highway: string;
  kmMarker: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  slopeDegrees: number;
  aspect: string;
  soilType: string;
  currentRiskLevel: 'SAFE' | 'LOW' | 'WARNING' | 'CRITICAL';
  lsiScore: number;
  sirenActive: boolean;
}

export interface SectorWeatherData {
  sectorId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  rain1hIntensityMm: number;
  rain24hCumulativeMm: number;
  antecedentRain7dMm: number;
  cloudburstRisk: boolean;
  temperatureC: number;
  relativeHumidityPct: number;
  weatherCode: number;
  activeScenario?: 'LIVE' | 'CLEAR' | 'MONSOON' | 'CLOUDBURST';
}

export interface LSIResult {
  lsiScore: number;
  riskLevel: 'SAFE' | 'LOW' | 'WARNING' | 'CRITICAL';
  confidencePct: number;
  modelTimestamp: number;
  inferenceLatencyMs?: number;
}

export interface EmergencyAlert {
  id: string;
  sectorId: string;
  sectorName: string;
  highway: string;
  kmMarker: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: number;
  lsiScore: number;
  triggerCause: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  multilingual: {
    en: string;
    hi: string;
    dogri: string;
    kashmiri: string;
  };
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface SystemHealth {
  status: string;
  service: string;
  timestamp: string;
  database: string;
  aiEngineStatus: 'HEALTHY' | 'OFFLINE';
}
