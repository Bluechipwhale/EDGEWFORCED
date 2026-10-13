// ==============================================================================
// EDGEWFORCE - ACCOUNTING & FINANCE ROUTES
// ==============================================================================

import express from 'express';
import { accountingController } from '../controllers/accountingController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(requireAuth);
router.use(hasRole('ACCOUNTANT', 'SENIOR_ACCOUNTANT', 'CEO', 'CTO', 'IT_ADMIN', 'HR'));

router.get('/overview', accountingController.getOverview);
router.get('/payslips', accountingController.getPayslips);
router.put('/settlements/:id/review', accountingController.reviewSettlement);
router.post('/payroll/generate', accountingController.generatePayroll);
router.post('/payroll/generate-single', accountingController.generateSinglePayslip);
router.post('/payroll/upload', upload.single('payslip_pdf'), accountingController.uploadPayslip);

export default router;
