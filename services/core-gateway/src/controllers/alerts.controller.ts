import { Request, Response } from 'express';
import { stateService } from '../services/state.service.js';
import { alertService } from '../services/alert.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AlertModel } from '../models/alert.model.js';
import { isDatabaseConnected } from '../config/database.js';

let alertSocketEmitter: any = null;
export const setAlertSocketEmitter = (emitter: any) => {
  alertSocketEmitter = emitter;
};

const formatAlert = (a: any) => {
  const doc = a.toObject ? a.toObject() : a;
  const alertId = doc.alertId || doc.id || (doc._id ? String(doc._id) : `ALERT_${Date.now()}`);
  const descriptions = doc.descriptions || doc.multilingual || {
    en: doc.headline || 'Active landslide warning.',
    hi: 'सक्रिय भूस्खलन चेतावनी।',
    dogri: 'ज़मीन खिसकने दी चेतावनी।',
    kashmiri: 'لٔند سلایٔڈ وارننگ'
  };
  return {
    ...doc,
    id: alertId,
    alertId,
    level: doc.riskLevel || doc.level || 'WARNING',
    riskLevel: doc.riskLevel || doc.level || 'WARNING',
    descriptions,
    multilingual: descriptions,
    kmMarker: doc.kmMarker || 'KM 142.5',
    triggerCause: doc.triggerCause || doc.headline || 'Sensor Threshold Exceeded',
    status: doc.status || 'ACTIVE'
  };
};

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeFromDb = await AlertModel.find({ status: 'ACTIVE' }).sort({ timestamp: -1 }).limit(20);
    const historyFromDb = await AlertModel.find().sort({ timestamp: -1 }).limit(100);

    const activeList = activeFromDb.length > 0 ? activeFromDb : stateService.getActiveAlerts();
    const historyList = historyFromDb.length > 0 ? historyFromDb : stateService.getAlertHistory();

    res.json({
      success: true,
      activeAlerts: activeList.map(formatAlert),
      history: historyList.map(formatAlert)
    });
  } catch (e: any) {
    console.error('⚠️ [MongoDB] Error fetching alerts:', e.message);
    res.json({
      success: true,
      activeAlerts: stateService.getActiveAlerts().map(formatAlert),
      history: stateService.getAlertHistory().map(formatAlert)
    });
  }
};

export const acknowledgeAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const operatorName = req.user?.fullName || req.user?.name || req.user?.email || 'Unknown Operator';

  const updated = stateService.acknowledgeAlert(id, operatorName);

  if (isDatabaseConnected()) {
    try {
      await AlertModel.findOneAndUpdate(
        { alertId: id },
        {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: operatorName,
          acknowledgedAt: new Date()
        }
      );
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error updating alert acknowledgment in Atlas:', e.message);
    }
  }

  if (!updated) {
    res.status(404).json({ success: false, message: 'Alert not found.' });
    return;
  }

  if (alertSocketEmitter) {
    alertSocketEmitter('ALERT_ACKNOWLEDGED', { alertId: id, acknowledgedBy: operatorName });
  }

  res.json({
    success: true,
    message: `Alert '${id}' acknowledged by ${operatorName}.`
  });
};

export const toggleSiren = (req: AuthenticatedRequest, res: Response): void => {
  const { sectorId, active } = req.body;
  if (!sectorId || typeof active !== 'boolean') {
    res.status(400).json({ success: false, message: 'sectorId and boolean "active" required.' });
    return;
  }

  const success = stateService.setSirenState(sectorId, active);
  if (!success) {
    res.status(404).json({ success: false, message: 'Sector not found.' });
    return;
  }

  if (alertSocketEmitter) {
    alertSocketEmitter('SIREN_STATE_CHANGED', { sectorId, active, operator: req.user?.fullName || req.user?.email || 'Lead Admin' });
  }

  res.json({
    success: true,
    message: `Physical siren in sector '${sectorId}' has been turned ${active ? 'ON' : 'OFF'}.`,
    sectorId,
    active
  });
};

export const getAlertCAP = (req: Request, res: Response): void => {
  const { id } = req.params;
  const alert = stateService.getActiveAlerts().find((a) => a.id === id) ||
    stateService.getAlertHistory().find((a) => a.id === id);

  if (!alert) {
    res.status(404).json({ success: false, message: 'Alert not found.' });
    return;
  }

  const capXml = alertService.exportCAP_XML(alert);
  res.setHeader('Content-Type', 'application/xml');
  res.send(capXml);
};
