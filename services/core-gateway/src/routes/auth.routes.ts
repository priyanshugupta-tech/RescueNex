import { Router } from 'express';
import {
  login,
  register,
  getCurrentUser,
  getPendingUsers,
  approveUser
} from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateToken, getCurrentUser);

// Main Admin Approval Routes
router.get('/pending', authenticateToken, requireRole(['ADMIN']), getPendingUsers);
router.post('/approve/:id', authenticateToken, requireRole(['ADMIN']), approveUser);

export default router;
