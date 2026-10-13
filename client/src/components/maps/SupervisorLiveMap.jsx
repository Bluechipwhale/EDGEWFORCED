import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Store, Users, Eye, RefreshCw, ZoomIn, ZoomOut, Navigation } from 'lucide-react';

// Status color definitions
const STATUS_COLORS = {
  GREEN: '#10B981',   // Active / Inside store geofence
  YELLOW: '#F59E0B',  // Attention / Late / Near boundary
  RED: '#EF4444',     // Alert / Outside geofence / SOS
  GREY: '#71717A'     // Completed shift / Concluded
};

// Create custom agent radar pin icon
const createAgentIcon = (statusColor = '#10B981', initials = 'FA', isSales = false) => {
  const pulseClass = statusColor !== '#71717A' ? 'animate-ping' : '';
  return L.divIcon({
    className: 'supervisor-agent-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px;">
        <div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: ${statusColor};
          opacity: 0.35;
        " class="${pulseClass}"></div>
        <div style="
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${statusColor};
          color: white;
          font-weight: 800;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        ">
          ${initials}
        </div>
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: ${isSales ? '#3B82F6' : '#F57C00'};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7px;
          font-weight: 900;
          color: white;
        ">
          ${isSales ? 'S' : 'F'}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
};

// Create custom store pin icon
const createStoreIcon = (name = 'Store', radius = 150) => {
  return L.divIcon({
    className: 'supervisor-store-marker',
    html: `
      <div style="
        background: #18181B;
        color: #F57C00;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #F57C00;
        box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export default function SupervisorLiveMap({
  team = [],
  stores = [],
  selectedEmployee = null,
  onSelectEmployee = null,
  height = '520px',
  onRefresh = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const geofencesGroupRef = useRef(null);

  const [showGeofences, setShowGeofences] = useState(true);
  const [showStores, setShowStores] = useState(true);
  const [showFieldAgents, setShowFieldAgents] = useState(true);
  const [showSalesAgents, setShowSalesAgents] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter = [6.4350, 3.4300]; // Lagos Victoria Island / Lekki Corridor
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(defaultCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    geofencesGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Layers & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersGroupRef.current || !geofencesGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    geofencesGroupRef.current.clearLayers();

    const boundsPoints = [];

    // 1. Render Stores & Geofence Perimeters
    stores.forEach(store => {
      if (!store.latitude || !store.longitude) return;
      const point = [Number(store.latitude), Number(store.longitude)];
      boundsPoints.push(point);

      const radius = Number(store.geofence_radius || 150);

      // Draw Geofence Radius Circle
      if (showGeofences) {
        const circle = L.circle(point, {
          radius: radius,
          color: '#F57C00',
          weight: 2,
          dashArray: '5, 5',
          fillColor: '#F57C00',
          fillOpacity: 0.08
        }).bindTooltip(`${store.name} Geofence (${radius}m)`, { sticky: true, className: 'text-xs font-semibold' });
        geofencesGroupRef.current.addLayer(circle);
      }

      // Draw Store Marker
      if (showStores) {
        const storeMarker = L.marker(point, {
          icon: createStoreIcon(store.name, radius)
        });

        const storePopupHtml = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: #F57C00; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${store.code || 'STORE'}</span>
              <span style="font-weight: 700; color: #111827; font-size: 13px;">${store.name}</span>
            </div>
            <div style="color: #6B7280; font-size: 11px; margin-bottom: 6px;">📍 ${store.address || 'Address'}</div>
            <div style="border-top: 1px solid #E5E7EB; padding-top: 6px; font-size: 11px; margin-bottom: 8px;">
              <div><b>Territory:</b> ${store.territory || 'Lagos Mainland'}</div>
              <div><b>Geofence:</b> <span style="color: #F57C00; font-weight: bold;">${radius}m radius</span></div>
              <div><b>Contact:</b> ${store.contact_person || 'Manager'} (${store.phone || 'N/A'})</div>
            </div>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}" target="_blank" rel="noopener noreferrer" style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              width: 100%;
              background: #2563EB;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: bold;
              box-sizing: border-box;
            ">
              🚗 Get Google Maps Directions (Drive)
            </a>
          </div>
        `;
        storeMarker.bindPopup(storePopupHtml);
        markersGroupRef.current.addLayer(storeMarker);
      }
    });

    // 2. Render Field Agents & Sales Agents
    team.forEach(agent => {
      const isSales = agent.role_code === 'SALES_AGENT';
      if (isSales && !showSalesAgents) return;
      if (!isSales && !showFieldAgents) return;

      const coords = agent.latest_coordinates;
      if (!coords || !coords.latitude || !coords.longitude) return;

      const point = [Number(coords.latitude), Number(coords.longitude)];
      boundsPoints.push(point);

      const statusColorHex = STATUS_COLORS[agent.status_color] || STATUS_COLORS.GREEN;
      const initials = (agent.name || agent.first_name || 'Agent').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      const marker = L.marker(point, {
        icon: createAgentIcon(statusColorHex, initials, isSales),
        zIndexOffset: agent.id === selectedEmployee?.id ? 1000 : 100
      });

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <b style="font-size: 13px; color: #111827;">${agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`}</b>
            <span style="background: ${statusColorHex}; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 9999px;">
              ${agent.status_label || (agent.status_color === 'GREEN' ? 'Active' : 'On Duty')}
            </span>
          </div>
          <div style="color: #6B7280; font-size: 11px; margin-bottom: 6px;">
            ${agent.role || agent.role_code || 'Officer'} &bull; ${agent.employee_code || 'EMP'}
          </div>
          <div style="background: #F3F4F6; border-radius: 6px; padding: 6px 8px; font-size: 11px; margin-bottom: 8px;">
            <div><b>Assigned Outlet:</b> ${agent.store?.name || 'Assigned Beat'}</div>
            <div><b>Check-In:</b> ${agent.check_in_time ? new Date(agent.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Field'}</div>
            <div><b>Coordinates:</b> ${Number(coords.latitude).toFixed(5)}, ${Number(coords.longitude).toFixed(5)}</div>
            <div><b>Distance to Store:</b> ${agent.distance_meters ? `${agent.distance_meters}m` : 'Inside Geofence'}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}" target="_blank" rel="noopener noreferrer" style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              width: 100%;
              background: #2563EB;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              padding: 5px 8px;
              font-size: 11px;
              font-weight: bold;
              box-sizing: border-box;
            ">
              🚗 Drive to Agent (Google Maps)
            </a>
            <button id="btn-agent-select-${agent.id}" style="
              width: 100%;
              background: #F57C00;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 5px 8px;
              font-size: 11px;
              font-weight: bold;
              cursor: pointer;
            ">
              🔍 View Profile & Timeline
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-agent-select-${agent.id}`);
        if (btn && onSelectEmployee) {
          btn.onclick = () => onSelectEmployee(agent);
        }
      });

      markersGroupRef.current.addLayer(marker);
    });


    // Auto fit bounds if points exist
    if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 14 });
    }
  }, [team, stores, showGeofences, showStores, showFieldAgents, showSalesAgents, selectedEmployee]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([6.4350, 3.4300], 12);
    }
  };

  return (
    <div className="relative surface-card rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800">
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* Top Floating Controls & Toggles */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
        <span className="text-zinc-500 uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-primary" /> Layers:
        </span>

        {/* Toggle Geofences */}
        <button
          type="button"
          onClick={() => setShowGeofences(!showGeofences)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            showGeofences
              ? 'bg-primary text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <div className="w-2 h-2 rounded-full border border-white" />
          150m Geofences
        </button>

        {/* Toggle Stores */}
        <button
          type="button"
          onClick={() => setShowStores(!showStores)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            showStores
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Stores ({stores.length})
        </button>

        {/* Toggle Field Agents */}
        <button
          type="button"
          onClick={() => setShowFieldAgents(!showFieldAgents)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            showFieldAgents
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Field Agents
        </button>

        {/* Toggle Sales Agents */}
        <button
          type="button"
          onClick={() => setShowSalesAgents(!showSalesAgents)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            showSalesAgents
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Sales Agents
        </button>
      </div>

      {/* Top Right Live Radar Indicator & Refresh */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-md text-xs font-bold backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          LIVE RADAR ACTIVE
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Field Force GPS Telemetry"
            className="p-2 bg-white/90 dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 backdrop-blur-md rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Left Status Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
        <span className="text-zinc-400 font-bold uppercase text-[9px]">Status:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Active (At Store)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Attention / Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Alert (Outside Geofence)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
          <span>Shift Concluded</span>
        </div>
      </div>

      {/* Bottom Right Map Zoom & Recenter Controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-md border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 transition-all"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 transition-all"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Lagos Region"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-primary transition-all"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
