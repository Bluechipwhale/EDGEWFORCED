// ==============================================================================
// EDGEWFORCE - CUSTOMER 360 ROUTES
// ==============================================================================

import express from 'express';
import { customerController } from '../controllers/customerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', customerController.getCustomers);
router.get('/geocode', customerController.geocode);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/360', customerController.getCustomer360);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.post('/:id/update-location', customerController.updateLocation);

export default router;

