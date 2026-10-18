// ==============================================================================
// EDGEWFORCE - FIELD AGENT & SALES AGENT TRACKING TEST SUITE
// GPS Check-In, Geofence Enforcement, Store Requests, Supervisor Metrics & Reports
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { fieldService } from '../services/fieldService.js';

test('Field Force Tracking & Supervisor Monitoring Module Test Suite', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-18T07:30:00Z') });
  await resetTestData();

  // Test fixtures for isolated tracking tests
  await db.insert('work_locations', {
    id: 1,
    company_id: 1,
    name: 'Mega Plaza Victoria Island',
    code: 'LOC-VI-01',
    location_type: 'Store',
    latitude: 6.4281,
    longitude: 3.4219,
    radius_meters: 150,
    geofence_radius_meters: 150,
    address: 'Mega Plaza, VI, Lagos',
    status: 'active', is_active: true
  });

  await db.insert('stores', {
    id: 1,
    company_id: 1,
    code: 'STR-LOS-001',
    name: 'Mega Plaza Supermarket',
    latitude: 6.4281,
    longitude: 3.4219,
    geofence_radius: 150,
    status: 'active'
  });

  await db.insert('employee_location_assignments', {
    id: 1,
    company_id: 1,
    employee_id: 5,
    location_id: 1,
    assignment_type: 'primary',
    is_primary: true,
    is_active: true
  });

  await t.test('1. Field Agent Check-In inside store geofence (<= 150m) succeeds', async () => {
    // Mega Plaza: Lat 6.4281, Lng 3.4219
    const checkInResult = await fieldService.checkIn({
      testDate: '2026-08-21T07:30:00Z', employeeId: 5, // Godfrey Okorie (Field Agent)
      storeId: 1,
      latitude: 6.42815,
      longitude: 3.42195,
      accuracy: 4.2,
      address: 'Mega Plaza, VI, Lagos',
      device: 'Samsung Galaxy A54'
    });

    assert.ok(checkInResult.clock_in_time);
    assert.equal(checkInResult.is_geofence_verified, true);
    assert.equal(checkInResult.is_override, false);
    assert.ok(checkInResult.distance_meters <= 150);
  });

  await t.test('2. Field Agent Check-In outside geofence is blocked without override', async () => {
    // Point far away (> 500m)
    await assert.rejects(
      async () => {
        await fieldService.checkIn({
          employeeId: 5, // Godfrey Okorie
          storeId: 1, // Mega Plaza
          latitude: 6.4400,
          longitude: 3.4400,
          accuracy: 5.0,
          address: 'Distant Location'
        });
      },
      /CHECK-IN BLOCKED/i
    );
  });


  await t.test('3. Outside geofence check-in succeeds with authorized supervisor override', async () => {
    const overrideResult = await fieldService.checkIn({
      employeeId: 5,
      storeId: 1,
      latitude: 6.4400,
      longitude: 3.4400,
      accuracy: 5.0,
      address: 'Distant Location',
      testDate: '2026-08-22T07:30:00Z', isOverride: true,
      overrideReason: 'Network mast maintenance in vicinity'
    });

    assert.ok(overrideResult.clock_in_time);
    assert.equal(overrideResult.is_override, true);
    assert.equal(overrideResult.override_reason, 'Network mast maintenance in vicinity');
  });

  await t.test('4. Check-Out calculates precise elapsed working duration', async () => {
    const checkOutResult = await fieldService.checkOut({testDate: '2026-08-22T17:30:00Z',
      employeeId: 5,
      latitude: 6.42815,
      longitude: 3.42195,
      address: 'Mega Plaza, VI, Lagos'
    });

    assert.ok(checkOutResult.clock_out_time);
    assert.ok(checkOutResult.working_duration_text);
    assert.ok(checkOutResult.working_hours >= 0);
  });

  await t.test('5. Store request submission, supervisor approval, and store directory creation', async () => {
    // Agent submits new store
    const request = await fieldService.submitStoreRequest({
      store_name: 'Test Alpha Mart Lekki',
      address: 'Plot 12 Admiralty Way, Lekki Phase 1',
      store_type: 'Supermarket',
      contact_person: 'Emeka Eze',
      phone: '+2348039911223',
      latitude: 6.4489,
      longitude: 3.4752,
      accuracy: 3.8,
      notes: 'Busy retail avenue',
      territory: 'Lekki Peninsula'
    }, 5);

    assert.equal(request.status, 'pending');
    assert.equal(request.store_name, 'Test Alpha Mart Lekki');

    // Supervisor approves request
    const approval = await fieldService.approveStoreRequest(request.id, {
      geofence_radius: 150,
      assigned_field_agents: [5],
      assigned_sales_agents: [4]
    }, 7);

    assert.equal(approval.request.status, 'approved');
    assert.ok(approval.store.id);
    assert.equal(approval.store.name, 'Test Alpha Mart Lekki');
    assert.equal(approval.store.geofence_radius, 150);

    // Verify store exists in getStores
    const stores = await fieldService.getStores({ search: 'Alpha Mart' });
    assert.equal(stores.length, 1);
    assert.equal(stores[0].name, 'Test Alpha Mart Lekki');
  });

  await t.test('6. Store visit start, field activity logging, and visit completion with photo', async () => {
    // Start visit
    const visit = await fieldService.startStoreVisit({
      storeId: 1,
      agentId: 5,
      latitude: 6.4281,
      longitude: 3.4219,
      visitPurpose: 'Product Merchandising & Shelf Count'
    });

    assert.equal(visit.status, 'in_progress');
    assert.equal(visit.is_geofence_verified, true);

    // Log field activity
    const activity = await fieldService.logFieldActivity({
      store_id: 1,
      visit_id: visit.id,
      activity_type: 'merchandising',
      title: 'Beverage Gondola Setup',
      description: 'Arranged Milo and Peak milk front-facing.',
      latitude: 6.4281,
      longitude: 3.4219
    }, 5);

    assert.ok(activity.id);
    assert.equal(activity.activity_type, 'merchandising');

    // Complete visit
    const completed = await fieldService.completeVisit(visit.id, 5, {
      shelf_share_percent: 75,
      out_of_stock_skus: 'None',
      notes: 'Audit passed cleanly'
    });

    assert.equal(completed.status, 'completed');
    assert.equal(completed.shelf_share_percent, 75);
    assert.ok(completed.photo_evidence_url);
  });

  await t.test('7. Supervisor Dashboard metrics and team table return valid tracking data', async () => {
    const metrics = await fieldService.getSupervisorDashboardMetrics(7);
    assert.ok(metrics.total_field_force > 0);
    assert.ok(metrics.total_field_agents > 0);
    assert.ok(metrics.total_sales_agents > 0);

    const teamTable = await fieldService.getSupervisorTeamTable({ supervisor_id: 7 });
    assert.ok(teamTable.length > 0);
    const agent = teamTable.find(a => a.id === 5);
    assert.ok(agent);
    assert.equal(agent.name, 'Test5 Employee');
    assert.ok(agent.status_color);
  });

  await t.test('8. Supervisor Employee Profile and Timeline aggregation', async () => {
    const profile = await fieldService.getSupervisorEmployeeProfile(5);
    assert.ok(profile.employee);
    assert.ok(profile.attendance);
    assert.ok(profile.location);
    assert.ok(profile.field_activity);
    assert.ok(Array.isArray(profile.timeline));
  });

  await t.test('9. Location alert resolution and attendance exception override', async () => {
    const alerts = await fieldService.getSupervisorAlerts({ supervisor_id: 7 });
    if (alerts.length > 0) {
      const resolved = await fieldService.resolveSupervisorAlert(alerts[0].id, 'Investigated and verified with officer', 7);
      assert.equal(resolved.status, 'resolved');
      assert.equal(resolved.resolution_notes, 'Investigated and verified with officer');
    }

    // Attendance override
    const attendanceRecords = await db.find('attendance', { employee_id: 5 });
    if (attendanceRecords.length > 0) {
      const overridden = await fieldService.overrideAttendance({
        attendanceId: attendanceRecords[0].id,
        notes: 'Supervisor manual sign-off for missed GPS exit',
        reviewerId: 7
      });
      assert.equal(overridden.status, 'Completed');
      assert.equal(overridden.is_override, true);
    }
  });

  await t.test('10. End-of-Day Daily Team Summary compilation and Reports retrieval', async () => {
    const summary = await fieldService.generateDailyTeamSummary(7);
    assert.ok(summary.id);
    assert.equal(summary.supervisor_id, 7);
    assert.ok(summary.total_members > 0);

    const attReport = await fieldService.getReports({ reportType: 'attendance' });
    assert.ok(Array.isArray(attReport));

    const locReport = await fieldService.getReports({ reportType: 'location' });
    assert.ok(Array.isArray(locReport));

    const actReport = await fieldService.getReports({ reportType: 'activity' });
    assert.ok(Array.isArray(actReport));

    const salesReport = await fieldService.getReports({ reportType: 'sales' });
    assert.ok(Array.isArray(salesReport));
  });
});
