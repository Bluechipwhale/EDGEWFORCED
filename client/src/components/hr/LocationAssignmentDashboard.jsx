// ==============================================================================
// EDGEWFORCE - WORK LOCATION MANAGEMENT & ASSIGNMENT COCKPIT
// Enterprise Individual Geofencing & Work Location Administration
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Building2,
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  Map,
  Sliders,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import LocationManagerModal from '../admin/LocationManagerModal';
import EmployeeLocationAssignModal from './EmployeeLocationAssignModal';
import { NIGERIA_STATES_AND_CITIES } from '../../data/nigeriaLocations';

export default function LocationAssignmentDashboard() {
  const [employeesSummary, setEmployeesSummary] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('assignments'); // 'assignments' | 'locations'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL' | 'Assigned' | 'Not Assigned' | 'Temporary Active'
  const [selectedType, setSelectedType] = useState('ALL');

  // Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState(null);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      const [summaryRes, locsRes] = await Promise.all([
        apiRequest('/locations/summary/status'),
        apiRequest('/locations')
      ]);

      const summaryList = Array.isArray(summaryRes) ? summaryRes : (summaryRes.data || summaryRes.summary || []);
      const locList = Array.isArray(locsRes) ? locsRes : (locsRes.data || locsRes.locations || []);

      setEmployeesSummary(summaryList);
      setLocations(locList);
    } catch (err) {
      setLoadError(err.message || 'Unable to load workplace assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Metrics
  const stats = useMemo(() => {
    const totalEmps = employeesSummary.length;
    const assignedEmps = employeesSummary.filter(e => e.has_location && e.status !== 'Not Assigned').length;
    const unassignedEmps = employeesSummary.filter(e => !e.has_location || e.status === 'Not Assigned').length;
    const tempEmps = employeesSummary.filter(e => e.status === 'Temporary Active').length;
    const totalLocs = locations.filter(l => l.status === 'active').length;

    return {
      totalEmps,
      assignedEmps,
      unassignedEmps,
      tempEmps,
      totalLocs,
      assignmentRate: totalEmps > 0 ? Math.round((assignedEmps / totalEmps) * 100) : 0
    };
  }, [employeesSummary, locations]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employeesSummary.filter(emp => {
      if (selectedStatus !== 'ALL' && emp.status !== selectedStatus) return false;
      if (selectedState !== 'ALL' && emp.state?.toLowerCase() !== selectedState.toLowerCase() && emp.assigned_location?.state?.toLowerCase() !== selectedState.toLowerCase()) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchCode = emp.employee_code?.toLowerCase().includes(q);
        const matchLoc = emp.assigned_location?.name?.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchLoc && !matchDept) return false;
      }
      return true;
    });
  }, [employeesSummary, searchTerm, selectedState, selectedStatus]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (selectedType !== 'ALL' && loc.location_type !== selectedType) return false;
      if (selectedState !== 'ALL' && loc.state?.toLowerCase() !== selectedState.toLowerCase()) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = loc.name?.toLowerCase().includes(q);
        const matchAddr = loc.address?.toLowerCase().includes(q);
        const matchCity = loc.city?.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchCity) return false;
      }
      return true;
    });
  }, [locations, searchTerm, selectedState, selectedType]);

  const handleDeleteLocation = async (locationId, locName) => {
    if (!window.confirm(`Are you sure you want to deactivate work location "${locName}"? Any employees assigned to it will require re-assignment.`)) return;
    try {
      await apiRequest(`/locations/${locationId}`, 'DELETE');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to deactivate location.');
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-red-600">{loadError}</p>}
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Building2 className="text-orange-500" size={24} />
            <span>Work Locations & Geofence Control</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Multi-location workforce management across 36 Nigerian States + FCT. Assign individual offices, markets, and field stores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditingLocation(null);
              setIsLocationModalOpen(true);
            }}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Work Location</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-semibold">Active Locations</span>
            <Building2 size={16} className="text-orange-500" />
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.totalLocs}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Offices, markets, hubs</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-semibold">Assigned Staff</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.assignedEmps}</div>
          <div className="text-[11px] text-zinc-500 mt-1">{stats.assignmentRate}% of workforce</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-semibold">Unassigned / Review</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.unassignedEmps}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Requires location review</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-semibold">Temporary Active</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.tempEmps}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Project & coverage sites</div>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-semibold">Total Staff</span>
            <Users size={16} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{stats.totalEmps}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Active company staff</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveSubTab('assignments')}
              className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'assignments'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Users size={15} />
              <span>Staff Location Assignments ({filteredEmployees.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('locations')}
              className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeSubTab === 'locations'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Building2 size={15} />
              <span>Work Locations Directory ({filteredLocations.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/10 flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={activeSubTab === 'assignments' ? 'Search employee name, code, department, location...' : 'Search location name, address, town...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Nigerian State Selector */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
            >
              <option value="ALL">All Nigerian States</option>
              {NIGERIA_STATES_AND_CITIES.map(item => (
                <option key={item.state} value={item.state}>{item.state}</option>
              ))}
            </select>

            {/* Sub-tab specific filter */}
            {activeSubTab === 'assignments' ? (
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
              >
                <option value="ALL">All Assignment Statuses</option>
                <option value="Assigned">Assigned (Active)</option>
                <option value="Temporary Active">Temporary Active</option>
                <option value="Not Assigned">Not Assigned / Review</option>
              </select>
            ) : (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
              >
                <option value="ALL">All Location Types</option>
                <option value="Office">Office</option>
                <option value="Market">Market</option>
                <option value="Store">Store</option>
                <option value="Supermarket">Supermarket</option>
                <option value="Client Location">Client Location</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Branch">Branch</option>
                <option value="Distributor">Distributor</option>
              </select>
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-orange-500" />
              <span>Loading workforce locations...</span>
            </div>
          ) : activeSubTab === 'assignments' ? (
            /* TAB 1: EMPLOYEE LOCATION ASSIGNMENTS TABLE */
            filteredEmployees.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs">
                No employees match the selected criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">State / Region</th>
                    <th className="py-3 px-4">Primary Assigned Location</th>
                    <th className="py-3 px-4">Radius</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredEmployees.map(emp => {
                    const isAssigned = emp.has_location && emp.status !== 'Not Assigned';
                    const isTemp = emp.status === 'Temporary Active';

                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center text-xs">
                              {(emp.first_name?.[0] || emp.name?.[0] || 'E')}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">{emp.name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                {emp.employee_code} • {emp.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">{emp.state}</div>
                          <div className="text-[11px] text-zinc-500">{emp.department}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {emp.assigned_location ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Building2 size={13} className="text-orange-500 shrink-0" />
                                <span>{emp.assigned_location.name}</span>
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {emp.assigned_location.location_type} • {emp.assigned_location.city || emp.assigned_location.state}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic">No location assigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                          {emp.assigned_location ? (
                            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[11px]">
                              {emp.assigned_location.geofence_radius}m
                            </span>
                          ) : '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          {isTemp ? (
                            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit">
                              <Clock size={11} />
                              <span>Temporary Active</span>
                            </span>
                          ) : isAssigned ? (
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 size={11} />
                              <span>Assigned</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit">
                              <AlertTriangle size={11} />
                              <span>Review Required</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedEmployeeForAssign(emp)}
                            className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                          >
                            {isAssigned ? 'Change Location' : 'Assign Location'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            /* TAB 2: WORK LOCATIONS DIRECTORY TABLE */
            filteredLocations.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs">
                No work locations match your search criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Workplace Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">State & LGA</th>
                    <th className="py-3 px-4">GPS Coordinates</th>
                    <th className="py-3 px-4">Permitted Radius</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredLocations.map(loc => (
                    <tr key={loc.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <MapPin size={14} className="text-orange-500 shrink-0" />
                          <span>{loc.name}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-5">{loc.address}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded text-[11px] font-semibold">
                          {loc.location_type || 'Office'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">{loc.state}</div>
                        <div className="text-[11px] text-zinc-500">{loc.city || loc.lga || 'HQ Axis'}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        {loc.latitude}, {loc.longitude}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 rounded text-[11px] font-bold">
                          {loc.geofence_radius || loc.geofence_radius_meters || 150}m
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          loc.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}>
                          {loc.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingLocation(loc);
                              setIsLocationModalOpen(true);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-orange-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Edit Location"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id, loc.name)}
                            className="p-1.5 text-zinc-500 hover:text-red-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Deactivate Location"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* Location Manager Modal */}
      {isLocationModalOpen && (
        <LocationManagerModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setEditingLocation(null);
          }}
          editLocation={editingLocation}
          onLocationSaved={() => loadData()}
        />
      )}

      {/* Employee Location Assign Modal */}
      {selectedEmployeeForAssign && (
        <EmployeeLocationAssignModal
          isOpen={Boolean(selectedEmployeeForAssign)}
          onClose={() => setSelectedEmployeeForAssign(null)}
          employee={selectedEmployeeForAssign}
          onAssignmentComplete={() => loadData()}
        />
      )}
    </div>
  );
}
