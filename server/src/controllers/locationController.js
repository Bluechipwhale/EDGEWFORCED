// ==============================================================================
// EDGEWFORCE - WORK LOCATIONS & ATTENDANCE GEOFENCE CONTROLLER
// ==============================================================================

import { locationService } from '../services/locationService.js';

export const locationController = {
  async getLocations(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const locations = await locationService.getLocations(companyId, req.query);
      res.json({ success: true, data: locations, locations });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getLocationById(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const location = await locationService.getLocationById(req.params.id, companyId);
      res.json({ success: true, data: location, ...location });
    } catch (err) {
      res.status(404).json({ success: false, error: { message: err.message } });
    }
  },

  async createLocation(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const location = await locationService.createLocation({
        ...req.body,
        company_id: companyId
      }, req.user, req);
      res.status(201).json({
        success: true,
        data: location,
        ...location,
        message: `Work location "${location.name}" created successfully.`
      });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'LOCATION_CREATION_FAILED', message: err.message } });
    }
  },

  async updateLocation(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const updated = await locationService.updateLocation(req.params.id, {
        ...req.body,
        company_id: companyId
      }, req.user, req);
      res.json({
        success: true,
        data: updated,
        ...updated,
        message: `Work location "${updated.name}" updated successfully.`
      });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async deleteLocation(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const result = await locationService.deleteLocation(req.params.id, companyId, req.user, req);
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getEmployeeLocations(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const employeeId = req.params.employeeId || req.user?.employee?.id || req.user?.id;
      const details = await locationService.getEmployeeLocations(employeeId, companyId);
      res.json({ success: true, data: details, ...details });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async assignEmployeeLocation(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const employeeId = req.params.employeeId;
      const result = await locationService.assignEmployeeLocation({
        ...req.body,
        employee_id: employeeId,
        company_id: companyId
      }, req.user, req);
      res.status(201).json({
        success: true,
        data: result,
        ...result,
        message: `Location "${result.location.name}" assigned to ${result.employee.name}.`
      });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'ASSIGNMENT_FAILED', message: err.message } });
    }
  },

  async removeEmployeeLocationAssignment(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const result = await locationService.removeEmployeeLocationAssignment(
        req.params.assignmentId,
        companyId,
        req.user,
        req.body?.reason || 'Administrative Removal',
        req
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getLocationStatusSummary(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const summary = await locationService.getEmployeeLocationStatusSummary(companyId);
      res.json({ success: true, data: summary, summary });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getEmployeeLocationHistory(req, res) {
    try {
      const companyId = req.user?.company_id || 1;
      const employeeId = req.params.employeeId;
      const details = await locationService.getEmployeeLocations(employeeId, companyId);
      res.json({ success: true, data: details.history || [], history: details.history || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
};
