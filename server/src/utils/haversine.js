// ==============================================================================
// EDGEWFORCE - HAVERSINE GPS DISTANCE CALCULATOR & GEOSPATIAL VALIDATION ENGINE
// Computes Great-Circle distance between two coordinates in meters
// Strict Configurable Geofence boundary enforcement & human-friendly formatting
// ==============================================================================

const EARTH_RADIUS_METERS = 6371000; // Earth mean radius in meters
export const GEOFENCE_MAX_METERS = 150.0;

/**
 * Validates GPS coordinates bounds (lat: [-90, 90], lng: [-180, 180])
 */
export function validateCoordinates(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);

  if (!Number.isFinite(nLat) || !Number.isFinite(nLng) || String(lat).trim() === '' || String(lng).trim() === '' || lat === null || lng === null || lat === undefined || lng === undefined) {
    return { valid: false, message: 'Coordinates are missing or not numeric.' };
  }

  if (nLat < -90 || nLat > 90) {
    return { valid: false, message: `Latitude ${nLat} is outside valid range [-90, 90].` };
  }

  if (nLng < -180 || nLng > 180) {
    return { valid: false, message: `Longitude ${nLng} is outside valid range [-180, 180].` };
  }

  return { valid: true, latitude: nLat, longitude: nLng };
}

/**
 * Formats a distance in meters into human-readable text (e.g. 84m, 350m, 1.2km, 11.4km).
 * @param {number} meters 
 * @returns {string}
 */
export function formatDistance(meters) {
  const m = Number(meters);
  if (isNaN(m) || m < 0) return '0m';
  if (m < 1000) {
    return `${Math.round(m)}m`;
  }
  const km = m / 1000;
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Calculates the great-circle distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in decimal degrees
 * @param {number} lon1 Longitude of point 1 in decimal degrees
 * @param {number} lat2 Latitude of point 2 in decimal degrees
 * @param {number} lon2 Longitude of point 2 in decimal degrees
 * @returns {number} Distance in meters rounded to 2 decimal places
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) {
    throw new Error('Invalid GPS coordinates provided for distance calculation.');
  }

  if (p1Lat < -90 || p1Lat > 90 || p2Lat < -90 || p2Lat > 90 || p1Lon < -180 || p1Lon > 180 || p2Lon < -180 || p2Lon > 180) {
    throw new Error('GPS coordinates out of valid geographical boundaries.');
  }

  // Exact point identity
  if (p1Lat === p2Lat && p1Lon === p2Lon) {
    return 0.0;
  }

  const toRadians = deg => (deg * Math.PI) / 180.0;
  const dLat = toRadians(p2Lat - p1Lat);
  const dLon = toRadians(p2Lon - p1Lon);

  const radLat1 = toRadians(p1Lat);
  const radLat2 = toRadians(p2Lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Checks if a user's location is within the operational geofence of a location/outlet.
 * @param {number} agentLat
 * @param {number} agentLng
 * @param {number} locationLat
 * @param {number} locationLng
 * @param {number} maxAllowedMeters Defaults to 150.0 meters
 * @returns {{ isWithinGeofence: boolean, distanceMeters: number, maxAllowedMeters: number, formattedDistance: string, feedbackMessage: string }}
 */
export function verifyGeofence(agentLat, agentLng, locationLat, locationLng, maxAllowedMeters = GEOFENCE_MAX_METERS) {
  const distanceMeters = calculateHaversineDistance(agentLat, agentLng, locationLat, locationLng);
  const isWithinGeofence = distanceMeters <= maxAllowedMeters;
  const formattedDistance = formatDistance(distanceMeters);

  let feedbackMessage = '';
  if (isWithinGeofence) {
    feedbackMessage = `Geofence verified: You are ${formattedDistance} from location (within ${maxAllowedMeters}m permitted radius).`;
  } else {
    feedbackMessage = `You are ${formattedDistance} away from this location. Move within ${maxAllowedMeters}m permitted radius to check in.`;
  }

  return {
    isWithinGeofence,
    distanceMeters,
    maxAllowedMeters,
    formattedDistance,
    feedbackMessage
  };
}

