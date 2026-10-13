import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom SVG map icons
const createCustomIcon = (color = '#F57C00', label = '') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: ${color};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const agentRadarIcon = L.divIcon({
  className: 'custom-radar-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: #F57C00;
        opacity: 0.75;
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: absolute;
        inset: 4px;
        border-radius: 50%;
        background: #E65100;
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(245, 124, 0, 0.8);
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function FieldMap({ route = [], agentLocation = null, height = '400px' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Cleanup previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: Lagos Commercial Axis
    const defaultCenter = [6.4281, 3.4219];
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const latLngPoints = [];

    // 1. Plot Agent Live Location
    if (agentLocation?.latitude && agentLocation?.longitude) {
      const agentLatLng = [Number(agentLocation.latitude), Number(agentLocation.longitude)];
      L.marker(agentLatLng, { icon: agentRadarIcon })
        .addTo(map)
        .bindPopup(`<b>Your Live GPS Location</b><br>Accuracy: ±${Math.round(agentLocation.accuracy || 10)}m`);
      latLngPoints.push(agentLatLng);
    }

    // 2. Plot Route Customer Stops & 150m Geofence Circles
    route.forEach((stop, index) => {
      const cust = stop.customer;
      if (cust?.latitude && cust?.longitude) {
        const lat = Number(cust.latitude);
        const lng = Number(cust.longitude);
        const point = [lat, lng];
        latLngPoints.push(point);

        const isCompleted = stop.status === 'completed';
        const markerColor = isCompleted ? '#10B981' : (stop.priority === 'URGENT' ? '#EF4444' : '#F57C00');

        const marker = L.marker(point, {
          icon: createCustomIcon(markerColor, String(index + 1))
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <b style="font-size: 13px; color: #111;">${cust.name}</b><br>
            <span style="color: #666;">${cust.address || 'Lagos territory'}</span><br>
            <div style="margin-top: 4px;">
              <b>Status:</b> ${stop.status} | <b>Priority:</b> ${stop.priority || 'Normal'}
            </div>
            <div style="margin-top: 6px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="color: #F57C00; font-weight: bold; text-decoration: none;">
                🧭 Open Directions
              </a>
            </div>
          </div>
        `);

        // Draw 150-Meter Geofence Circle
        L.circle(point, {
          radius: 150,
          color: markerColor,
          weight: 1.5,
          fillColor: markerColor,
          fillOpacity: 0.08
        }).addTo(map);
      }
    });

    // 3. Draw Route Polyline
    if (latLngPoints.length > 1) {
      L.polyline(latLngPoints, {
        color: '#F57C00',
        weight: 3,
        opacity: 0.7,
        dashArray: '6, 6'
      }).addTo(map);
    }

    // 4. Fit bounds
    if (latLngPoints.length > 0) {
      map.fitBounds(latLngPoints, { padding: [40, 40] });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [route, agentLocation]);

  return (
    <div className="surface-card rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
    </div>
  );
}
