import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Clock, Calendar, Filter, Search, Download, RefreshCw,
  CheckCircle2, AlertTriangle, ShieldAlert, Navigation, Layers,
  ExternalLink, Eye, X, Compass, Globe, Sparkles, Building2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../lib/api';

// Interactive Location Map Modal for View Location
function LocationMapModal({ item, onClose }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || !item) return;

    const agentLat = Number(item.latitude);
    const agentLng = Number(item.longitude);
    const assignedLoc = item.assigned_location;
    const assignedLat = assignedLoc ? Number(assignedLoc.latitude) : null;
    const assignedLng = assignedLoc ? Number(assignedLoc.longitude) : null;
    const radius = Number(item.permitted_radius || 150);

    const initialLat = agentLat || assignedLat || 6.5244;
    const initialLng = agentLng || assignedLng || 3.3792;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: true
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const bounds = [];

    // 1. Plot Assigned Work Location Geofence
    if (assignedLat && assignedLng) {
      bounds.push([assignedLat, assignedLng]);

      // Circle for Geofence radius
      L.circle([assignedLat, assignedLng], {
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
        radius: radius
      }).addTo(map);

      // Marker for Assigned Location Center
      const storeIcon = L.divIcon({
        className: 'custom-store-marker',
        html: `
          <div style="background: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            🏢
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([assignedLat, assignedLng], { icon: storeIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: 800; font-size: 13px; color: #065F46;">${assignedLoc.name || 'Assigned Location'}</div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">${assignedLoc.address || 'Field Territory'}</div>
            <div style="font-size: 11px; font-weight: 700; color: #10B981; margin-top: 4px;">Permitted Geofence Radius: ${radius}m</div>
          </div>
        `)
        .addTo(map);
    }

    // 2. Plot Recorded Agent GPS Location
    if (agentLat && agentLng) {
      bounds.push([agentLat, agentLng]);

      const isVerified = item.geofence_status === 'Verified';
      const markerColor = isVerified ? '#F57C00' : '#DC2626';

      // Accuracy circle
      if (item.accuracy) {
        L.circle([agentLat, agentLng], {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.1,
          weight: 1,
          radius: Number(item.accuracy)
        }).addTo(map);
      }

      const agentIcon = L.divIcon({
        className: 'custom-agent-marker',
        html: `
          <div style="background: ${markerColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            👤
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([agentLat, agentLng], { icon: agentIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: 800; font-size: 13px; color: #1F2937;">${item.agent_name}</div>
            <div style="font-size: 11px; color: #4B5563;">${item.designation} &bull; ${item.activity}</div>
            <div style="font-size: 11px; color: #9CA3AF; margin-top: 2px;">GPS: ${agentLat.toFixed(6)}, ${agentLng.toFixed(6)}</div>
            <div style="font-size: 11px; font-weight: 700; color: ${isVerified ? '#059669' : '#DC2626'}; margin-top: 4px;">
              Distance: ${item.distance_formatted} (${isVerified ? 'Inside Geofence' : 'Outside Geofence'})
            </div>
            <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">Lagos Time: ${item.server_time}</div>
          </div>
        `)
        .addTo(map)
        .openPopup();
    }

    // 3. Connect with Polyline line if both exist
    if (agentLat && agentLng && assignedLat && assignedLng) {
      L.polyline([[agentLat, agentLng], [assignedLat, assignedLng]], {
        color: '#6366F1',
        weight: 2,
        dashArray: '4, 4'
      }).addTo(map);

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [item]);

  if (!item) return null;

  const isVerified = item.geofence_status === 'Verified';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <MapPin size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{item.agent_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                  {item.employee_code || item.role}
                </span>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {item.designation} &bull; {item.activity} &bull; Server Time (Africa/Lagos): {item.server_time}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-[400px] sm:h-[460px] bg-zinc-100 dark:bg-zinc-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Overlay Badge */}
          <div className="absolute top-3 right-3 z-[1000] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-lg space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={isVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                {item.geofence_status}
              </span>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              Distance: <strong className="text-zinc-900 dark:text-zinc-100">{item.distance_formatted}</strong>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              Permitted Radius: <strong className="text-zinc-900 dark:text-zinc-100">{item.permitted_radius}m</strong>
            </div>
          </div>
        </div>

        {/* Detailed Info Footer */}
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-zinc-400 uppercase font-semibold text-[10px]">Market / Location</div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{item.market}</div>
            <div className="text-zinc-500">{item.region} &bull; {item.state}</div>
          </div>
          <div>
            <div className="text-zinc-400 uppercase font-semibold text-[10px]">GPS Coordinates</div>
            <div className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
              {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
            </div>
            <div className="text-zinc-500">Accuracy: {item.accuracy_text}</div>
          </div>
          <div>
            <div className="text-zinc-400 uppercase font-semibold text-[10px]">Attendance Type</div>
            <div className="font-bold text-orange-600 dark:text-orange-400 mt-0.5">{item.attendance_type}</div>
            <div className="text-zinc-500">{item.activity}</div>
          </div>
          <div>
            <div className="text-zinc-400 uppercase font-semibold text-[10px]">Server Timestamp</div>
            <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{item.server_time}</div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Africa/Lagos UTC+1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeoLocationReportView({ user, defaultRoleFilter = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(defaultRoleFilter || 'ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [attendanceTypeFilter, setAttendanceTypeFilter] = useState('ALL');
  const [geofenceStatusFilter, setGeofenceStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10)
  });
  const [selectedMapItem, setSelectedMapItem] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        search: search.trim()
      });
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (regionFilter !== 'ALL') params.append('region', regionFilter);
      if (attendanceTypeFilter !== 'ALL') params.append('attendance_type', attendanceTypeFilter);
      if (geofenceStatusFilter !== 'ALL') params.append('geofence_status', geofenceStatusFilter);

      const res = await api.get(`/field/geolocation-report?${params.toString()}`);
      setLogs(res?.data || res?.report || []);
    } catch (err) {
      console.error('Failed to load geo-location report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateRange, roleFilter, regionFilter, attendanceTypeFilter, geofenceStatusFilter]);

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = [
      'ID', 'Date', 'Time (Lagos)', 'BA/Agent Name', 'Employee Code', 'Role',
      'Designation', 'Activity', 'Attendance Type', 'Region', 'State',
      'Market / Location', 'Latitude', 'Longitude', 'Accuracy',
      'Distance From Assigned Location', 'Permitted Radius (m)', 'Geofence Status'
    ];

    const rows = logs.map(l => [
      l.id,
      l.date,
      l.server_time,
      `"${l.agent_name}"`,
      l.employee_code,
      l.role,
      `"${l.designation}"`,
      `"${l.activity}"`,
      l.attendance_type,
      l.region,
      l.state,
      `"${l.market}"`,
      l.latitude,
      l.longitude,
      l.accuracy_text,
      l.distance_formatted,
      l.permitted_radius,
      l.geofence_status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GeoLocation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics summary
  const totalEntries = logs.length;
  const verifiedCount = logs.filter(l => l.geofence_status === 'Verified').length;
  const outsideCount = logs.filter(l => l.geofence_status === 'Outside Geofence' || l.geofence_status === 'Blocked').length;
  const morningCount = logs.filter(l => l.attendance_type === 'MORNING_ATTENDANCE').length;
  const middayCount = logs.filter(l => l.attendance_type === 'MIDDAY_ATTENDANCE').length;
  const eveningCount = logs.filter(l => l.attendance_type === 'EVENING_CLOCK_OUT').length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="surface-card p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">
            <Globe size={14} />
            <span>Nigeria Geospatial Telemetry Engine (Africa/Lagos UTC+1)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Geo-Location & Shift Telemetry Report
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl">
            Live audit logs of GPS attendance check-ins, shift windows, geofence radius validations, and agent locations across Nigeria with individual map view.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-500/20 transition disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Telemetry Logs</div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{totalEntries}</div>
        </div>
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Geofence Verified</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{verifiedCount}</div>
        </div>
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Outside Geofence / Blocked</div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5">{outsideCount}</div>
        </div>
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Morning Clock-In (7-10:30a)</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{morningCount}</div>
        </div>
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Midday Clock-In (12-2p)</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{middayCount}</div>
        </div>
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Evening Clock-Out (5-9p)</div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{eveningCount}</div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Agent Name, Market, Activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadReport()}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="ALL">All Regions</option>
              <option value="WEST">WEST (Oyo, Ogun, Osun, Ondo)</option>
              <option value="LAGOS">LAGOS</option>
              <option value="NORTH">NORTH (Kano, Kaduna, Abuja)</option>
              <option value="EAST">EAST (Enugu, Anambra, Imo)</option>
              <option value="SOUTH">SOUTH (Rivers, Delta, Edo)</option>
            </select>
          </div>

          {/* Shift / Attendance Type Filter */}
          <div>
            <select
              value={attendanceTypeFilter}
              onChange={(e) => setAttendanceTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none"
            >
              <option value="ALL">All Attendance Types</option>
              <option value="MORNING_ATTENDANCE">Morning Attendance (7:00–10:30 AM)</option>
              <option value="MIDDAY_ATTENDANCE">Midday Attendance (12:00–2:00 PM)</option>
              <option value="EVENING_CLOCK_OUT">Evening Clock-Out (5:00–9:00 PM)</option>
              <option value="STAFF_CLOCK_IN">Staff Clock-In</option>
              <option value="TELEMETRY_PING">Route Telemetry Ping</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="surface-card rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="p-3 pl-4">ID</th>
                <th className="p-3">Date / Lagos Time</th>
                <th className="p-3">BA / Agent Name</th>
                <th className="p-3">Activity</th>
                <th className="p-3">Region</th>
                <th className="p-3">Market / Location</th>
                <th className="p-3">Designation</th>
                <th className="p-3">Latitude</th>
                <th className="p-3">Longitude</th>
                <th className="p-3">Server Time</th>
                <th className="p-3">Attendance Type</th>
                <th className="p-3">Distance</th>
                <th className="p-3">Geofence Status</th>
                <th className="p-3 pr-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading Geo-Location telemetry data...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-zinc-400">
                    No geo-location logs found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((row) => {
                  const isVerified = row.geofence_status === 'Verified';
                  const isOutside = row.geofence_status === 'Outside Geofence' || row.geofence_status === 'Blocked';

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="p-3 pl-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">
                        {row.id}
                      </td>
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        <div>{row.date}</div>
                        <div className="text-[10px] text-zinc-400">{row.server_time_formatted || row.server_time?.slice(11)}</div>
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{row.agent_name}</span>
                        </div>
                        <div className="text-[10px] font-normal text-zinc-400">{row.employee_code}</div>
                      </td>
                      <td className="p-3 text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                        {row.activity}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[10px]">
                          {row.region}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-800 dark:text-zinc-200 font-medium whitespace-nowrap">
                        <div>{row.market}</div>
                        <div className="text-[10px] text-zinc-400">{row.state}</div>
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {row.designation}
                      </td>
                      <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {Number(row.latitude).toFixed(5)}
                      </td>
                      <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {Number(row.longitude).toFixed(5)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {row.server_time}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.attendance_type === 'MORNING_ATTENDANCE'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : row.attendance_type === 'MIDDAY_ATTENDANCE'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : row.attendance_type === 'EVENING_CLOCK_OUT'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {row.attendance_type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {row.distance_from_assigned_location}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isVerified
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : isOutside
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        }`}>
                          {isVerified ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                          <span>{row.geofence_status}</span>
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedMapItem(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition border border-orange-200 dark:border-orange-900/50"
                        >
                          <Eye size={12} />
                          <span>View Location</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Map Modal */}
      {selectedMapItem && (
        <LocationMapModal
          item={selectedMapItem}
          onClose={() => setSelectedMapItem(null)}
        />
      )}
    </div>
  );
}
