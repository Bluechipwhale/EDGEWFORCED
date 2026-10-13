// ==============================================================================
// EDGEWFORCE - DELIVERY & LOGISTICS ROUTES
// ==============================================================================

import express from 'express';
import { deliveryController } from '../controllers/deliveryController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', deliveryController.getDeliveries);
router.get('/metrics', deliveryController.getDeliveryMetrics);
router.get('/:id', deliveryController.getDeliveryById);

router.post('/dispatch', hasRole('SUPERVISOR', 'MANAGER', 'ADMIN', 'IT_ADMIN', 'CEO'), deliveryController.dispatchOrder);
router.post('/:id/confirm', upload.single('pod_photo'), deliveryController.confirmProofOfDelivery);
router.post('/:id/fail', deliveryController.failDelivery);

export default router;
