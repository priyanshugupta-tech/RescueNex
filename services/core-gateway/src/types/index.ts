export type UserRole = 'ADMIN' | 'OPERATOR' | 'SCOUT' | 'PUBLIC';

export interface User {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: UserRole;
  agency?: 'RESCUENEX' | 'SDRF' | 'BRO' | 'COMMUTER';
  phoneNumber?: string;
  smsAlertsEnabled?: boolean;
  whatsappAlertsEnabled?: boolean;
  preferredLanguage?: 'en' | 'hi' | 'dogri' | 'kashmiri';
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    cityName?: string;
    updatedAt: number;
  };
  isVerified: boolean;
  isApproved: boolean;
  authProvider?: 'LOCAL' | 'GOOGLE';
}

export interface BroadcastRecipient {
  userId: string;
  phoneNumber?: string;
  email?: string;
  channel: 'SMS' | 'EMAIL';
  status: 'SENT' | 'FAILED';
  messageId?: string;
  errorMessage?: string;
  distanceKm: number;
}

export interface BroadcastLog {
  id: string;
  broadcastId: string;
  alertId: string;
  sectorId: string;
  sectorName: string;
  riskLevel: RiskLevel;
  channel: 'SMS' | 'EMAIL' | 'ALL';
  recipientCount: number;
  recipients: BroadcastRecipient[];
  message: {
    en: string;
    hi: string;
  };
  dispatchedAt: number;
  provider: 'FAST2SMS' | 'RESEND' | 'NONE_CONFIGURED';
}


export interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  gpsFix?: boolean;

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
  isPhysicalNode?: boolean;
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
}

export type RiskLevel = 'LOW' | 'ADVISORY' | 'WARNING' | 'CRITICAL';

export interface LSIResult {
  lsiScore: number;           // 0.0 to 100.0
  riskLevel: RiskLevel;
  confidence: number;
  anomalyDetected: boolean;
  isFalseAlarm: boolean;
  triggerSiren: boolean;
  recommendation: string;
  timeToFailureHours?: number | null;
  topContributingFactors?: Array<{ factor: string; contributionPercent: number; severity: string }>;
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
  lsiScore?: number;
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
  status?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedAt?: number;
}

export type HazardType = 'ROCKFALL' | 'CRACK' | 'WATER_LOGGING' | 'DEBRIS_FLOW' | 'ROAD_BLOCK';
export type ReportSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FieldReport {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  hazardType: HazardType;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  cityName?: string;
  description: string;
  reportedAt: number; // Client timestamp when offline
  syncedAt: number;   // Server timestamp when received
  status: 'SUBMITTED' | 'VERIFIED' | 'DISMISSED';
  source: 'ONLINE' | 'OFFLINE_SYNC';
}

export interface SyncQueueItem {
  id: string;
  actionType: 'FIELD_REPORT' | 'ALERT_ACK' | 'ALERT_RESOLVE' | 'LOCATION_UPDATE';
  payload: any;
  queuedAt: number;
}

