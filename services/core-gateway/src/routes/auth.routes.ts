import { Router } from 'express';
import {
  login,
  register,
  getCurrentUser,
  getPendingUsers,
  approveUser,
  googleOAuthLogin,
  sendEmailOTP,
  verifyEmailOTP
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// 📧 Resend Email OTP Signup/Login (Public / Commuters)
router.post('/send-otp', sendEmailOTP);
router.post('/verify-otp', verifyEmailOTP);

// 🌐 Google OAuth 2.0 (Public / Commuters)
router.post('/oauth/google', googleOAuthLogin);

// 🔑 Standard Official Login & Registration (Disaster Teams)
router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateToken, getCurrentUser);

// 👑 Main Admin Approval Management (Priyanshu Gupta Only)
router.get('/pending', authenticateToken, requireRole(['ADMIN']), getPendingUsers);
router.post('/approve/:id', authenticateToken, requireRole(['ADMIN']), approveUser);

export default router;
