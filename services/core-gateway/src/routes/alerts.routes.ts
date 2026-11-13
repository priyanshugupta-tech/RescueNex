import { Router } from 'express';
import {
  getAlerts,
  acknowledgeAlert,
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

// High-security siren toggle: Admin only + confirmation header
router.post(
  '/siren/toggle',
  authenticateToken,
  requireRole(['ADMIN']),
  requireEmergencyConfirmation,
  toggleSiren
);

export default router;
