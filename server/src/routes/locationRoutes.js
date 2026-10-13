// ==============================================================================
// EDGEWFORCE - WORK LOCATIONS & ATTENDANCE GEOFENCE ROUTES
// ==============================================================================

import express from 'express';
import { locationController } from '../controllers/locationController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

// 1. Work Locations Directory & CRUD
router.get('/', locationController.getLocations);
router.post('/', hasRole('ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'IT_ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'SUPERVISOR'), locationController.createLocation);
router.get('/summary/status', locationController.getLocationStatusSummary);
router.get('/:id', locationController.getLocationById);
router.put('/:id', hasRole('ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'IT_ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'SUPERVISOR'), locationController.updateLocation);
router.delete('/:id', hasRole('ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'IT_ADMIN', 'HR', 'HR_MANAGER', 'MANAGER'), locationController.deleteLocation);

// 2. Employee Location Assignments
router.get('/employee/:employeeId', locationController.getEmployeeLocations);
router.get('/employee/:employeeId/history', locationController.getEmployeeLocationHistory);
router.post('/employee/:employeeId/assign', hasRole('ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'IT_ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'SUPERVISOR'), locationController.assignEmployeeLocation);
router.delete('/assignments/:assignmentId', hasRole('ADMIN', 'SUPER_ADMIN', 'CEO', 'CTO', 'IT_ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'SUPERVISOR'), locationController.removeEmployeeLocationAssignment);

export default router;
