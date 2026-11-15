import { Router } from 'express';
import {
  processBatchSync,
  createFieldReport,
  getFieldReports
} from '../controllers/sync.controller.js';
import { authenticateToken, requireRole, optionalAuthToken } from '../middleware/auth.middleware.js';

const router = Router();

// Batch synchronization endpoint for offline queued items (token checked for role-restricted items)
router.post('/sync/batch', optionalAuthToken, processBatchSync);

// Ground Scout Observation endpoints - strictly restricted to certified SCOUT, OPERATOR, or ADMIN
router.post(
  '/scout/report',
  authenticateToken,
  requireRole(['SCOUT', 'OPERATOR', 'ADMIN']),
  createFieldReport
);

// Read-only 10 km geofenced reports for corridor commuters
router.get('/scout/reports', getFieldReports);

export default router;
