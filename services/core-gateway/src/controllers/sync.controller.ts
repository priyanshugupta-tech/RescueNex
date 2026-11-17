import { Request, Response } from 'express';
import { FieldReportModel } from '../models/fieldReport.model.js';
import { isDatabaseConnected } from '../config/database.js';
import { stateService } from '../services/state.service.js';
import { FieldReport, SyncQueueItem } from '../types/index.js';

let socketEmitter: ((event: string, payload: any) => void) | null = null;

export const setSyncSocketEmitter = (emitter: (event: string, payload: any) => void) => {
  socketEmitter = emitter;
};

// Calculate geodesic distance between two points (Haversine formula in km)
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * POST /api/sync/batch
 * Process queued actions and field observations stored offline during cellular dead-zones
 */
export const processBatchSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid or empty batch sync payload.' });
      return;
    }

    const syncedIds: string[] = [];
    const dbConnected = isDatabaseConnected();

    for (const item of items as SyncQueueItem[]) {
      try {
        if (item.actionType === 'FIELD_REPORT') {
          const user = (req as any).user;
          // Security RBAC: Only verified SCOUT, OPERATOR, or ADMIN can submit ground reports
          if (!user || !['SCOUT', 'OPERATOR', 'ADMIN'].includes(user.role)) {
            console.warn(`[Sync] Batch item ${item.id} rejected: Role '${user?.role || 'ANONYMOUS'}' is unauthorized to record field reports.`);
            continue;
          }

          const p = item.payload;
          const report: FieldReport = {
            id: p.id || item.id || `RPT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.id,
            userName: user.fullName || user.userName || 'Verified Field Scout',
            userRole: user.role,
            alertId: p.alertId || undefined,
            sectorId: p.sectorId || undefined,
            hazardType: p.hazardType || 'ROCKFALL',
            severity: p.severity || 'MEDIUM',
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            cityName: p.cityName || 'Highway Transit Point',
            description: p.description || 'Field observation reported.',
            reportedAt: Number(p.reportedAt) || item.queuedAt || Date.now(),
            syncedAt: Date.now(),
            status: 'SUBMITTED',
            source: 'OFFLINE_SYNC'
          };

          // Save to MongoDB if available
          if (dbConnected) {
            await FieldReportModel.findOneAndUpdate(
              { reportId: report.id },
              {
                reportId: report.id,
                userId: report.userId,
                userName: report.userName,
                userRole: report.userRole,
                alertId: report.alertId,
                sectorId: report.sectorId,
                hazardType: report.hazardType,
                severity: report.severity,
                latitude: report.latitude,
                longitude: report.longitude,
                cityName: report.cityName,
                description: report.description,
                reportedAt: new Date(report.reportedAt),
                syncedAt: new Date(report.syncedAt),
                status: report.status,
                source: report.source
              },
              { upsert: true, new: true }
            );
          }

          // Save to in-memory state
          stateService.addFieldReport(report);

          // Broadcast to connected web clients
          if (socketEmitter) {
            socketEmitter('FIELD_REPORT_STREAM', { report });
          }

          syncedIds.push(item.id);
        } else if (item.actionType === 'ALERT_ACK') {
          const { alertId, acknowledgedBy } = item.payload;
          stateService.acknowledgeAlert(alertId, acknowledgedBy || 'Offline Operator');
          syncedIds.push(item.id);
        } else if (item.actionType === 'ALERT_RESOLVE') {
          const { alertId } = item.payload;
          stateService.resolveAlert(alertId);
          syncedIds.push(item.id);
        }
      } catch (itemErr) {
        console.warn(`[Sync] Failed to process batch item ${item.id}:`, itemErr);
      }
    }

    res.status(200).json({
      success: true,
      syncedCount: syncedIds.length,
      syncedIds,
      serverTime: Date.now()
    });
  } catch (err: any) {
    console.error('[Sync] Batch sync error:', err);
    res.status(500).json({ success: false, message: 'Batch sync processing failed.', error: err.message });
  }
};

/**
 * POST /api/scout/report
 * Direct submission of field scout or commuter observation
 */
export const createFieldReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alertId, sectorId, hazardType, severity, latitude, longitude, cityName, description, reportedAt } = req.body;

    if (!hazardType || latitude === undefined || longitude === undefined || !description) {
      res.status(400).json({
        success: false,
        message: 'Missing required report fields: hazardType, latitude, longitude, description.'
      });
      return;
    }

    const user = (req as any).user;
    if (!user || !['SCOUT', 'OPERATOR', 'ADMIN'].includes(user.role)) {
      res.status(403).json({
        success: false,
        message: 'Security Guard: Only verified Emergency Field Scouts (SDRF/BRO), Operators, and Admins are authorized to log ground hazard reports.'
      });
      return;
    }

    const report: FieldReport = {
      id: `RPT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.fullName || user.userName || 'Field Scout',
      userRole: user.role,
      alertId: alertId || undefined,
      sectorId: sectorId || undefined,
      hazardType,
      severity: severity || 'MEDIUM',
      latitude: Number(latitude),
      longitude: Number(longitude),
      cityName: cityName || 'Transit Sector',
      description,
      reportedAt: Number(reportedAt) || Date.now(),
      syncedAt: Date.now(),
      status: 'SUBMITTED',
      source: 'ONLINE'
    };

    if (isDatabaseConnected()) {
      await FieldReportModel.create({
        reportId: report.id,
        userId: report.userId,
        userName: report.userName,
        userRole: report.userRole,
        alertId: report.alertId,
        sectorId: report.sectorId,
        hazardType: report.hazardType,
        severity: report.severity,
        latitude: report.latitude,
        longitude: report.longitude,
        cityName: report.cityName,
        description: report.description,
        reportedAt: new Date(report.reportedAt),
        syncedAt: new Date(report.syncedAt),
        status: report.status,
        source: report.source
      });
    }

    stateService.addFieldReport(report);

    if (socketEmitter) {
      socketEmitter('FIELD_REPORT_STREAM', { report });
    }

    res.status(201).json({
      success: true,
      message: 'Ground observation registered successfully.',
      report
    });
  } catch (err: any) {
    console.error('[Scout] Report creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to record report.', error: err.message });
  }
};

/**
 * GET /api/scout/reports
 * Retrieve field reports strictly localized within the 10 km corridor
 */
export const getFieldReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 10;

    let allReports: FieldReport[] = [];

    if (isDatabaseConnected()) {
      const docs = await FieldReportModel.find({ status: { $ne: 'DISMISSED' } })
        .sort({ reportedAt: -1 })
        .limit(100)
        .lean();

      allReports = docs.map((d: any) => ({
        id: d.reportId,
        userId: d.userId,
        userName: d.userName,
        userRole: d.userRole,
        alertId: d.alertId,
        sectorId: d.sectorId,
        hazardType: d.hazardType,
        severity: d.severity,
        latitude: d.latitude,
        longitude: d.longitude,
        cityName: d.cityName,
        description: d.description,
        reportedAt: new Date(d.reportedAt).getTime(),
        syncedAt: new Date(d.syncedAt).getTime(),
        status: d.status,
        source: d.source
      }));
    } else {
      allReports = stateService.getFieldReports();
    }

    // Filter strictly by 10 km proximity if coordinates are supplied
    let filteredReports = allReports;
    if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
      filteredReports = allReports
        .map((r) => {
          const dist = calculateHaversineKm(lat, lon, r.latitude, r.longitude);
          return { ...r, distanceKm: parseFloat(dist.toFixed(1)) };
        })
        .filter((r) => r.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.status(200).json({
      success: true,
      count: filteredReports.length,
      reports: filteredReports
    });
  } catch (err: any) {
    console.error('[Scout] Get reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve field reports.', error: err.message });
  }
};
