import { Router } from 'express';
import {
  login,
  register,
  getCurrentUser,
  getPendingUsers,
  approveUser,
  googleOAuthLogin,
  setup2FA,
  verifyAndEnable2FA
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Standard Login & Self-Serve Public Registration
router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateToken, getCurrentUser);

// OAuth 2.0 (Google Sign-In for Public/Commuters)
router.post('/oauth/google', googleOAuthLogin);

// 2FA TOTP (Google Authenticator / Authy)
router.post('/2fa/setup', authenticateToken, setup2FA);
router.post('/2fa/verify', authenticateToken, verifyAndEnable2FA);

// Main Admin Approval Management (Priyanshu Gupta Only)
router.get('/pending', authenticateToken, requireRole(['ADMIN']), getPendingUsers);
router.post('/approve/:id', authenticateToken, requireRole(['ADMIN']), approveUser);

export default router;
