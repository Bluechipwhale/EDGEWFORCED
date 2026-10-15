// ==============================================================================
// EDGEWFORCE - EMPLOYEE INACTIVITY TELEMETRY & IDLE MONITOR SERVICE
// Detects 10-minute workstation idle events, notifies IT and HR immediately,
// and records employee operational explanations.
// ==============================================================================

import { db } from '../config/database.js';
import { recordAudit } from '../middleware/auditLogger.js';
import { emailService } from './emailService.js';
import { logger } from '../utils/logger.js';
import { activityService } from './activityService.js';

export const idleService = {
  /**
   * Logs a 10-minute inactivity event and triggers immediate IT + HR telemetry alerts.
   */
  async startIdleSession(data, actor = null, req = null) {
    const {
      employee_id,
      user_id,
      started_at,
      duration_seconds = 600,
      reason = null,
      explanation = null,
      workstation_snapshot = {}
    } = data;

    const { user, employee } = await activityService.identity(actor);
    if (!employee) throw Object.assign(new Error('A linked active staff profile is required.'), { status: 403 });
    if ((employee_id && Number(employee_id) !== Number(employee.id)) || (user_id && Number(user_id) !== Number(user.id))) throw Object.assign(new Error('You can only report your own activity.'), { status: 403 });
    if (!Number.isFinite(Number(duration_seconds)) || Number(duration_seconds) < 600 || Number(duration_seconds) > 86400) throw new Error('Idle duration must be between 10 minutes and 24 hours.');
    if (started_at && (!Number.isFinite(Date.parse(started_at)) || Date.parse(started_at) > Date.now() || Date.parse(started_at) < Date.now() - 86400000)) throw new Error('Invalid inactivity start time.');
    if (String(reason || '').length > 100 || String(explanation || '').length > 2000) throw new Error('Activity explanation is too long.');

    const empName = employee ? `${employee.first_name} ${employee.last_name}` : (user?.full_name || 'Staff Member');
    const dept = employee?.department || 'Operations';

    const session = await db.insert('employee_idle_sessions', {
      company_id: Number(actor?.company_id || employee?.company_id || 1),
      employee_id: employee?.id ? Number(employee.id) : null,
      user_id: user?.id ? Number(user.id) : null,
      idle_started_at: started_at || new Date(Date.now() - 600000).toISOString(),
      detected_at: new Date().toISOString(),
      duration_seconds: Number(duration_seconds || 600),
      reason: reason || 'Awaiting Explanation',
      reason_details: explanation || 'Workstation telemetry noted 10m+ inactivity',
      status: reason && reason !== 'Awaiting Explanation' ? 'explained' : 'pending',
      reported_to_it_at: new Date().toISOString(),
      reported_to_hr_at: new Date().toISOString(),
      workstation_snapshot: workstation_snapshot || {},
      created_at: new Date().toISOString()
    });

    // Also populate legacy idle_alerts table for backward compatibility
    await db.insert('idle_alerts', {
      company_id: session.company_id,
      employee_id: employee?.id ? Number(employee.id) : null,
      started_at: session.idle_started_at,
      ended_at: new Date().toISOString(),
      duration_seconds: session.duration_seconds,
      reason: session.reason,
      explanation: session.reason_details,
      resolved: session.status === 'explained'
    });

    // 1. Alert IT Administrators
    const companyUsers = await db.find('users', { company_id: session.company_id, status: 'active' });
    const itUsers = companyUsers.filter(u => ['SUPER_ADMIN', 'IT_ADMIN'].includes(String(u.role_code).toUpperCase()));
    for (const it of itUsers) {
      const itEmp = await db.findOne('employees', { user_id: it.id });
      if (itEmp?.id) {
        await db.insert('notifications', {
          employee_id: itEmp.id,
          company_id: session.company_id,
          type: 'System',
          title: `Workstation Inactivity Alert: ${empName}`,
          body: `${empName} (${dept}) has been inactive for ${Math.round(session.duration_seconds / 60)} mins. Telemetry recorded.`,
          link: '/system/telemetry'
        });
      }
      if (it.email) {
        emailService.sendIdleAlertEmail(it.email, session, empName, dept).catch(() => {});
      }
    }

    // 2. Alert HR Command Center
    const hrUsers = companyUsers.filter(u => ['HR', 'HR_MANAGER'].includes(String(u.role_code).toUpperCase()));
    for (const hr of hrUsers) {
      const hrEmp = await db.findOne('employees', { user_id: hr.id });
      if (hrEmp?.id) {
        await db.insert('notifications', {
          employee_id: hrEmp.id,
          company_id: session.company_id,
          type: 'HR',
          title: `Employee Inactivity Log: ${empName}`,
          body: `${empName} (${dept}) idle for ${Math.round(session.duration_seconds / 60)} mins. Awaiting staff confirmation.`,
          link: '/hr/workforce'
        });
      }
    }

    await recordAudit(actor || user, 'EMPLOYEE_IDLE_DETECTED', 'employee_idle_sessions', session.id, {
      duration_seconds,
      employee_name: empName,
      department: dept
    }, req);

    logger.info(`[IDLE TELEMETRY] Logged 10m inactivity for ${empName} (${dept}). IT and HR alerted.`);
    return session;
  },

  /**
   * Submits employee explanation for the idle session.
   */
  async explainIdleSession(sessionId, data, actor = null, req = null) {
    const { reason, reason_details } = data;
    await activityService.identity(actor);
    const session = await db.findById('employee_idle_sessions', sessionId);
    if (!session || Number(session.company_id) !== Number(actor.company_id)) throw Object.assign(new Error('Activity event not found.'), { status: 404 });
    if (Number(session.user_id) !== Number(actor.id)) throw Object.assign(new Error('You can only explain your own activity.'), { status: 403 });
    if (!reason || String(reason).length > 100 || String(reason_details || '').length > 2000) throw new Error('Invalid activity explanation.');

    const updated = await db.update('employee_idle_sessions', session.id, {
      reason: reason || 'Break',
      reason_details: reason_details || reason || 'Employee provided explanation',
      status: 'explained'
    });

    // Also update legacy table
    const legacy = await db.findOne('idle_alerts', { company_id: session.company_id, employee_id: session.employee_id, started_at: session.idle_started_at });
    if (legacy) {
      await db.update('idle_alerts', legacy.id, {
        reason: updated.reason,
        explanation: updated.reason_details,
        resolved: true
      });
    }

    await recordAudit(actor, 'IDLE_REASON_SUBMITTED', 'employee_idle_sessions', session.id, {
      reason: updated.reason,
      details: updated.reason_details
    }, req);

    return updated;
  },

  /**
   * Retrieves idle telemetry sessions for IT & HR review.
   */
  async getIdleSessions(filters = {}, actor = null) {
    const { user } = await activityService.identity(actor);
    const scope = { company_id: Number(user.company_id), ...(!activityService.canReview(user) ? { user_id: Number(user.id) } : {}) };
    const all = await db.find('employee_idle_sessions', scope, { order: { column: 'detected_at', ascending: false }, limit: 100 });
    const employees = await db.find('employees', { company_id: Number(actor.company_id) });

    return all.map(s => {
      const emp = employees.find(e => Number(e.id) === Number(s.employee_id));
      return {
        ...s,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Staff Member',
        department: emp?.department || 'Operations',
        employee_code: emp?.employee_code || 'EMP-000'
      };
    });
  },

  /**
   * Aggregates activity analytics for HR and Executive views.
   */
  async getIdleAnalytics(actor = null) {
    const sessions = await this.getIdleSessions({}, actor);
    const total = sessions.length;
    const explained = sessions.filter(s => s.status === 'explained').length;
    const pending = sessions.filter(s => s.status === 'pending').length;

    const reasons = {};
    sessions.forEach(s => {
      const r = s.reason || 'Other';
      reasons[r] = (reasons[r] || 0) + 1;
    });

    const totalSeconds = sessions.reduce((sum, s) => sum + Number(s.duration_seconds || 600), 0);
    const avgDurationMins = total > 0 ? Math.round(totalSeconds / total / 60) : 10;

    return {
      total_idle_events: total,
      explained_count: explained,
      pending_count: pending,
      average_duration_minutes: avgDurationMins,
      top_reasons: reasons
    };
  }
};
