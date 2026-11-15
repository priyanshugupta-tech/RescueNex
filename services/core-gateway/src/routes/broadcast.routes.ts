import { Router } from 'express';
import {
  getBroadcastLogs,
  manualDispatch,
  testDispatch,
  updatePhonePreferences,
  syncUserLocation,
  sendPhoneOtp,
  verifyPhoneOtp,
  dismissPhonePrompt
} from '../controllers/broadcast.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Retrieve broadcast dispatch audit trail
router.get('/logs', authenticateToken, getBroadcastLogs);

// Manual corridor evacuation dispatch (restricted to Incident Operators & Admins)
router.post('/dispatch', authenticateToken, requireRole(['OPERATOR', 'ADMIN']), manualDispatch);

// Test transmission to caller's registered mobile number
router.post('/test', authenticateToken, testDispatch);

// Phone OTP verification flow (Post-signup SMS activation)
router.post('/phone/send-otp', authenticateToken, sendPhoneOtp);
router.post('/phone/verify-otp', authenticateToken, verifyPhoneOtp);
router.post('/phone/dismiss-prompt', authenticateToken, dismissPhonePrompt);

// User alert preferences & GPS corridor synchronization
router.put('/phone', authenticateToken, updatePhonePreferences);
router.post('/location', authenticateToken, syncUserLocation);

export default router;
