import { Router } from 'express';
import {
  sendSignupOTP,
  signup,
  login,
  refreshToken,
  logout,
  googleOAuthLogin,
  getCurrentUser,
  getPendingUsers,
  approveUser
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// 📧 Signup with Resend Email OTP (OTP is ONLY on signup!)
router.post('/send-signup-otp', sendSignupOTP);
router.post('/signup', signup);

// 🔑 Standard Login (NO OTP! Username + Password)
router.post('/login', login);

// 🔄 Token Refresh & Session Revocation
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// 🌐 Google OAuth 2.0 (Public / Commuters)
router.post('/oauth/google', googleOAuthLogin);

// 👤 Current Authenticated User Profile
router.get('/me', authenticateToken, getCurrentUser);

// 👑 Main Admin Approval Management (Priyanshu Gupta Only)
router.get('/pending', authenticateToken, requireRole(['ADMIN']), getPendingUsers);
router.post('/approve/:id', authenticateToken, requireRole(['ADMIN']), approveUser);

export default router;
