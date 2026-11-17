import { calculateDistanceKm } from './geoUtils.ts';
import { MountainSector, EmergencyAlert, NodeTelemetry } from '../types/index.ts';

export interface SectorProximity {
  sector: MountainSector;
  distanceKm: number;
  isWithin10Km: boolean;
}

export interface NodeProximity {
  node: NodeTelemetry;
  distanceKm: number;
  isWithin10Km: boolean;
}

export type ProximityThreatLevel = 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNMONITORED';

export interface LocationThreatSummary {
  threatLevel: ProximityThreatLevel;
  threatColor: string;
  badgeText: string;
  badgeClass: string;
  nodesInRadius: NodeProximity[];
  nearestNode: NodeProximity | null;
  hasCoverage: boolean;
}

/**
 * Computes proximity for all live physical/deployed sensor nodes
 */
export const getNodeProximity = (
  userLat: number,
  userLon: number,
  nodes: NodeTelemetry[],
  radiusKm: number = 10
): LocationThreatSummary => {
  if (!nodes || nodes.length === 0) {
    return {
      threatLevel: 'UNMONITORED',
      threatColor: '#64748B',
      badgeText: 'NO NODES IN RADIUS',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      nodesInRadius: [],
      nearestNode: null,
      hasCoverage: false
    };
  }

  const nodesWithDistance: NodeProximity[] = nodes.map((n) => {
    const distanceKm = calculateDistanceKm(userLat, userLon, n.latitude, n.longitude);
    return {
      node: n,
      distanceKm,
      isWithin10Km: distanceKm <= radiusKm
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestNode = nodesWithDistance[0] || null;
  const nodesInRadius = nodesWithDistance.filter((n) => n.isWithin10Km);

  if (nodesInRadius.length === 0) {
    return {
      threatLevel: 'UNMONITORED',
      threatColor: '#64748B',
      badgeText: 'NO SENSOR IN 10 KM',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      nodesInRadius: [],
      nearestNode,
      hasCoverage: false
    };
  }

  // Check highest threat among nodes in 10 km
  let hasCritical = false;
  let hasWarning = false;

  for (const item of nodesInRadius) {
    const tilt = item.node.tiltMagnitude || 0;
    const isCrisis = (item.node as any).isCrisisEvent || false;
    const risk = (item.node as any).riskLevel;

    if (risk === 'CRITICAL' || tilt >= 4.0 || isCrisis) {
      hasCritical = true;
      break;
    }
    if (risk === 'WARNING' || tilt >= 2.0) {
      hasWarning = true;
    }
  }

  if (hasCritical) {
    return {
      threatLevel: 'CRITICAL',
      threatColor: '#94A3B8',
      badgeText: 'Critical Hazard Detected',
      badgeClass: 'bg-[#21262D] text-slate-200 border-[#30363D]',
      nodesInRadius,
      nearestNode,
      hasCoverage: true
    };
  }

  if (hasWarning) {
    return {
      threatLevel: 'WARNING',
      threatColor: '#94A3B8',
      badgeText: 'Active Hazard Advisory',
      badgeClass: 'bg-[#21262D] text-slate-300 border-[#30363D]',
      nodesInRadius,
      nearestNode,
      hasCoverage: true
    };
  }

  return {
    threatLevel: 'SAFE',
    threatColor: '#94A3B8',
    badgeText: 'Slope Stable',
    badgeClass: 'bg-[#21262D] text-slate-300 border-[#30363D]',
    nodesInRadius,
    nearestNode,
    hasCoverage: true
  };
};

/**
 * Filters mountain sectors that fall within the user's proximity radius (10 km by default)
 */
export const getNearbySectors = (
  userLat: number,
  userLon: number,
  sectors: MountainSector[],
  radiusKm: number = 10
): SectorProximity[] => {
  return sectors.map((sector) => {
    const distanceKm = calculateDistanceKm(userLat, userLon, sector.latitude, sector.longitude);
    return {
      sector,
      distanceKm,
      isWithin10Km: distanceKm <= radiusKm
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);
};

/**
 * Filters active emergency alerts matching only sectors within 10km of user location
 */
export const filterAlertsByLocation = (
  userLat: number,
  userLon: number,
  sectors: MountainSector[],
  alerts: EmergencyAlert[],
  radiusKm: number = 10
): { relevantAlerts: EmergencyAlert[]; nearestSectorDistanceKm: number } => {
  const nearby = getNearbySectors(userLat, userLon, sectors, radiusKm);
  const nearbySectorIds = new Set(
    nearby.filter((n) => n.isWithin10Km).map((n) => n.sector.id)
  );

  const relevantAlerts = alerts.filter((alert) => nearbySectorIds.has(alert.sectorId));
  const nearestSectorDistanceKm = nearby.length > 0 ? nearby[0].distanceKm : 0;

  return { relevantAlerts, nearestSectorDistanceKm };
};
