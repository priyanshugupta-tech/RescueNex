import { Router } from 'express';
import {
  handleSignup,
  handleOtp,
  handleLogin,
  handleTokengen,
  logoutHandler,
  logoutAllHandler,
  googleOAuthLogin,
  getCurrentUser,
  getPendingUsers,
  approveUser
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// 📧 Signup (Creates unverified account and sends OTP via Resend)
router.post('/signup', handleSignup);

// 🔑 Verify OTP (SHA-256 hashed OTP verification, activates account and issues HTTP-only session cookie)
router.post('/verify-otp', handleOtp);
router.post('/otp', handleOtp);

// 🚪 Login (Direct Username + Password, NO OTP needed!)
router.post('/login', handleLogin);

// 🔄 Token Refresh (Reads HTTP-only refreshToken cookie, verifies active session, rotates token)
router.get('/tokengen', handleTokengen);
router.post('/tokengen', handleTokengen);

// 🛑 Logout (Single session revoke & All sessions revoke)
router.post('/logout', logoutHandler);
router.post('/logout-all', logoutAllHandler);

// 🌐 Google OAuth 2.0 (Public / Commuters)
router.post('/oauth/google', googleOAuthLogin);

// 👤 Profile Verification
router.get('/me', authenticateToken, getCurrentUser);

// 👑 Main Admin Approval Management (Priyanshu Gupta Only)
router.get('/pending', authenticateToken, requireRole(['ADMIN']), getPendingUsers);
router.post('/approve/:id', authenticateToken, requireRole(['ADMIN']), approveUser);

export default router;
