import { Router } from 'express';
import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  toggleSiren,
  getAlertCAP
} from '../controllers/alerts.controller.js';
import {
  authenticateToken,
  requireRole,
  requireEmergencyConfirmation
} from '../middleware/auth.middleware.js';

const router = Router();

// Publicly readable alerts
router.get('/', getAlerts);
router.get('/:id/cap-xml', getAlertCAP);

// Operators/Admins can acknowledge alerts
router.post(
  '/:id/acknowledge',
  authenticateToken,
  requireRole(['ADMIN', 'OPERATOR']),
  acknowledgeAlert
);

// Operators/Admins can resolve alerts (triggers 48h TTL deletion in Atlas)
router.post(
  '/:id/resolve',
  authenticateToken,
  requireRole(['ADMIN', 'OPERATOR']),
  resolveAlert
);

// Siren toggle: Admin / Operator role-based toggle
router.post(
  '/siren/toggle',
  authenticateToken,
  requireRole(['ADMIN', 'OPERATOR']),
  toggleSiren
);

export default router;
