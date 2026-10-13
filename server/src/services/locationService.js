// ==============================================================================
// EDGEWFORCE - WORK LOCATION MANAGEMENT & ASSIGNMENT SERVICE
// Multi-Tenant Location Management, Nigerian Geographical Geofences,
// Dynamic Employee Location Assignments, Temporary Workplaces & Audit History
// ==============================================================================

import { db } from '../config/database.js';
import { recordAudit } from '../middleware/auditLogger.js';
import { validateCoordinates } from '../utils/haversine.js';

export const locationService = {
  /**
   * Retrieves all work locations for a specific company with optional filters.
   */
  async getLocations(companyId = 1, filter = {}) {
    const cid = Number(companyId);
    let locations = await db.find('work_locations', { company_id: cid });

    if (filter.status) {
      locations = locations.filter(l => l.status === filter.status);
    }
    if (filter.location_type && filter.location_type !== 'ALL') {
      locations = locations.filter(l => l.location_type === filter.location_type);
    }
    if (filter.state && filter.state !== 'ALL') {
      locations = locations.filter(l => l.state?.toLowerCase() === filter.state.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      locations = locations.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.state?.toLowerCase().includes(q) ||
        l.lga?.toLowerCase().includes(q)
      );
    }

    return locations;
  },

  /**
   * Retrieves a single work location by ID with tenant security check.
   */
  async getLocationById(locationId, companyId = 1) {
    const loc = await db.findById('work_locations', Number(locationId));
    if (!loc || Number(loc.company_id) !== Number(companyId)) {
      throw new Error(`Work location #${locationId} not found or unauthorized.`);
    }
    return loc;
  },

  /**
   * Creates a new work location with geofence parameters.
   */
  async createLocation(data, actor = null, req = null) {
    const {
      company_id,
      name,
      location_type = 'Office',
      address,
      state = 'Lagos',
      lga = '',
      city = '',
      latitude,
      longitude,
      geofence_radius,
      geofence_radius_meters
    } = data;

    if (!name || !name.trim()) {
      throw new Error('Location name is required.');
    }

    const coordCheck = validateCoordinates(latitude, longitude);
    if (!coordCheck.valid) {
      throw new Error(coordCheck.message || 'Valid GPS latitude and longitude are required.');
    }

    const radius = Number(geofence_radius || geofence_radius_meters || 150);
    if (isNaN(radius) || radius < 20 || radius > 10000) {
      throw new Error('Permitted radius must be between 20 meters and 10,000 meters.');
    }

    const cid = Number(actor?.company_id || req?.user?.company_id || company_id || 1);

    const validTypes = [
      'Office', 'Market', 'Store', 'Supermarket', 'Client Location',
      'Warehouse', 'Branch', 'Distributor', 'Event Location', 'Other'
    ];
    const finalType = validTypes.includes(location_type) ? location_type : 'Other';

    const location = await db.insert('work_locations', {
      company_id: cid,
      name: name.trim(),
      location_type: finalType,
      address: address ? address.trim() : `${city || state}, Nigeria`,
      state: state.trim(),
      lga: lga ? lga.trim() : '',
      city: city ? city.trim() : '',
      latitude: coordCheck.latitude,
      longitude: coordCheck.longitude,
      geofence_radius: radius,
      geofence_radius_meters: radius,
      status: 'active',
      created_by: actor?.id || req?.user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await recordAudit(actor, 'WORK_LOCATION_CREATED', 'work_locations', location.id, { name: location.name, state: location.state }, req);
    return location;
  },

  /**
   * Updates an existing work location.
   */
  async updateLocation(locationId, data, actor = null, req = null) {
    const existing = await this.getLocationById(locationId, actor?.company_id || data.company_id || 1);

    const updateFields = {
      updated_at: new Date().toISOString()
    };

    if (data.name) updateFields.name = data.name.trim();
    if (data.location_type) updateFields.location_type = data.location_type;
    if (data.address !== undefined) updateFields.address = data.address;
    if (data.state) updateFields.state = data.state;
    if (data.lga !== undefined) updateFields.lga = data.lga;
    if (data.city !== undefined) updateFields.city = data.city;
    if (data.status) updateFields.status = data.status;

    if (data.latitude !== undefined && data.longitude !== undefined) {
      const coordCheck = validateCoordinates(data.latitude, data.longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.message);
      }
      updateFields.latitude = coordCheck.latitude;
      updateFields.longitude = coordCheck.longitude;
    }

    if (data.geofence_radius || data.geofence_radius_meters) {
      const radius = Number(data.geofence_radius || data.geofence_radius_meters);
      if (isNaN(radius) || radius < 20 || radius > 10000) {
        throw new Error('Permitted radius must be between 20 meters and 10,000 meters.');
      }
      updateFields.geofence_radius = radius;
      updateFields.geofence_radius_meters = radius;
    }

    const updated = await db.update('work_locations', existing.id, updateFields);
    await recordAudit(actor, 'WORK_LOCATION_UPDATED', 'work_locations', updated.id, { changes: updateFields }, req);
    return updated;
  },

  /**
   * Deactivates or removes a work location.
   */
  async deleteLocation(locationId, companyId = 1, actor = null, req = null) {
    const existing = await this.getLocationById(locationId, companyId);

    // Deactivate all employee assignments for this location
    const assignments = await db.find('employee_location_assignments', { location_id: Number(locationId) });
    for (const a of assignments) {
      await this.removeEmployeeLocationAssignment(a.id, companyId, actor, 'Work location deactivated', req);
    }

    await db.update('work_locations', existing.id, { status: 'inactive' });
    await recordAudit(actor, 'WORK_LOCATION_DEACTIVATED', 'work_locations', existing.id, { name: existing.name }, req);

    return { success: true, message: `Location "${existing.name}" deactivated successfully.` };
  },

  /**
   * Assigns a work location to an employee (Primary, Secondary, Temporary, or Manual).
   */
  async assignEmployeeLocation(data, actor = null, req = null) {
    const {
      company_id,
      employee_id,
      location_id,
      assignment_type = 'primary', // 'primary' | 'secondary' | 'temporary' | 'permanent'
      is_primary = false,
      start_date = null,
      end_date = null,
      reason = 'Administrative Location Assignment'
    } = data;

    if (!employee_id) throw new Error('Employee ID is required for location assignment.');
    if (!location_id) throw new Error('Work Location ID is required for assignment.');

    const cid = Number(actor?.company_id || req?.user?.company_id || company_id || 1);

    const employee = await db.findById('employees', Number(employee_id));
    if (!employee || Number(employee.company_id) !== cid) {
      throw new Error('Employee not found or belongs to another company.');
    }

    const location = await this.getLocationById(location_id, cid);
    if (location.status !== 'active') throw new Error('Choose an active work location.');
    if (!['primary', 'secondary', 'temporary', 'permanent'].includes(assignment_type)) throw new Error('Invalid assignment type.');

    const isTemporary = assignment_type === 'temporary';
    const isPrimary = !isTemporary && Boolean(is_primary || assignment_type === 'primary' || assignment_type === 'permanent');

    if (isTemporary && (!start_date || !end_date)) {
      throw new Error('Temporary assignments require start date and end date.');
    }

    if (isTemporary && new Date(start_date) > new Date(end_date)) {
      throw new Error('Temporary assignment start date cannot be after end date.');
    }

    const dateBound = (value, end = false) => {
      if (!value) return null;
      const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + (end ? 'T23:59:59.999+01:00' : 'T00:00:00+01:00') : value;
      const date = new Date(text);
      if (!Number.isFinite(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0,10) !== value)) throw new Error('Provide valid assignment dates.');
      return date.toISOString();
    };
    const startsAt = isTemporary ? dateBound(start_date) : null;
    const endsAt = isTemporary ? dateBound(end_date, true) : null;
    if (isTemporary && startsAt > endsAt) throw new Error('Temporary assignment start date cannot be after end date.');
    if (db.isCloud) {
      const assignment = await db.rpc('assign_employee_workplace', { p_company_id: cid, p_employee_id: Number(employee_id), p_location_id: Number(location_id), p_type: isTemporary ? 'temporary' : isPrimary ? 'primary' : 'secondary', p_start: startsAt, p_end: endsAt, p_actor_id: actor?.id || null, p_actor_name: actor?.full_name || 'HR Administrator', p_reason: reason });
      return { assignment, location, employee: { id: employee.id, name: employee.full_name || employee.first_name + ' ' + employee.last_name } };
    }
    return db.transaction(async () => {
    if ((await this.getLocationById(location_id, cid)).status !== 'active') throw new Error('Choose an active work location.');
    // Check if assignment for this location already exists
    const existing = await db.findOne('employee_location_assignments', {
      employee_id: Number(employee_id),
      location_id: Number(location_id),
      company_id: cid
    });

    let assignmentRecord;
    let previousLocationName = null;
    let previousLocationId = null;

    // Look up previous primary assignment for history log
    const prevPrimary = await db.findOne('employee_location_assignments', {
      employee_id: Number(employee_id),
      company_id: cid, is_primary: true, is_active: true
    });
    if (prevPrimary && prevPrimary.location_id !== Number(location_id)) {
      previousLocationId = prevPrimary.location_id;
      const prevLoc = await db.findById('work_locations', prevPrimary.location_id);
      previousLocationName = prevLoc?.name || null;
    }

    if (isPrimary) {
      const current = await db.find('employee_location_assignments', { employee_id: Number(employee_id), company_id: cid, is_primary: true });
      for (const old of current) await db.update('employee_location_assignments', old.id, { is_primary: false, is_active: false, updated_at: new Date().toISOString() });
    }
    if (existing) {
      assignmentRecord = await db.update('employee_location_assignments', existing.id, {
        assignment_type: isTemporary ? 'temporary' : (isPrimary ? 'primary' : 'secondary'),
        is_primary: isPrimary,
        is_active: true,
        start_date: startsAt,
        end_date: endsAt,
        assigned_by: actor?.id || req?.user?.id || null,
        updated_at: new Date().toISOString()
      });
    } else {
      assignmentRecord = await db.insert('employee_location_assignments', {
        company_id: cid,
        employee_id: Number(employee_id),
        location_id: Number(location_id),
        assignment_type: isTemporary ? 'temporary' : (isPrimary ? 'primary' : 'secondary'),
        is_primary: isPrimary,
        is_active: true,
        start_date: startsAt,
        end_date: endsAt,
        assigned_by: actor?.id || req?.user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    if (isPrimary || existing?.is_primary) await db.update('employees', employee.id, { work_location: isPrimary ? location.name : '' });

    // Record audit history
    await db.insert('location_assignment_history', {
      company_id: cid,
      employee_id: Number(employee_id),
      previous_location_id: previousLocationId,
      previous_location_name: previousLocationName,
      new_location_id: location.id,
      new_location_name: location.name,
      assignment_type: assignmentRecord.assignment_type,
      action: isTemporary ? 'TEMPORARY_ASSIGNED' : 'ASSIGNED',
      changed_by: actor?.id || req?.user?.id || null,
      changed_by_name: actor?.full_name || req?.user?.full_name || 'HR Administrator',
      reason,
      created_at: new Date().toISOString()
    });

    await recordAudit(actor, 'EMPLOYEE_LOCATION_ASSIGNED', 'employee_location_assignments', assignmentRecord.id, {
      employee_name: `${employee.first_name} ${employee.last_name}`,
      location_name: location.name,
      assignment_type: assignmentRecord.assignment_type,
      is_primary: isPrimary,
      reason
    }, req);

    return {
      assignment: assignmentRecord,
      location,
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`
      }
    };
    });
  },

  /**
   * Removes an employee location assignment.
   */
  async removeEmployeeLocationAssignment(assignmentId, companyId = 1, actor = null, reason = 'Assignment Terminated', req = null) {
    return db.transaction(() => this.performRemoveEmployeeLocationAssignment(assignmentId, companyId, actor, reason, req));
  },

  async performRemoveEmployeeLocationAssignment(assignmentId, companyId = 1, actor = null, reason = 'Assignment Terminated', req = null) {
    const assignment = await db.findById('employee_location_assignments', Number(assignmentId));
    if (!assignment || Number(assignment.company_id) !== Number(companyId)) {
      throw new Error('Assignment record not found or unauthorized.');
    }

    const location = await db.findById('work_locations', assignment.location_id);
    const employee = await db.findById('employees', assignment.employee_id);

    if (db.isCloud) {
      await db.rpc('remove_employee_workplace', { p_company_id: Number(companyId), p_assignment_id: assignment.id, p_actor_id: actor?.id || null, p_actor_name: actor?.full_name || 'HR Administrator', p_reason: reason });
      return { success: true, message: 'Location assignment removed successfully.' };
    }
    await db.update('employee_location_assignments', assignment.id, {
      is_active: false, is_primary: false,
      updated_at: new Date().toISOString()
    });

    if (assignment.is_primary) await db.update('employees', assignment.employee_id, { work_location: '' });
    await db.insert('location_assignment_history', {
      company_id: Number(companyId),
      employee_id: assignment.employee_id,
      previous_location_id: assignment.location_id,
      previous_location_name: location?.name || 'Assigned Location',
      new_location_id: null,
      new_location_name: null,
      assignment_type: assignment.assignment_type,
      action: 'REMOVED',
      changed_by: actor?.id || req?.user?.id || null,
      changed_by_name: actor?.full_name || req?.user?.full_name || 'HR Administrator',
      reason,
      created_at: new Date().toISOString()
    });

    await recordAudit(actor, 'EMPLOYEE_LOCATION_REMOVED', 'employee_location_assignments', assignment.id, {
      employee_name: employee ? `${employee.first_name} ${employee.last_name}` : `Emp #${assignment.employee_id}`,
      location_name: location?.name || null,
      reason
    }, req);

    return { success: true, message: 'Location assignment removed successfully.' };
  },

  /**
   * Retrieves all assigned locations for an employee with live status indicators.
   */
  async getEmployeeLocations(employeeId, companyId = 1) {
    const empId = Number(employeeId);
    const cid = Number(companyId);

    const assignments = await db.find('employee_location_assignments', {
      employee_id: empId,
      company_id: cid,
      is_active: true
    });

    const allLocations = await db.find('work_locations', { company_id: cid });
    const now = new Date();

    const populated = assignments.map(a => {
      const loc = allLocations.find(l => Number(l.id) === Number(a.location_id)) || null;
      let isTempActive = true;

      if (a.assignment_type === 'temporary') {
        const start = a.start_date ? new Date(a.start_date) : null;
        const end = a.end_date ? new Date(a.end_date) : null;
        if (start && now < start) isTempActive = false;
        if (end && now > end) isTempActive = false;
      }

      return {
        assignment_id: a.id,
        assignment_type: a.assignment_type,
        is_primary: a.is_primary,
        is_active: a.is_active,
        is_temporary_active: isTempActive,
        start_date: a.start_date,
        end_date: a.end_date,
        location: loc
      };
    }).filter(p => p.location?.status === 'active');

    const primaryAssignment = populated.find(p => p.is_primary) || null;
    const allowedSecondary = populated.filter(p => !p.is_primary && p.assignment_type !== 'temporary');
    const temporaryAssignments = populated.filter(p => p.assignment_type === 'temporary');

    // Retrieve audit history
    const history = await db.find('location_assignment_history', {
      employee_id: empId,
      company_id: cid
    }, { order: { column: 'created_at', ascending: false }, limit: 20 });

    return {
      employee_id: empId,
      has_assigned_location: populated.some(p => p.is_temporary_active),
      primary_location: primaryAssignment ? primaryAssignment.location : null,
      primary_assignment: primaryAssignment,
      allowed_locations: allowedSecondary.map(s => ({ ...s.location, assignment_id: s.assignment_id })),
      temporary_locations: temporaryAssignments.map(t => ({
        ...t.location,
        assignment_id: t.assignment_id,
        is_active_now: t.is_temporary_active,
        start_date: t.start_date,
        end_date: t.end_date
      })),
      all_active_locations: populated.filter(p => p.is_temporary_active).map(p => p.location),
      history
    };
  },

  /**
   * Retrieves active assigned locations strictly permitted for check-in right now.
   */
  async getActivePermittedLocations(employeeId, companyId = 1) {
    const details = await this.getEmployeeLocations(employeeId, companyId);
    return details.all_active_locations || [];
  },

  /**
   * Summary overview of location statuses for all employees in a company.
   */
  async getEmployeeLocationStatusSummary(companyId = 1) {
    const cid = Number(companyId);
    const employees = await db.find('employees', { company_id: cid });
    const assignments = await db.find('employee_location_assignments', { company_id: cid, is_active: true });
    const workLocations = await db.find('work_locations', { company_id: cid });
    const users = await db.find('users', { company_id: cid });

    const now = new Date();

    return employees.map(emp => {
      const empAssignments = assignments.filter(a => Number(a.employee_id) === Number(emp.id) && workLocations.some(l => Number(l.id) === Number(a.location_id) && l.status === 'active') && (a.assignment_type !== 'temporary' || ((!a.start_date || now >= new Date(a.start_date)) && (!a.end_date || now <= new Date(a.end_date)))));
      const user = users.find(u => Number(u.id) === Number(emp.user_id));

      const primary = empAssignments.find(a => a.is_primary);
      const activeTemp = empAssignments.find(a => {
        if (a.assignment_type !== 'temporary') return false;
        const s = a.start_date ? new Date(a.start_date) : null;
        const e = a.end_date ? new Date(a.end_date) : null;
        return (!s || now >= s) && (!e || now <= e);
      });

      let assignedLoc = null;
      let status = 'Not Assigned'; // 'Assigned' | 'Temporary Active' | 'Not Assigned' | 'Requires Review'

      if (activeTemp) {
        assignedLoc = workLocations.find(l => Number(l.id) === Number(activeTemp.location_id));
        status = 'Temporary Active';
      } else if (primary) {
        assignedLoc = workLocations.find(l => Number(l.id) === Number(primary.location_id));
        status = 'Assigned';
      } else if (empAssignments.length > 0) {
        assignedLoc = workLocations.find(l => Number(l.id) === Number(empAssignments[0].location_id));
        status = 'Assigned';
      }

      return {
        id: emp.id,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`,
        first_name: emp.first_name,
        last_name: emp.last_name,
        role: emp.position || 'Staff',
        department: emp.department || 'Operations',
        state: emp.state || assignedLoc?.state || 'Nigeria',
        territory: emp.territory,
        status,
        has_location: assignedLoc !== null,
        assigned_location: assignedLoc ? {
          id: assignedLoc.id,
          name: assignedLoc.name,
          location_type: assignedLoc.location_type,
          state: assignedLoc.state,
          lga: assignedLoc.lga,
          city: assignedLoc.city,
          latitude: assignedLoc.latitude,
          longitude: assignedLoc.longitude,
          geofence_radius: assignedLoc.geofence_radius || assignedLoc.geofence_radius_meters || 150
        } : null,
        total_assigned_locations: empAssignments.length
      };
    });
  }
};
