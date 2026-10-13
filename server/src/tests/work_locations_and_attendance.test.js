// ==============================================================================
// EDGEWFORCE - WORK LOCATIONS & INDIVIDUAL ATTENDANCE TEST SUITE
// Tests Location Management, Dynamic Assignments, Multi-Tenant Geofencing,
// Distance Formatting, Temporary Windows, GPS Accuracy, and Supervisor Overrides
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHaversineDistance, verifyGeofence, formatDistance, validateCoordinates } from '../utils/haversine.js';
import { locationService } from '../services/locationService.js';
import { fieldService } from '../services/fieldService.js';
import { employeeService } from '../services/employeeService.js';
import { hrService } from '../services/hrService.js';
import { db, resetTestData } from './helpers/database.js';

test('Work Locations & Dynamic Employee Attendance Suite', async (t) => {
  // Setup test company and locations
  const testCompanyId = 1;

  await t.test('1. Distance formatting helper (formatDistance)', () => {
    assert.equal(formatDistance(0), '0m');
    assert.equal(formatDistance(84), '84m');
    assert.equal(formatDistance(350), '350m');
    assert.equal(formatDistance(999), '999m');
    assert.equal(formatDistance(1000), '1.0km');
    assert.equal(formatDistance(1200), '1.2km');
    assert.equal(formatDistance(16771), '16.8km');
    assert.equal(formatDistance(11437802), '11437.8km');
  });

  await t.test('2. Coordinate bounds validation (validateCoordinates)', () => {
    assert.equal(validateCoordinates(6.4281, 3.4219).valid, true);
    assert.equal(validateCoordinates(90.1, 3.4219).valid, false);
    assert.equal(validateCoordinates(-91, 3.4219).valid, false);
    assert.equal(validateCoordinates(6.4281, 185).valid, false);
    assert.equal(validateCoordinates(null, 3.4219).valid, false);
    assert.equal(validateCoordinates('abc', 3.4219).valid, false);
  });

  await t.test('3. Work Location CRUD & Validation', async () => {
    // Create new location in Ibadan
    const ibadanLoc = await locationService.createLocation({
      company_id: testCompanyId,
      name: 'Ibadan Bodija Market Branch',
      location_type: 'Market',
      address: 'Bodija International Market, Ibadan',
      state: 'Oyo',
      city: 'Ibadan',
      latitude: 7.4350,
      longitude: 3.9120,
      geofence_radius: 200
    });

    assert.ok(ibadanLoc.id);
    assert.equal(ibadanLoc.name, 'Ibadan Bodija Market Branch');
    assert.equal(ibadanLoc.state, 'Oyo');
    assert.equal(ibadanLoc.geofence_radius, 200);

    // Update location
    const updated = await locationService.updateLocation(ibadanLoc.id, {
      company_id: testCompanyId,
      name: 'Ibadan Bodija Main Depot',
      geofence_radius: 250
    });
    assert.equal(updated.name, 'Ibadan Bodija Main Depot');
    assert.equal(updated.geofence_radius, 250);

    // Retrieval
    const fetched = await locationService.getLocationById(ibadanLoc.id, testCompanyId);
    assert.equal(fetched.name, 'Ibadan Bodija Main Depot');
  });

  await t.test('4. Registering staff without automatic Mega Plaza default', async () => {
    const newStaff = await hrService.registerStaff({
      company_id: testCompanyId,
      first_name: 'Amaka',
      last_name: 'Eze',
      email: `amaka.eze.${Date.now()}@edgewforce.com`,
      phone: `+23480399${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'Field Operations',
      position: 'Field Merchandiser',
      state: 'Enugu',
      city: 'Enugu'
    });

    assert.ok(newStaff.employee.id);

    // Check employee location assignments: must be unassigned initially
    const empLocations = await locationService.getEmployeeLocations(newStaff.employee.id, testCompanyId);
    assert.equal(empLocations.has_assigned_location, false);
    assert.equal(empLocations.primary_location, null);
    assert.equal(empLocations.all_active_locations.length, 0);

    // Attempting check-in while unassigned MUST be rejected with clear message
    await assert.rejects(
      async () => {
        await fieldService.checkIn({
          employeeId: newStaff.employee.id,
          latitude: 6.4474,
          longitude: 7.4984,
          accuracy: 5
        });
      },
      (err) => {
        assert.ok(err.message.includes('CHECK-IN UNAVAILABLE — No work location has been assigned'));
        return true;
      }
    );
  });

  await t.test('5. Assigning Primary and Secondary locations to an employee', async () => {
    // Create new staff in Kano
    const kanoStaff = await hrService.registerStaff({
      company_id: testCompanyId,
      first_name: 'Musa',
      last_name: 'Ibrahim',
      email: `musa.ibrahim.${Date.now()}@edgewforce.com`,
      phone: `+23480877${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'Commercial Sales',
      position: 'Key Account Executive',
      state: 'Kano',
      city: 'Kano'
    });

    const kanoDepot = await locationService.createLocation({
      company_id: testCompanyId,
      name: 'Kano Sabon Gari Regional Hub',
      location_type: 'Branch',
      address: 'France Road, Sabon Gari, Kano',
      state: 'Kano',
      city: 'Kano',
      latitude: 12.0022,
      longitude: 8.5920,
      geofence_radius: 150
    });

    const kanoDepotSecondary = await locationService.createLocation({
      company_id: testCompanyId,
      name: 'Kano Bompai Industrial Depot',
      location_type: 'Warehouse',
      address: 'Bompai Industrial Area, Kano',
      state: 'Kano',
      city: 'Kano',
      latitude: 12.0250,
      longitude: 8.5410,
      geofence_radius: 200
    });

    // Assign primary location
    await locationService.assignEmployeeLocation({
      company_id: testCompanyId,
      employee_id: kanoStaff.employee.id,
      location_id: kanoDepot.id,
      assignment_type: 'primary',
      reason: 'Regional placement in Sabon Gari'
    });

    // Assign secondary location
    await locationService.assignEmployeeLocation({
      company_id: testCompanyId,
      employee_id: kanoStaff.employee.id,
      location_id: kanoDepotSecondary.id,
      assignment_type: 'secondary',
      reason: 'Allowed secondary replenishment depot'
    });

    const details = await locationService.getEmployeeLocations(kanoStaff.employee.id, testCompanyId);
    assert.equal(details.has_assigned_location, true);
    assert.equal(details.primary_location.name, 'Kano Sabon Gari Regional Hub');
    assert.equal(details.allowed_locations.length, 1);
    assert.equal(details.allowed_locations[0].name, 'Kano Bompai Industrial Depot');
    assert.equal(details.all_active_locations.length, 2);

    // 6. Check-in inside primary location (Sabon Gari ~ 30m away) -> Approved!
    const checkInPrimary = await fieldService.checkIn({testDate:'2026-08-21T07:30:00Z',
      employeeId: kanoStaff.employee.id,
      latitude: 12.0024,
      longitude: 8.5921,
      accuracy: 5
    });
    assert.ok(checkInPrimary.clock_in_time);
    assert.equal(checkInPrimary.is_geofence_verified, true);
    assert.equal(checkInPrimary.location_name, 'Kano Sabon Gari Regional Hub');

    // 7. Check-in inside secondary location (Bompai ~ 50m away) -> Approved!
    const checkInSecondary = await fieldService.checkIn({testDate:'2026-08-22T07:30:00Z',
      employeeId: kanoStaff.employee.id,
      latitude: 12.0253,
      longitude: 8.5412,
      accuracy: 5
    });
    assert.ok(checkInSecondary.clock_in_time);
    assert.equal(checkInSecondary.is_geofence_verified, true);
    assert.equal(checkInSecondary.location_name, 'Kano Bompai Industrial Depot');

    // 8. Check-in outside all assigned locations (in Lagos 800km away) -> Blocked with detailed distances!
    await assert.rejects(
      async () => {
        await fieldService.checkIn({
          employeeId: kanoStaff.employee.id,
          latitude: 6.4281,
          longitude: 3.4219,
          accuracy: 5
        });
      },
      (err) => {
        assert.ok(err.message.includes('CHECK-IN BLOCKED — You are outside all assigned work locations.'));
        assert.ok(err.message.includes('Kano Bompai Industrial Depot') || err.message.includes('Kano Sabon Gari Regional Hub'));
        return true;
      }
    );
  });

  await t.test('6. Temporary assignment active window and expiry', async () => {
    const tempStaff = await hrService.registerStaff({
      company_id: testCompanyId,
      first_name: 'Chinedu',
      last_name: 'Okeke',
      email: `chinedu.okeke.${Date.now()}@edgewforce.com`,
      phone: `+23480766${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'Corporate Operations',
      position: 'Corporate Operations Specialist',
      state: 'Rivers',
      city: 'Port Harcourt'
    });

    const phSite = await locationService.createLocation({
      company_id: testCompanyId,
      name: 'Port Harcourt Oil Mill Market',
      location_type: 'Market',
      address: 'Aba Road, Oil Mill, Port Harcourt',
      state: 'Rivers',
      city: 'Port Harcourt',
      latitude: 4.8540,
      longitude: 7.0620,
      geofence_radius: 200
    });

    // Assign temporary location from yesterday to tomorrow
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    await locationService.assignEmployeeLocation({
      company_id: testCompanyId,
      employee_id: tempStaff.employee.id,
      location_id: phSite.id,
      assignment_type: 'temporary',
      start_date: yesterday,
      end_date: tomorrow,
      reason: '2-Day Brand Activation Campaign'
    });

    let activePermitted = await locationService.getActivePermittedLocations(tempStaff.employee.id, testCompanyId);
    assert.ok(activePermitted.length >= 1);
    assert.ok(activePermitted.some(l => l.name === 'Port Harcourt Oil Mill Market'));

    // Check-in inside PH site -> Approved
    const checkIn = await fieldService.checkIn({
      employeeId: tempStaff.employee.id,
      latitude: 4.8542,
      longitude: 7.0621,
      accuracy: 5
    });
    assert.equal(checkIn.is_geofence_verified, true);

    // Now test expired temporary window (e.g. assignment ended 2 days ago)
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    await locationService.assignEmployeeLocation({
      company_id: testCompanyId,
      employee_id: tempStaff.employee.id,
      location_id: phSite.id,
      assignment_type: 'temporary',
      start_date: threeDaysAgo,
      end_date: twoDaysAgo,
      reason: 'Expired Campaign'
    });

    activePermitted = await locationService.getActivePermittedLocations(tempStaff.employee.id, testCompanyId);
    assert.ok(!activePermitted.some(l => l.name === 'Port Harcourt Oil Mill Market')); // Expired window is excluded from check-in
  });

  await t.test('7. GPS Accuracy verification (Reject if accuracy > 500m)', async () => {
    const accuracyStaff = await hrService.registerStaff({
      company_id: testCompanyId,
      first_name: 'Fatima',
      last_name: 'Aliyu',
      email: `fatima.aliyu.${Date.now()}@edgewforce.com`,
      phone: `+23480555${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'Field Operations',
      position: 'Field Officer',
      state: 'FCT Abuja',
      city: 'Abuja'
    });

    const abujaHub = await locationService.createLocation({
      company_id: testCompanyId,
      name: 'Abuja Garki Model Market',
      location_type: 'Market',
      address: 'Garki 2, Abuja',
      state: 'FCT Abuja',
      city: 'Abuja',
      latitude: 9.0320,
      longitude: 7.4890,
      geofence_radius: 150
    });

    await locationService.assignEmployeeLocation({
      company_id: testCompanyId,
      employee_id: accuracyStaff.employee.id,
      location_id: abujaHub.id,
      assignment_type: 'primary'
    });

    // Inaccurate GPS reading (accuracy = 850m) must be rejected
    await assert.rejects(
      async () => {
        await fieldService.checkIn({
          employeeId: accuracyStaff.employee.id,
          latitude: 9.0320,
          longitude: 7.4890,
          accuracy: 850 // > 500m
        });
      },
      (err) => {
        assert.ok(err.message.includes('LOCATION ACCURACY TOO LOW'));
        assert.ok(err.message.includes('±850m'));
        return true;
      }
    );
  });

  await t.test('8. Supervisor manual check-in override with audit logging', async () => {
    const overrideStaff = await hrService.registerStaff({
      company_id: testCompanyId,
      first_name: 'Segun',
      last_name: 'Adeyemi',
      email: `segun.adeyemi.${Date.now()}@edgewforce.com`,
      phone: `+23480333${Math.floor(10000 + Math.random() * 90000)}`,
      department: 'Field Operations',
      position: 'Auditor',
      state: 'Lagos',
      city: 'Ikeja'
    });

    const ikejaDepot = await locationService.createLocation({
      company_id: testCompanyId,
      name: 'Ikeja Computer Village Audit Hub',
      location_type: 'Store',
      address: 'Otigba Street, Ikeja',
      state: 'Lagos',
      city: 'Ikeja',
      latitude: 6.5990,
      longitude: 3.3370,
      geofence_radius: 100
    });

    await locationService.assignEmployeeLocation({
      company_id: testCompanyId,
      employee_id: overrideStaff.employee.id,
      location_id: ikejaDepot.id,
      assignment_type: 'primary'
    });

    // Check-in from outside (e.g. 500m away) with supervisor override
    const checkIn = await fieldService.checkIn({
      employeeId: overrideStaff.employee.id,
      latitude: 6.6040,
      longitude: 3.3410,
      accuracy: 10,
      isOverride: true,
      overrideReason: 'Network mast interference at client premises, supervisor authorized'
    });

    assert.equal(checkIn.is_override, true);
    assert.equal(checkIn.override_reason, 'Network mast interference at client premises, supervisor authorized');
    assert.equal(checkIn.status, 'present');
  });
});
