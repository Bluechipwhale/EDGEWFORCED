// ==============================================================================
// EDGEWFORCE - SALES AI COPILOT ROUTES
// ==============================================================================

import express from 'express';
import { aiController } from '../controllers/accountingController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);
router.post('/copilot', aiController.askCopilot);

export default router;
