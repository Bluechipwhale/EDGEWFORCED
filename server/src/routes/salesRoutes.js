// ==============================================================================
// EDGEWFORCE - COMMERCIAL SALES ROUTES
// ==============================================================================

import express from 'express';
import { salesController } from '../controllers/salesController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { hasRole, verifyResourceOwnership } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

// Guard: Field agents must not access commercial sales
router.use((req, res, next) => {
  if (req.user?.role_code === 'FIELD_AGENT') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Field Agents are not authorized to access commercial sales endpoints.' }
    });
  }
  next();
});

// 1. Core Sales & POS
router.get('/my-report', salesController.getMyReport);
router.get('/customers', salesController.getCustomers);
router.post('/customers', salesController.createCustomer);
router.get('/products', salesController.getProducts);

// Product creation/deletion restricted to Management only
router.post('/products', hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CEO', 'CTO', 'IT_ADMIN'), salesController.createProduct);
router.delete('/products/:id', hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CEO', 'CTO', 'IT_ADMIN'), salesController.deleteProduct);

router.post('/orders', salesController.createOrder);
router.get('/orders', salesController.getOrders);

// 2. Order Approval Workflow (Restricted to Management & Supervisors)
router.post('/orders/:id/approve', hasRole('SUPERVISOR', 'MANAGER', 'SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO'), salesController.approveOrder);
router.post('/orders/:id/reject', hasRole('SUPERVISOR', 'MANAGER', 'SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO'), salesController.rejectOrder);
router.post('/orders/:id/request-changes', hasRole('SUPERVISOR', 'MANAGER', 'SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO'), salesController.requestOrderChanges);

// 3. Sales Funnel & Collections
router.get('/funnel', salesController.getSalesFunnel);
router.post('/payments', salesController.recordPayment);
router.get('/payments', salesController.getPayments);
router.post('/payments/paystack', salesController.processPaystackPayment);

// 4. Intel & Settlement
router.post('/competitor-intel', upload.single('photo'), salesController.createCompetitorIntel);
router.get('/competitor-intel', salesController.getCompetitorIntel);
router.post('/settlements', upload.single('bank_slip'), salesController.createSettlement);
router.get('/settlements', salesController.getSettlements);

export default router;
