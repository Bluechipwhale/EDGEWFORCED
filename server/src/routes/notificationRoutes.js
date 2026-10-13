// ==============================================================================
// EDGEWFORCE - NOTIFICATION & PUSH ROUTES
// ==============================================================================

import express from 'express';
import { notificationController } from '../controllers/accountingController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', notificationController.getNotifications);
router.get('/list', notificationController.getNotifications);
router.get('/notifications', notificationController.getNotifications);
router.put('/:id/read', notificationController.markRead);
router.put('/mark-all-read', notificationController.markAllRead);
router.post('/read', notificationController.markRead);
router.post('/notifications/read', notificationController.markRead);
router.post('/push/subscribe', notificationController.subscribePush);
router.post('/subscribe', notificationController.subscribePush);
router.delete('/push/subscribe', notificationController.unsubscribePush);
router.delete('/subscribe', notificationController.unsubscribePush);

export default router;

