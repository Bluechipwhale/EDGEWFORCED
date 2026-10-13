// ==============================================================================
// EDGEWFORCE - FIELD OPERATIONS & SUPERVISOR ROUTES
// ==============================================================================

import express from 'express';
import { fieldController } from '../controllers/fieldController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

// 1. Shift & GPS Attendance
router.get('/route-manifest', fieldController.getRouteManifest);
router.post('/shifts/toggle', fieldController.toggleShift);
router.get('/shifts/current', fieldController.getCurrentShift);
router.get('/shifts/window-status', fieldController.getShiftWindowStatus);
router.post('/check-in', fieldController.checkIn);
router.post('/check-out', fieldController.checkOut);

// 2. Location Telemetry & Reports
router.get('/geolocation-report', fieldController.getGeoLocationReport);
router.post('/location-ping', fieldController.recordLocationPing);

router.get('/location-history', fieldController.getLocationHistory);
router.get('/location-history/:employeeId', fieldController.getLocationHistory);

// 3. Store Directory & Agent Store Requests
router.get('/stores', fieldController.getStores);
router.post('/store-requests', upload.fields([
  { name: 'store_photo', maxCount: 1 },
  { name: 'storefront_photo', maxCount: 1 }
]), fieldController.submitStoreRequest);
router.get('/store-requests', fieldController.getStoreRequests);
router.post('/store-requests/:requestId/approve', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'IT_ADMIN', 'CEO'), fieldController.approveStoreRequest);
router.post('/store-requests/:requestId/reject', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'IT_ADMIN', 'CEO'), fieldController.rejectStoreRequest);

// 4. Store Visits & Activities
router.post('/visits/start', fieldController.startStoreVisit);
router.post('/visits/check-in', fieldController.checkInVisit);
router.post('/visits/complete', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'photo_evidence', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), fieldController.completeVisit);
router.post('/activities/field', upload.single('photo'), fieldController.logFieldActivity);
router.post('/activities/sales', upload.single('photo'), fieldController.logSalesActivity);

// 5. Emergency SOS (Agents have read-only access to their own SOS records; resolution requires management role)
router.post('/sos-beacon', fieldController.triggerSOS);
router.get('/sos', fieldController.getSOS);

// 6. Supervisor Live Monitoring & Visibility (Strict RBAC protection against Unauthorized Agents)
router.get('/supervisor/metrics', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.getSupervisorDashboardMetrics);
router.get('/supervisor/team', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.getSupervisorTeamTable);
router.get('/supervisor/employee/:employeeId', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.getSupervisorEmployeeProfile);
router.get('/supervisor/employee/:employeeId/timeline', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.getEmployeeTimeline);
router.get('/supervisor/alerts', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.getSupervisorAlerts);
router.post('/supervisor/alerts/:alertId/resolve', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.resolveSupervisorAlert);
router.post('/supervisor/override-attendance', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.overrideAttendance);
router.post('/supervisor/daily-summary', hasRole('SUPERVISOR', 'MANAGER', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'CEO', 'CTO', 'SUPER_ADMIN', 'ADMIN'), fieldController.generateDailyTeamSummary);

// 7. Reporting Engine
router.get('/reports', fieldController.getReports);

export default router;
