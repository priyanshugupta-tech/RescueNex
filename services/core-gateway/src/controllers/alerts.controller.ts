import { Request, Response } from 'express';
import { stateService } from '../services/state.service.js';
import { alertService } from '../services/alert.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

let alertSocketEmitter: any = null;
export const setAlertSocketEmitter = (emitter: any) => {
  alertSocketEmitter = emitter;
};

export const getAlerts = (req: Request, res: Response): void => {
  res.json({
    success: true,
    activeAlerts: stateService.getActiveAlerts(),
    history: stateService.getAlertHistory()
  });
};

export const acknowledgeAlert = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const userName = req.user ? req.user.name : 'Unknown Operator';

  const updated = stateService.acknowledgeAlert(id, userName);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Alert not found.' });
    return;
  }

  if (alertSocketEmitter) {
    alertSocketEmitter('ALERT_ACKNOWLEDGED', { alertId: id, acknowledgedBy: userName });
  }

  res.json({
    success: true,
    message: `Alert '${id}' acknowledged by ${userName}.`
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
    alertSocketEmitter('SIREN_STATE_CHANGED', { sectorId, active, operator: req.user?.name });
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
