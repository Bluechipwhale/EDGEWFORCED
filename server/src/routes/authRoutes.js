// ==============================================================================
// EDGEWFORCE - AUTHENTICATION ROUTES
// ==============================================================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController.js';
import { hasRole } from '../middleware/rbac.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { message: 'Too many authentication attempts. Try again later.' } } });
router.use(['/login', '/forgot-password', '/reset-password'], authLimiter);

router.post('/login', authController.login);
router.post('/register', requireAuth, hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'), authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);
router.post('/change-password', requireAuth, authController.changePassword);

export default router;

