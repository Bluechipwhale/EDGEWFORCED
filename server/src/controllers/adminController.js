// ==============================================================================
// EDGEWFORCE - ADMIN & TENANT CONTROLLER
// ==============================================================================

import { adminService } from '../services/adminService.js';
import { logger } from '../utils/logger.js';

export const adminController = {
  async onboardCompany(req, res) {
    try {
      const result = await adminService.onboardCompany(req.body, req.user);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      logger.error('Failed to onboard company', err);
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getCompanies(req, res) {
    try {
      const companies = await adminService.getCompanies();
      res.json({ success: true, data: companies });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getCompanyById(req, res) {
    try {
      const company = await adminService.getCompanyById(req.params.id);
      if (!company) return res.status(404).json({ success: false, error: { message: 'Company not found' } });
      res.json({ success: true, data: company });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getSettings(req, res) {
    try {
      const companyId = req.params.companyId || req.user.company_id || 1;
      const settings = await adminService.getSettings(companyId);
      res.json({ success: true, data: settings });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async updateSettings(req, res) {
    try {
      const companyId = req.params.companyId || req.user.company_id || 1;
      const updated = await adminService.updateCompanySettings(companyId, req.body, req.user);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async resetStaffPassword(req, res) {
    try {
      const employeeId = req.params.id || req.body.employee_id;
      const { password } = req.body;
      const result = await adminService.resetStaffPassword(employeeId, password, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getStructure(req, res) {
    try {
      const companyId = req.query.companyId || req.user.company_id || 1;
      const structure = await adminService.getStructure(companyId);
      res.json({ success: true, data: structure });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getAuditLogs(req, res) {
    try {
      const companyId = req.user.company_id || req.query.companyId;
      const logs = await adminService.getAuditLogs(companyId, Number(req.query.limit || 50));
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
};
