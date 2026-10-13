// ==============================================================================
// EDGEWFORCE - ADMIN & TENANT MANAGEMENT ROUTES
// ==============================================================================

import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

// 1. Company Onboarding & Registration
router.post('/onboard', hasRole('SUPER_ADMIN', 'CEO', 'IT_ADMIN'), adminController.onboardCompany);
router.get('/companies', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN', 'HR_MANAGER', 'HR'), adminController.getCompanies);
router.get('/companies/:id', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN', 'HR_MANAGER', 'HR'), adminController.getCompanyById);

// 2. Company Settings & Modules
router.get('/settings', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN', 'HR_MANAGER', 'HR'), adminController.getSettings);
router.put('/settings', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN'), adminController.updateSettings);
router.put('/settings/:companyId', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN'), adminController.updateSettings);

// 3. Staff Password Reset
router.post('/employees/:id/reset-password', hasRole('SUPER_ADMIN', 'ADMIN', 'IT_ADMIN'), adminController.resetStaffPassword);
router.post('/staff-password', hasRole('SUPER_ADMIN', 'ADMIN', 'IT_ADMIN'), adminController.resetStaffPassword);

// 4. Organization Structure (Regions, Territories, Teams, Branches, Warehouses)
router.get('/structure', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'), adminController.getStructure);

// 5. System Audit Logs
router.get('/audit-logs', hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN', 'HR_MANAGER', 'HR'), adminController.getAuditLogs);

export default router;
