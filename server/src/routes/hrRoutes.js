// ==============================================================================
// EDGEWFORCE - HR COMMAND CENTER ROUTES
// ==============================================================================

import express from 'express';
import { hrController } from '../controllers/hrController.js';
import { scheduleController } from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';
import { staffImportController, staffImportUpload } from '../controllers/staffImportController.js';

const router = express.Router();

router.use(requireAuth);

const importAccess = hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN');
router.get('/employees/import/template', importAccess, staffImportController.template);
router.post('/employees/import/preview', importAccess, staffImportUpload, staffImportController.preview);
router.post('/employees/import', importAccess, staffImportUpload, staffImportController.commit);

// 1. Read-Only Staff Directory, Ranks, Announcements & Birthdays (accessible to authenticated staff with field redactions)
router.get('/employees', hrController.getEmployees);
router.get('/ranks', hrController.getRanks);
router.get('/announcements', hrController.getAnnouncements);
router.get('/birthdays', hrController.getBirthdays);
router.get('/organization', hrController.getOrganization);

// 2. Sensitive Management & HR Actions (Strictly Protected by Role)
router.get('/dashboard', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.getDashboard);
router.post('/employees/register', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.registerStaff);
router.post('/staff/register', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.registerStaff);
router.put('/employees/:id', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.updateEmployee);
router.put('/employees/:id/status', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.updateStaffStatus);
router.post('/employees/:id/resend-invitation', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.resendInvitation);
router.get('/audit-logs', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.getAuditLogs);
router.get('/attendance', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.getAttendance);
router.get('/idle-events', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.getIdleEvents);
router.get('/leave', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.getLeave);
router.put('/leave/:id/approve', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.approveLeave);
router.put('/leave/:id/reject', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.rejectLeave);
router.get('/tasks', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.getTasks);
router.post('/tasks', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.assignTask);
router.get('/sos', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.getSOS);
router.put('/sos/:id/acknowledge', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.acknowledgeSOS);
router.put('/sos/:id/resolve', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), hrController.resolveSOS);
router.post('/ranks', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.createRank);
router.put('/ranks/:id', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.updateRank);
router.put('/organization/node/:id', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.reassignOrganizationNode);
router.delete('/organization/node/:id', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.deleteOrganizationNode);

// Announcements & Broadcasts
router.post('/announcements', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.createAnnouncement);
router.put('/announcements/:id', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.updateAnnouncement);
router.delete('/announcements/:id', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.deleteAnnouncement);

// Staff Birthdays & Milestones
router.put('/employees/:id/birthday', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.updateBirthday);
router.post('/birthdays/broadcast', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), hrController.broadcastBirthday);

// Daily Schedules & Workforce Roster
router.get('/schedules', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'), scheduleController.getHRSchedules);
router.put('/schedules/:id/review', hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'), scheduleController.reviewHRSchedule);

export default router;
