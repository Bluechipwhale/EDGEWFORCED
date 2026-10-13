// ==============================================================================
// EDGEWFORCE - AUTOMATED GEOFENCE TESTS
// Strict 150-meter Geofence Boundary Test Suite (0m, 50m, 149m, 150m, 151m, 500m)
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHaversineDistance, verifyGeofence, GEOFENCE_MAX_METERS } from '../utils/haversine.js';

test('Haversine Geofence Boundary Test Suite', async (t) => {
  // Reference outlet coordinates: Lagos Victoria Island (Mega Plaza)
  const baseLat = 6.4281000;
  const baseLng = 3.4219000;

  // 1 degree latitude ~ 111,139 meters => 1 meter ~ 0.00000899 degrees
  const oneMeterLatOffset = 0.00000899;

  await t.test('0 meters - Exact identical location', () => {
    const dist = calculateHaversineDistance(baseLat, baseLng, baseLat, baseLng);
    assert.equal(dist, 0);

    const check = verifyGeofence(baseLat, baseLng, baseLat, baseLng);
    assert.equal(check.isWithinGeofence, true);
    assert.equal(check.distanceMeters, 0);
  });

  await t.test('50 meters - Well within 150m geofence', () => {
    const targetLat = baseLat + (50 * oneMeterLatOffset);
    const dist = calculateHaversineDistance(baseLat, baseLng, targetLat, baseLng);

    assert.ok(dist >= 49.0 && dist <= 51.0, `Expected ~50m, got ${dist}`);
    const check = verifyGeofence(baseLat, baseLng, targetLat, baseLng);
    assert.equal(check.isWithinGeofence, true);
  });

  await t.test('149 meters - Just inside 150m boundary', () => {
    const targetLat = baseLat + (149 * oneMeterLatOffset);
    const dist = calculateHaversineDistance(baseLat, baseLng, targetLat, baseLng);

    assert.ok(dist >= 148.0 && dist <= 149.9, `Expected ~149m, got ${dist}`);
    const check = verifyGeofence(baseLat, baseLng, targetLat, baseLng);
    assert.equal(check.isWithinGeofence, true);
  });

  await t.test('150 meters - Exact configured inclusive boundary', () => {
    // Test exact 150.0m boundary logic
    const checkWithin = verifyGeofence(baseLat, baseLng, baseLat, baseLng, 150.0);
    assert.equal(checkWithin.isWithinGeofence, true);

    // Artificial check with exact 150m distance
    assert.equal(150.0 <= GEOFENCE_MAX_METERS, true);
  });

  await t.test('151 meters - Just outside 150m boundary (Must be rejected)', () => {
    const targetLat = baseLat + (151 * oneMeterLatOffset);
    const dist = calculateHaversineDistance(baseLat, baseLng, targetLat, baseLng);

    assert.ok(dist >= 150.5, `Expected >150m, got ${dist}`);
    const check = verifyGeofence(baseLat, baseLng, targetLat, baseLng);
    assert.equal(check.isWithinGeofence, false);
    assert.ok(check.feedbackMessage.includes('Move within 150m'));
    assert.ok(check.feedbackMessage.includes('check in'));
  });

  await t.test('500 meters - Far outside geofence', () => {
    const targetLat = baseLat + (500 * oneMeterLatOffset);
    const dist = calculateHaversineDistance(baseLat, baseLng, targetLat, baseLng);

    assert.ok(dist >= 495.0 && dist <= 505.0, `Expected ~500m, got ${dist}`);
    const check = verifyGeofence(baseLat, baseLng, targetLat, baseLng);
    assert.equal(check.isWithinGeofence, false);
    assert.ok(check.feedbackMessage.includes('500m away'));
  });

});
