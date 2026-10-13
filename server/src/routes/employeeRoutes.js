// ==============================================================================
// EDGEWFORCE - EMPLOYEE SELF-SERVICE ROUTES
// ==============================================================================

import express from 'express';
import { employeeController } from '../controllers/employeeController.js';
import { hrController } from '../controllers/hrController.js';
import { scheduleController } from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', employeeController.getDashboard);
router.get('/profile', employeeController.getProfile);
router.get('/directory', hrController.getEmployees);
router.get('/colleagues', hrController.getEmployees);
router.get('/attendance', employeeController.getAttendance);
router.post('/attendance/clock', employeeController.clockAttendance);
router.post('/face/verify', employeeController.verifyFaceBiometric);
router.get('/leave/balances', employeeController.getLeaveBalances);
router.post('/leave/request', employeeController.applyLeave);
router.get('/leave/requests', employeeController.getLeaveRequests);
router.get('/payslips/latest', employeeController.getLatestPayslip);
router.get('/payslips', employeeController.getPayslips);
router.get('/okrs', employeeController.getOKRs);
router.put('/okrs/:id', employeeController.updateOKR);
router.get('/tasks', employeeController.getTasks);
router.put('/tasks/:id', employeeController.updateTask);
router.post('/idle-events', employeeController.logIdleEvent);
router.get('/announcements', employeeController.getAnnouncements);
router.get('/birthdays', employeeController.getUpcomingBirthdays);

// Daily Scheduler Self-Service Endpoints
router.get('/schedule', scheduleController.getMySchedules);
router.get('/schedule/today', scheduleController.getTodaySchedule);
router.post('/schedule', scheduleController.submitSchedule);
router.put('/schedule/:id/tasks/:taskId', scheduleController.updateTaskStatus);
router.delete('/schedule/:id', scheduleController.deleteSchedule);

export default router;
