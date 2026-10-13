// ==============================================================================
// EDGEWFORCE - DELIVERY & LOGISTICS CONTROLLER
// ==============================================================================

import { deliveryService } from '../services/deliveryService.js';
import { storageService } from '../services/storageService.js';
import { logger } from '../utils/logger.js';

export const deliveryController = {
  async getDeliveries(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const list = await deliveryService.getDeliveries(companyId, req.query);
      res.json({ success: true, data: list });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getDeliveryById(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const delivery = await deliveryService.getDeliveryById(req.params.id, companyId);
      if (!delivery) return res.status(404).json({ success: false, error: { message: 'Delivery not found' } });
      res.json({ success: true, data: delivery });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async dispatchOrder(req, res) {
    try {
      const delivery = await deliveryService.dispatchOrder(req.body, req.user);
      res.json({ success: true, data: delivery });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async confirmProofOfDelivery(req, res) {
    try {
      const photoUrl = req.file ? await storageService.uploadFile(req.file, 'delivery_proofs') : req.body.photo_url;
      const payload = {
        ...req.body,
        photo_url: photoUrl
      };
      const updated = await deliveryService.confirmProofOfDelivery(req.params.id, payload, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async failDelivery(req, res) {
    try {
      const updated = await deliveryService.failDelivery(req.params.id, req.body.reason, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getDeliveryMetrics(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const metrics = await deliveryService.getDeliveryMetrics(companyId);
      res.json({ success: true, data: metrics });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
};
