// ==============================================================================
// EDGEWFORCE - CUSTOMER 360 CONTROLLER
// ==============================================================================

import { customerService } from '../services/customerService.js';
import { logger } from '../utils/logger.js';

export const customerController = {
  async getCustomers(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const customers = await customerService.getCustomers(companyId, req.query);
      res.json({ success: true, data: customers });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getCustomerById(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const customer = await customerService.getCustomerById(req.params.id, companyId);
      if (!customer) return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
      res.json({ success: true, data: customer });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getCustomer360(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const data = await customerService.getCustomer360(req.params.id, companyId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async createCustomer(req, res) {
    try {
      const created = await customerService.createCustomer(req.body, req.user);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async updateCustomer(req, res) {
    try {
      const updated = await customerService.updateCustomer(req.params.id, req.body, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async updateLocation(req, res) {
    try {
      const updated = await customerService.updateLocation(req.params.id, req.body, req.user);
      res.json({
        success: true,
        data: updated,
        message: `Location updated to: ${updated.resolved_address}`
      });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async geocode(req, res) {
    try {
      const { lat, lng } = req.query;
      const { reverseGeocode, getGoogleMapsNavigationUrl } = await import('../utils/geocoder.js');
      const address = await reverseGeocode(lat, lng);
      const directionsUrl = getGoogleMapsNavigationUrl(lat, lng);
      res.json({
        success: true,
        data: {
          latitude: Number(lat),
          longitude: Number(lng),
          address,
          directions_url: directionsUrl
        }
      });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
};

