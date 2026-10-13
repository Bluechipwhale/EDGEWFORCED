// ==============================================================================
// EDGEWFORCE - DAILY SCHEDULER API ROUTES
// ==============================================================================

import express from 'express';
import { scheduleController } from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

// 1. Employee Self-Service Schedule Routes
router.get('/', scheduleController.getMySchedules);
router.get('/mine', scheduleController.getMySchedules);
router.get('/today', scheduleController.getTodaySchedule);
router.post('/', scheduleController.submitSchedule);
router.put('/:id/tasks/:taskId', scheduleController.updateTaskStatus);
router.delete('/:id', scheduleController.deleteSchedule);

// 2. Supervisor Team Schedule Review Routes
router.get(
  '/supervisor',
  hasRole('SUPERVISOR', 'MANAGER', 'CEO', 'CTO', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'),
  scheduleController.getSupervisorSchedules
);
router.put(
  '/:id/supervisor-review',
  hasRole('SUPERVISOR', 'MANAGER', 'CEO', 'CTO', 'HR', 'HR_MANAGER', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'),
  scheduleController.reviewSupervisorSchedule
);

// 3. HR Command Center Schedule Roster Routes
router.get(
  '/hr',
  hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  scheduleController.getHRSchedules
);
router.put(
  '/:id/hr-review',
  hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN', 'SUPER_ADMIN', 'ADMIN'),
  scheduleController.reviewHRSchedule
);

export default router;
