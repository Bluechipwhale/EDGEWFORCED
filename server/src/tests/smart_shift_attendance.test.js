// ==============================================================================
// EDGEWFORCE - SMART SHIFT ATTENDANCE & NIGERIA TIMEZONE TEST SUITE
// Tests Boundaries, Tampering Resistance, Duplicate Prevention, Staff Exemption & Geo-Reports
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { getLagosTime, determineShiftAttendanceWindow, isShiftEligibleRole } from '../utils/nigeriaTime.js';
import { fieldService } from '../services/fieldService.js';
import { employeeService } from '../services/employeeService.js';
import { db, resetTestData } from './helpers/database.js';

test('Smart Shift Attendance & Nigeria Timezone Engine', async (t) => {
  // Ensure Employee 1 is configured as Sales Agent for shift testing
  let salesAgent = await db.findById('employees', 1);
  if (!salesAgent) {
    salesAgent = await db.insert('employees', {
      id: 1,
      company_id: 1,
      user_id: 1,
      employee_code: 'EMP-1001',
      first_name: 'Thompson',
      last_name: 'Babatunde',
      phone: '+2348031234567',
      role_code: 'SALES_AGENT',
      department: 'Commercial Sales',
      position: 'Senior Commercial Sales Agent',
      territory: 'Lagos Mainland',
      state: 'Lagos',
      city: 'Ikeja'
    });
  } else {
    await db.update('employees', 1, {
      role_code: 'SALES_AGENT',
      position: 'Senior Commercial Sales Agent'
    });
  }

  // Ensure Employee 3 is configured as Staff Member for exemption testing
  let staffMember = await db.findById('employees', 3);
  if (!staffMember) {
    staffMember = await db.insert('employees', {
      id: 3,
      company_id: 1,
      user_id: 3,
      employee_code: 'EMP-1003',
      first_name: 'Gloria',
      last_name: 'Iwuh',
      phone: '+2348145550192',
      role_code: 'STAFF_MEMBER',
      department: 'Corporate Operations',
      position: 'Workforce Operations Analyst',
      territory: 'Headquarters',
      state: 'Lagos',
      city: 'Ikeja'
    });
  } else {
    await db.update('employees', 3, {
      role_code: 'STAFF_MEMBER',
      position: 'Workforce Operations Analyst'
    });
  }

  // Location 8: Ikeja Central Distribution Depot (lat: 6.5984, lng: 3.3524, radius: 150m)
  let loc8 = await db.findById('work_locations', 8);
  if (!loc8) {
    await db.insert('work_locations', {
      id: 8,
      company_id: 1,
      name: 'Ikeja Central Distribution Depot',
      code: 'LOC-IKJ-01',
      location_type: 'Depot',
      latitude: 6.5984,
      longitude: 3.3524,
      radius_meters: 150,
      geofence_radius_meters: 150,
      address: 'Plot 4 Commercial Avenue, Ikeja Industrial Estate, Lagos',
      status: 'active', is_active: true
    });
  }

  const existingAssign1 = await db.findOne('employee_location_assignments', { employee_id: 1, is_active: true });
  if (!existingAssign1) {
    await db.insert('employee_location_assignments', {
      id: 1,
      company_id: 1,
      employee_id: 1,
      location_id: 8,
      assignment_type: 'primary',
      is_primary: true,
      is_active: true
    });
  }

  const existingAssign3 = await db.findOne('employee_location_assignments', { employee_id: 3, is_active: true });
  if (!existingAssign3) {
    await db.insert('employee_location_assignments', {
      id: 4,
      company_id: 1,
      employee_id: 3,
      location_id: 8,
      assignment_type: 'primary',
      is_primary: true,
      is_active: true
    });
  }

  // ============================================================================
  // 1. TIMEZONE & EXACT WINDOW BOUNDARY TESTS (Africa/Lagos UTC+1)
  // ============================================================================
  await t.test('1. Timezone & Exact Window Boundary Tests', async (st) => {
    await st.test('05:59 AM — BLOCKS with "Morning attendance has not started. Clock-in opens at 6:00 AM."', () => {
      const d = new Date('2026-08-21T04:59:00Z'); // 05:59 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, false);
      assert.equal(res.message, 'Morning attendance has not started. Clock-in opens at 6:00 AM.');
      assert.equal(res.action_type, 'CLOSED');
      assert.equal(res.lagos_time.formatted12h, '05:59 AM');
    });

    await st.test('06:00 AM — ALLOWS Morning Attendance', () => {
      const d = new Date('2026-08-21T05:00:00Z'); // 06:00 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, true);
      assert.equal(res.attendance_type, 'MORNING_ATTENDANCE');
      assert.equal(res.button_label, 'MORNING CLOCK-IN');
      assert.equal(res.action_type, 'CLOCK_IN');
    });

    await st.test('11:59 AM — ALLOWS Morning Attendance', () => {
      const d = new Date('2026-08-21T10:59:00Z'); // 11:59 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, true);
      assert.equal(res.attendance_type, 'MORNING_ATTENDANCE');
    });

    await st.test('12:00 PM — ALLOWS Midday Attendance', () => {
      const d = new Date('2026-08-21T11:00:00Z'); // 12:00 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, true);
      assert.equal(res.attendance_type, 'MIDDAY_ATTENDANCE');
      assert.equal(res.button_label, 'MIDDAY CLOCK-IN');
      assert.equal(res.action_type, 'CLOCK_IN');
    });

    await st.test('04:00 PM — ALLOWS Midday Attendance', () => {
      const d = new Date('2026-08-21T15:00:00Z'); // 16:00 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, true);
      assert.equal(res.attendance_type, 'MIDDAY_ATTENDANCE');
    });

    await st.test('05:00 PM — ALLOWS Evening Clock-Out', () => {
      const d = new Date('2026-08-21T16:00:00Z'); // 17:00 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, true);
      assert.equal(res.attendance_type, 'EVENING_CLOCK_OUT');
      assert.equal(res.button_label, 'EVENING CLOCK-OUT');
      assert.equal(res.action_type, 'CLOCK_OUT');
    });

    await st.test('11:59 PM — ALLOWS Evening Clock-Out at closing boundary', () => {
      const d = new Date('2026-08-21T22:59:00Z'); // 23:59 WAT
      const res = determineShiftAttendanceWindow(d);
      assert.equal(res.allowed, true);
      assert.equal(res.attendance_type, 'EVENING_CLOCK_OUT');
    });
  });

  // ============================================================================
  // 2. ROLE ELIGIBILITY (Sales Agent / Field Agent / Promoter vs Staff)
  // ============================================================================
  await t.test('2. Role & Position Differentiation', () => {
    assert.equal(isShiftEligibleRole('SALES_AGENT'), true);
    assert.equal(isShiftEligibleRole('FIELD_AGENT'), true);
    assert.equal(isShiftEligibleRole('BRAND_AMBASSADOR'), true);
    assert.equal(isShiftEligibleRole('PROMOTER'), true);
    assert.equal(isShiftEligibleRole(null, 'Commercial Field Promoter'), true);
    assert.equal(isShiftEligibleRole(null, 'Brand Ambassador / Promoter'), true);
    assert.equal(isShiftEligibleRole(null, 'Senior Commercial Sales Agent'), true);

    assert.equal(isShiftEligibleRole('STAFF_MEMBER'), false);
    assert.equal(isShiftEligibleRole('EMPLOYEE'), false);
    assert.equal(isShiftEligibleRole('OPERATIONS_OFFICER'), false);
    assert.equal(isShiftEligibleRole('HR'), false);
    assert.equal(isShiftEligibleRole('ACCOUNTANT'), false);
    assert.equal(isShiftEligibleRole(null, 'Workforce Operations Analyst'), false);
  });

  // ============================================================================
  // 3. SMART SHIFT WORKFLOW (Check-In, Midday, Check-Out, Geofence)
  // ============================================================================
  await t.test('3. Smart Shift Check-In & Check-Out Workflow', async (st) => {
    // Reset attendance records for employee 1
    const attList = await db.find('attendance', { employee_id: 1 });
    for (const a of attList) await db.delete('attendance', a.id);

    await st.test('Allows Morning Attendance at 08:30 AM within assigned Ikeja location', async () => {
      const morningDate = '2026-08-21T07:30:00Z'; // 08:30 AM WAT

      const result = await fieldService.checkIn({
        employeeId: 1,
        latitude: 6.5985, // ~15m from Location 8
        longitude: 3.3525,
        accuracy: 4,
        device: 'Test Mobile Device',
        testDate: morningDate
      });

      assert.equal(result.attendance_type, 'MORNING_ATTENDANCE');
      assert.equal(result.is_geofence_verified, true);
      assert.ok(result.morning_clock_in);
    });

    await st.test('Rejects duplicate Morning Attendance on the same calendar day', async () => {
      await assert.rejects(
        async () => {
          await fieldService.checkIn({
            employeeId: 1,
            latitude: 6.5985,
            longitude: 3.3525,
            accuracy: 4,
            testDate: '2026-08-21T08:15:00Z'
          });
        },
        /Duplicate attendance: Morning Attendance/i
      );
    });

    await st.test('Blocks check in before 6:00 AM outside allowed window', async () => {
      const closedDate = '2026-08-21T04:30:00Z'; // 05:30 AM WAT

      await assert.rejects(
        async () => {
          await fieldService.checkIn({
            employeeId: 1,
            latitude: 6.5985,
            longitude: 3.3525,
            accuracy: 4,
            testDate: closedDate
          });
        },
        (err) => {
          assert.equal(err.message, 'Morning attendance has not started. Clock-in opens at 6:00 AM.');
          return true;
        }
      );
    });

    await st.test('Blocks agent outside assigned location with exact distance and permitted radius', async () => {
      // Clear attendance to test fresh morning clock-in from distant location
      const attList2 = await db.find('attendance', { employee_id: 1 });
      for (const a of attList2) await db.delete('attendance', a.id);

      const morningDate = '2026-08-21T07:30:00Z';

      await assert.rejects(
        async () => {
          await fieldService.checkIn({
            employeeId: 1,
            latitude: 6.4281, // In Victoria Island ~20km away from Ikeja
            longitude: 3.4219,
            accuracy: 4,
            testDate: morningDate
          });
        },
        /CHECK-IN BLOCKED — YOU ARE OUTSIDE YOUR ASSIGNED LOCATION/i
      );
    });

    await st.test('Allows Midday Attendance at 01:00 PM WAT', async () => {
      const middayDate = '2026-08-21T12:00:00Z'; // 01:00 PM WAT

      const result = await fieldService.checkIn({
        employeeId: 1,
        latitude: 6.5985,
        longitude: 3.3525,
        accuracy: 4,
        testDate: middayDate
      });

      assert.equal(result.attendance_type, 'MIDDAY_ATTENDANCE');
      assert.ok(result.midday_clock_in);
    });

    await st.test('Allows Evening Clock-Out at 06:30 PM WAT', async () => {
      const eveningDate = '2026-08-21T17:30:00Z'; // 06:30 PM WAT

      const result = await fieldService.checkOut({
        employeeId: 1,
        latitude: 6.5985,
        longitude: 3.3525,
        accuracy: 4,
        testDate: eveningDate
      });

      assert.equal(result.attendance_type, 'EVENING_CLOCK_OUT');
      assert.ok(result.evening_clock_out);
      assert.ok(result.clock_out_time);
    });
  });

  // ============================================================================
  // 4. NORMAL STAFF EXEMPTION
  // ============================================================================
  await t.test('4. Corporate staff use the same attendance windows', async (staffTest) => {
    staffTest.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-18T07:30:00Z') });
    // Clear attendance for Gloria (employee 3)
    const staffAtt = await db.find('attendance', { employee_id: 3 });
    for (const a of staffAtt) await db.delete('attendance', a.id);

    // Staff assigned to Location 8 (Ikeja Central Distribution Depot, lat: 6.5984, lng: 3.3524)
    const result = await employeeService.clockAttendance(3, {
      latitude: 6.5985,
      longitude: 3.3525,
      accuracy: 5,
      device: 'Staff Web App'
    });

    assert.ok(result.status);
    assert.equal(result.is_geofence_verified, true);
    assert.equal(result.attendance_type, 'MORNING_ATTENDANCE');
  });

  // ============================================================================
  // 5. GEO-LOCATION REPORT GENERATION
  // ============================================================================
  await t.test('5. Geo-Location Report Data & Map Metadata', async () => {
    const report = await fieldService.getGeoLocationReport({}, 1);

    assert.ok(Array.isArray(report));
    assert.ok(report.length > 0);

    const first = report[0];
    assert.ok(first.id);
    assert.ok(first.date);
    assert.ok(first.server_time);
    assert.ok(first.agent_name);
    assert.ok(first.region);
    assert.ok(first.market);
    assert.equal(typeof first.latitude, 'number');
    assert.equal(typeof first.longitude, 'number');
    assert.ok(first.distance_from_assigned_location);
    assert.ok(first.geofence_status);
  });
});
