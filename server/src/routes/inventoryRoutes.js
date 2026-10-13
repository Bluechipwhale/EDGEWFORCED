// ==============================================================================
// EDGEWFORCE - INVENTORY & STOCK ROUTES
// ==============================================================================

import express from 'express';
import { inventoryController } from '../controllers/inventoryController.js';
import { requireAuth } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireAuth);

// Middleware strictly forbidding Field Agents, Sales Agents, and Promoters from accessing inventory
const requireInventoryAccess = (req, res, next) => {
  const role = String(req.user?.role_code || '').toUpperCase();
  const rank = String(req.user?.rank?.code || '').toUpperCase();

  const disallowed = ['FIELD_AGENT', 'SALES_AGENT', 'BRAND_AMBASSADOR', 'PROMOTER'];
  if (disallowed.includes(role) || disallowed.includes(rank)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: Inventory workspace is restricted to Staff, HR, Operations, and Management.'
      }
    });
  }
  next();
};

router.use(requireInventoryAccess);

// 1. Products (Viewable by Staff, HR, Management; Editable by Admins/Managers)
router.get('/products', inventoryController.getProducts);
router.get('/products/:id', inventoryController.getProductById);
router.post('/products', hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN', 'CEO', 'HR_MANAGER', 'HR'), inventoryController.createProduct);
router.put('/products/:id', hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN', 'CEO', 'HR_MANAGER', 'HR'), inventoryController.updateProduct);
router.delete('/products/:id', hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_ADMIN', 'CEO'), inventoryController.deleteProduct);

// 2. Stock Movements & Restocking
router.post('/movements', hasRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'IT_ADMIN', 'CEO', 'HR_MANAGER', 'HR', 'STAFF_MEMBER', 'EMPLOYEE'), inventoryController.recordStockMovement);
router.get('/movements', inventoryController.getMovements);

// 3. Warehouses & Summary
router.get('/warehouses', inventoryController.getWarehouses);
router.get('/summary', inventoryController.getInventorySummary);

export default router;
