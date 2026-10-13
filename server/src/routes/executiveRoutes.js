// ==============================================================================
// EDGEWFORCE - EXECUTIVE & CEO ROUTES
// ==============================================================================

import express from 'express';
import { executiveController } from '../controllers/accountingController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);
router.use(hasRole('CEO', 'CTO'));

router.get('/dashboard', executiveController.getDashboard);

export default router;
