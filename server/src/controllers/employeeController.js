// ==============================================================================
// EDGEWFORCE - EMPLOYEE SELF-SERVICE CONTROLLER
// ==============================================================================

import { employeeService } from '../services/employeeService.js';

export const employeeController = {
  async getDashboard(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const data = await employeeService.getDashboard(empId);
      res.json({ success: true, data, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getProfile(req, res) {
    try {
      const profile = await employeeService.getProfile(req.user.id);
      res.json({ success: true, data: profile, profile });
    } catch (err) {
      res.status(404).json({ success: false, error: { message: err.message } });
    }
  },

  async getAttendance(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const data = await employeeService.getAttendance(empId);
      res.json({ success: true, data: data.records, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async clockAttendance(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const record = await employeeService.clockAttendance(empId, req.body, req);
      res.json({ success: true, data: record, ...record, message: record.clock_out_time ? 'Clocked out successfully.' : 'Clocked in successfully.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CLOCK_FAILED', message: err.message } });
    }
  },

  async verifyFaceBiometric(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const result = await employeeService.verifyFaceBiometric(empId, req.body, req);
      res.json({ success: true, data: result, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'BIOMETRIC_FAILED', message: err.message } });
    }
  },

  async getLeaveBalances(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const balances = await employeeService.getLeaveBalances(empId);
      res.json({ success: true, data: balances, ...balances });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async applyLeave(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const request = await employeeService.applyLeave(empId, req.body, req);
      res.status(201).json({ success: true, data: request, ...request, message: 'Leave application submitted.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'LEAVE_APPLICATION_FAILED', message: err.message } });
    }
  },

  async getLeaveRequests(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const requests = await employeeService.getLeaveRequests(empId);
      res.json({ success: true, data: requests, requests });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getLatestPayslip(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const payslip = await employeeService.getLatestPayslip(empId);
      res.json({ success: true, data: payslip, ...payslip });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getPayslips(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const payslips = await employeeService.getPayslips(empId);
      res.json({ success: true, data: payslips, payslips });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getOKRs(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const okrs = await employeeService.getOKRs(empId);
      res.json({ success: true, data: okrs, okrs });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async updateOKR(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const okr = await employeeService.updateOKR(req.params.id, empId, req.body);
      res.json({ success: true, data: okr, ...okr });
    } catch (err) {
      const status = err.statusCode || (err.message.includes('Access denied') ? 403 : 400);
      res.status(status).json({ success: false, error: { code: status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: err.message } });
    }
  },

  async getTasks(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const tasks = await employeeService.getTasks(empId);
      res.json({ success: true, data: tasks, tasks });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async updateTask(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const task = await employeeService.updateTaskStatus(req.params.id, empId, req.body);
      res.json({ success: true, data: task, ...task });
    } catch (err) {
      const status = err.statusCode || (err.message.includes('Access denied') ? 403 : 400);
      res.status(status).json({ success: false, error: { code: status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: err.message } });
    }
  },

  async logIdleEvent(req, res) {
    try {
      const empId = req.user.employee?.id || req.user.id;
      const alert = await employeeService.logIdleEvent(empId, req.body, req);
      res.status(201).json({ success: true, data: alert, ...alert, message: 'Inactivity explanation logged.' });
    } catch (err) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  },

  async getAnnouncements(req, res) {
    try {
      const list = await employeeService.getAnnouncements(req.user);
      res.json({ success: true, data: list, announcements: list });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  },

  async getUpcomingBirthdays(req, res) {
    try {
      const list = await employeeService.getUpcomingBirthdays(req.user);
      res.json({ success: true, data: list, birthdays: list });
    } catch (err) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }
};

