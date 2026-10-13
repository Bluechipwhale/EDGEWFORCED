// ==============================================================================
// EDGEWFORCE - INVENTORY CONTROLLER
// ==============================================================================

import { inventoryService } from '../services/inventoryService.js';
import { logger } from '../utils/logger.js';

export const inventoryController = {
  async getProducts(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const products = await inventoryService.getProducts(companyId, req.query);
      res.json({ success: true, data: products });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getProductById(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const product = await inventoryService.getProductById(req.params.id, companyId);
      if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
      res.json({ success: true, data: product });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async createProduct(req, res) {
    try {
      const product = await inventoryService.createProduct(req.body, req.user);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async updateProduct(req, res) {
    try {
      const updated = await inventoryService.updateProduct(req.params.id, req.body, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async deleteProduct(req, res) {
    try {
      const result = await inventoryService.deleteProduct(req.params.id, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async recordStockMovement(req, res) {
    try {
      const movement = await inventoryService.recordStockMovement(req.body, req.user);
      res.status(201).json({ success: true, data: movement });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getMovements(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const movements = await inventoryService.getMovements(companyId, Number(req.query.limit || 50));
      res.json({ success: true, data: movements });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getWarehouses(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const warehouses = await inventoryService.getWarehouses(companyId);
      res.json({ success: true, data: warehouses });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getInventorySummary(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const summary = await inventoryService.getInventorySummary(companyId);
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
};
