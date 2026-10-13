// ==============================================================================
// EDGEWFORCE - FIELD OPERATIONS & SUPERVISOR CONTROLLER
// ==============================================================================

import { fieldService } from '../services/fieldService.js';
import { isManagementUser } from '../middleware/rbac.js';

export const fieldController = {
  async getRouteManifest(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const manifest = await fieldService.getRouteManifest(agentId);
      res.json({ success: true, data: manifest, manifest });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async toggleShift(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const { latitude, longitude, device } = req.body;
      const shift = await fieldService.toggleShift(agentId, latitude, longitude, device, req, null, req.body);
      res.json({ success: true, data: shift, ...shift });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'SHIFT_TOGGLE_FAILED', message: err.message } });
    }
  },

  async getShiftWindowStatus(req, res) {
    try {
      const agentId = req.query.employee_id || req.user.employee?.id || req.user.id;
      if (Number(agentId) !== Number(req.user.employee?.id) && !isManagementUser(req.user)) return res.status(403).json({ success: false, error: { message: 'You can only view your own attendance.' } });
      const companyId = req.user.company_id || 1;
      const status = await fieldService.getShiftWindowStatus(agentId, companyId);
      res.json({ success: true, data: status, ...status });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getGeoLocationReport(req, res) {
    try {
      const companyId = req.user.company_id || 1;
      const report = await fieldService.getGeoLocationReport(req.query, companyId);
      res.json({ success: true, data: report, report, total: report.length });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getCurrentShift(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const shift = await fieldService.getCurrentShift(agentId);
      res.json({ success: true, data: shift, shift });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async checkIn(req, res) {
    try {
      const employeeId = req.body.employee_id || req.user.employee?.id || req.user.id;
      const { store_id, latitude, longitude, accuracy, address, device, is_override, override_reason } = req.body;
      const result = await fieldService.checkIn({
        employeeId,
        storeId: store_id,
        latitude,
        longitude,
        accuracy,
        address,
        device,
        isOverride: is_override,
        overrideReason: override_reason,
        req
      });
      res.json({ success: true, data: result, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CHECKIN_FAILED', message: err.message } });
    }
  },

  async checkOut(req, res) {
    try {
      const employeeId = req.body.employee_id || req.user.employee?.id || req.user.id;
      const { latitude, longitude, accuracy, address, device } = req.body;
      const result = await fieldService.checkOut({
        employeeId,
        latitude,
        longitude,
        accuracy,
        address,
        device,
        req
      });
      res.json({ success: true, data: result, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CHECKOUT_FAILED', message: err.message } });
    }
  },

  async recordLocationPing(req, res) {
    try {
      const employeeId = req.user.employee?.id || req.user.id;
      const { latitude, longitude, accuracy, address, current_activity, battery_level } = req.body;
      const ping = await fieldService.recordLocationPing({
        employeeId,
        latitude,
        longitude,
        accuracy,
        address,
        currentActivity: current_activity,
        batteryLevel: battery_level,
        req
      });
      res.json({ success: true, data: ping });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getLocationHistory(req, res) {
    try {
      const isMgmt = isManagementUser(req.user);
      const requestedEmpId = req.params.employeeId;
      const callerEmpId = req.user.employee?.id || req.user.id;

      if (requestedEmpId && !isMgmt && String(requestedEmpId) !== String(callerEmpId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied. You can only view your own location telemetry history.' }
        });
      }

      const employeeId = requestedEmpId || callerEmpId;
      const date = req.query.date;
      const history = await fieldService.getLocationHistory(employeeId, date);
      res.json({ success: true, data: history });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getStores(req, res) {
    try {
      const stores = await fieldService.getStores(req.query);
      res.json({ success: true, data: stores, stores });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async submitStoreRequest(req, res) {
    try {
      const employeeId = req.user.employee?.id || req.user.id;
      const request = await fieldService.submitStoreRequest(req.body, employeeId, req.files || {}, req);
      res.status(201).json({ success: true, data: request, message: 'New store request submitted for supervisor approval.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'STORE_REQUEST_FAILED', message: err.message } });
    }
  },

  async getStoreRequests(req, res) {
    try {
      const requests = await fieldService.getStoreRequests(req.query);
      res.json({ success: true, data: requests, requests });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async approveStoreRequest(req, res) {
    try {
      const reviewerId = req.user.employee?.id || req.user.id;
      const { requestId } = req.params;
      const result = await fieldService.approveStoreRequest(requestId, req.body, reviewerId, req);
      res.json({ success: true, data: result, message: 'Store request approved and converted to active store.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'APPROVE_STORE_FAILED', message: err.message } });
    }
  },

  async rejectStoreRequest(req, res) {
    try {
      const reviewerId = req.user.employee?.id || req.user.id;
      const { requestId } = req.params;
      const { rejection_reason } = req.body;
      const result = await fieldService.rejectStoreRequest(requestId, rejection_reason, reviewerId, req);
      res.json({ success: true, data: result, message: 'Store request marked as rejected.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'REJECT_STORE_FAILED', message: err.message } });
    }
  },

  async startStoreVisit(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const { store_id, latitude, longitude, visit_purpose, notes } = req.body;
      const visit = await fieldService.startStoreVisit({
        storeId: store_id,
        agentId,
        latitude,
        longitude,
        visitPurpose: visit_purpose,
        notes,
        req
      });
      res.json({ success: true, data: visit, message: 'Store visit started with geofence verification.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'START_VISIT_FAILED', message: err.message } });
    }
  },

  async logFieldActivity(req, res) {
    try {
      const employeeId = req.user.employee?.id || req.user.id;
      const file = req.file || (req.files?.photo ? req.files.photo[0] : null);
      const activity = await fieldService.logFieldActivity(req.body, employeeId, file, req);
      res.status(201).json({ success: true, data: activity, message: 'Field activity logged successfully.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'FIELD_ACTIVITY_FAILED', message: err.message } });
    }
  },

  async logSalesActivity(req, res) {
    try {
      const employeeId = req.user.employee?.id || req.user.id;
      const file = req.file || (req.files?.photo ? req.files.photo[0] : null);
      const activity = await fieldService.logSalesActivity(req.body, employeeId, file, req);
      res.status(201).json({ success: true, data: activity, message: 'Sales activity logged successfully.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'SALES_ACTIVITY_FAILED', message: err.message } });
    }
  },

  async checkInVisit(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const { visit_id, latitude, longitude } = req.body;
      const visit = await fieldService.checkInVisit(visit_id, agentId, latitude, longitude, req);
      res.json({ success: true, data: visit, ...visit, message: 'Geofence verified and visit check-in recorded.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'GEOFENCE_FAILED', message: err.message } });
    }
  },

  async completeVisit(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const { visit_id } = req.body;
      const visit = await fieldService.completeVisit(visit_id, agentId, req.body, req.files || {}, req);
      res.json({ success: true, data: visit, ...visit, message: 'Visit completed and store audit verified.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'VISIT_COMPLETION_FAILED', message: err.message } });
    }
  },

  async triggerSOS(req, res) {
    try {
      const agentId = req.user.employee?.id || req.user.id;
      const { latitude, longitude, accuracy, message } = req.body;
      const sos = await fieldService.triggerSOS(agentId, latitude, longitude, accuracy, message, req);
      res.status(201).json({ success: true, data: sos, ...sos, message: 'Emergency SOS beacon broadcast to all management channels.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'SOS_TRIGGER_FAILED', message: err.message } });
    }
  },

  async getSOS(req, res) {
    try {
      const isMgmt = isManagementUser(req.user);
      const list = await fieldService.getSOS(req.query.status);
      if (!isMgmt) {
        const callerEmpId = req.user.employee?.id || req.user.id;
        const filtered = list.filter(item => String(item.agent_id || item.employee_id) === String(callerEmpId));
        return res.json({ success: true, data: filtered, list: filtered });
      }
      res.json({ success: true, data: list, list });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getSupervisorDashboardMetrics(req, res) {
    try {
      const supervisorId = req.query.supervisor_id || (req.user.role_code === 'SUPERVISOR' ? req.user.employee?.id : null);
      const metrics = await fieldService.getSupervisorDashboardMetrics(supervisorId, req.query.date);
      res.json({ success: true, data: metrics });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getSupervisorTeamTable(req, res) {
    try {
      const supervisorId = req.query.supervisor_id || (req.user.role_code === 'SUPERVISOR' ? req.user.employee?.id : null);
      const team = await fieldService.getSupervisorTeamTable({ ...req.query, supervisor_id: supervisorId });
      res.json({ success: true, data: team, team });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getSupervisorEmployeeProfile(req, res) {
    try {
      const { employeeId } = req.params;
      const profile = await fieldService.getSupervisorEmployeeProfile(employeeId, req.query.date);
      res.json({ success: true, data: profile });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getEmployeeTimeline(req, res) {
    try {
      const { employeeId } = req.params;
      const timeline = await fieldService.getEmployeeTimeline(employeeId, req.query.date);
      res.json({ success: true, data: timeline });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getSupervisorAlerts(req, res) {
    try {
      const supervisorId = req.query.supervisor_id || (req.user.role_code === 'SUPERVISOR' ? req.user.employee?.id : null);
      const alerts = await fieldService.getSupervisorAlerts({ ...req.query, supervisor_id: supervisorId });
      res.json({ success: true, data: alerts, alerts });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async resolveSupervisorAlert(req, res) {
    try {
      const actorId = req.user.employee?.id || req.user.id;
      const { alertId } = req.params;
      const { resolution_notes } = req.body;
      const updated = await fieldService.resolveSupervisorAlert(alertId, resolution_notes, actorId, req);
      res.json({ success: true, data: updated, message: 'Alert resolved successfully.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async overrideAttendance(req, res) {
    try {
      const reviewerId = req.user.employee?.id || req.user.id;
      const { attendance_id, action, clock_out_time, notes } = req.body;
      const updated = await fieldService.overrideAttendance({
        attendanceId: attendance_id,
        action,
        clockOutTime: clock_out_time,
        notes,
        reviewerId,
        req
      });
      res.json({ success: true, data: updated, message: 'Attendance record updated via supervisor approval.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async generateDailyTeamSummary(req, res) {
    try {
      const supervisorId = req.body.supervisor_id || (req.user.role_code === 'SUPERVISOR' ? req.user.employee?.id : null);
      const summary = await fieldService.generateDailyTeamSummary(supervisorId, req.body.date);
      res.json({ success: true, data: summary, message: 'Daily team summary compiled successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getReports(req, res) {
    try {
      const reports = await fieldService.getReports(req.query);
      res.json({ success: true, data: reports, reports });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
};
