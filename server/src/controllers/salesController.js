// ==============================================================================
// EDGEWFORCE - COMMERCIAL SALES CONTROLLER
// ==============================================================================

import { salesService } from '../services/salesService.js';
import { inventoryService } from '../services/inventoryService.js';
import { isManagementUser } from '../middleware/rbac.js';

export const salesController = {
  async getMyReport(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const report = await salesService.getMyReport(empId);
      res.json({ success: true, data: report, ...report });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'REPORT_FAILED', message: err.message } });
    }
  },

  async getCustomers(req, res) {
    try {
      const { q, territory } = req.query;
      const customers = await salesService.getCustomers(q, territory);
      res.json({ success: true, data: customers, customers });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async createCustomer(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const customer = await salesService.createCustomer(req.body, empId, req);
      res.status(201).json({ success: true, data: customer, customer, message: 'Merchant outlet registered successfully.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CUSTOMER_CREATION_FAILED', message: err.message } });
    }
  },

  async getProducts(req, res) {
    try {
      const { category, q } = req.query;
      const products = await salesService.getProducts(category, q);
      res.json({ success: true, data: products, products });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async createProduct(req, res) {
    try {
      const product = await inventoryService.createProduct(req.body, req.user);
      res.status(201).json({ success: true, data: product, ...product, message: 'Product SKU added to commercial catalog.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CREATE_PRODUCT_FAILED', message: err.message } });
    }
  },

  async deleteProduct(req, res) {
    try {
      const result = await inventoryService.deleteProduct(req.params.id, req.user);
      res.json({ success: true, data: result, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'DELETE_PRODUCT_FAILED', message: err.message } });
    }
  },

  async createOrder(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const order = await salesService.createOrder(req.body, empId, req);
      res.status(201).json({ success: true, data: order, ...order, message: `Order ${order.order_number} booked successfully.` });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'ORDER_FAILED', message: err.message } });
    }
  },

  async getOrders(req, res) {
    try {
      const isMgmt = isManagementUser(req.user);
      const query = { ...req.query };
      if (!isMgmt) {
        const empId = req.user.employee?.id || req.user.id;
        query.agent_id = empId;
      }
      const orders = await salesService.getOrders(query);
      res.json({ success: true, data: orders, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async recordPayment(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const collection = await salesService.recordPayment(req.body, empId, req);
      res.status(201).json({ success: true, data: collection, ...collection, message: 'Payment collection recorded.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'COLLECTION_FAILED', message: err.message } });
    }
  },

  async getPayments(req, res) {
    try {
      const isMgmt = isManagementUser(req.user);
      const query = { ...req.query };
      if (!isMgmt) {
        const empId = req.user.employee?.id || req.user.id;
        query.recorded_by = empId;
      }
      const payments = await salesService.getPayments(query);
      res.json({ success: true, data: payments, payments });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async createCompetitorIntel(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const intel = await salesService.createCompetitorIntel(req.body, empId, req.file || null, req);
      res.status(201).json({ success: true, data: intel, intel, message: 'Competitor intelligence logged.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'INTEL_FAILED', message: err.message } });
    }
  },

  async getCompetitorIntel(req, res) {
    try {
      const intel = await salesService.getCompetitorIntel();
      res.json({ success: true, data: intel, intel });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async createSettlement(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const settlement = await salesService.createSettlement(req.body, empId, req.file || null, req);
      res.status(201).json({ success: true, data: settlement, settlement, message: 'Daily settlement reconciliation submitted.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'SETTLEMENT_FAILED', message: err.message } });
    }
  },

  async approveOrder(req, res) {
    try {
      const { comments } = req.body;
      const updated = await salesService.approveOrder(req.params.id, req.user, comments);
      res.json({ success: true, data: updated, message: `Order #${req.params.id} approved successfully.` });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async rejectOrder(req, res) {
    try {
      const { rejection_reason } = req.body;
      const updated = await salesService.rejectOrder(req.params.id, req.user, rejection_reason);
      res.json({ success: true, data: updated, message: `Order #${req.params.id} rejected.` });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async requestOrderChanges(req, res) {
    try {
      const { notes } = req.body;
      const updated = await salesService.requestOrderChanges(req.params.id, req.user, notes);
      res.json({ success: true, data: updated, message: `Order #${req.params.id} returned for changes.` });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getSalesFunnel(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const funnel = await salesService.getSalesFunnel(companyId);
      res.json({ success: true, data: funnel });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getSettlements(req, res) {
    try {
      const isMgmt = isManagementUser(req.user);
      const agentId = !isMgmt ? (req.user.employee?.id || req.user.id) : req.query.agent_id;
      const settlements = await salesService.getSettlements(agentId);
      res.json({ success: true, data: settlements, settlements });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async processPaystackPayment(req, res) {
    try {
      const collection = await salesService.processPaystackCollection(req.body, req.user);
      res.status(201).json({ success: true, data: collection, message: 'Paystack payment verified and reconciled.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
};
