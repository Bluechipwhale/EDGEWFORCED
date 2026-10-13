import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  Layers,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Modal from '../common/Modal';
import { api } from '../../lib/api';

const TEMPLATES = [
  {
    id: 'sales_field',
    name: 'Commercial Sales Field Day',
    icon: '🛍️',
    title: 'Commercial Key Account Restock & POS Territory Audits',
    work_location: 'Commercial Retail Corridor',
    tasks: [
      {
        time_start: '08:30',
        time_end: '10:00',
        activity: 'Morning Commercial Briefing & SKU Allocation Check',
        category: 'Admin / Office',
        location: 'Regional Hub',
        priority: 'NORMAL',
        notes: 'Review promotional SKUs and trade stock allocations.',
        status: 'Planned'
      },
      {
        time_start: '10:30',
        time_end: '12:30',
        activity: 'Key Account Shelf Restock Audit & POS Check',
        category: 'Client Visit',
        location: 'Key Retail Supermarkets',
        priority: 'HIGH',
        notes: 'Inspect shelf share, verify POS terminal connectivity.',
        status: 'Planned'
      },
      {
        time_start: '13:30',
        time_end: '15:30',
        activity: 'B2B Merchant Direct Prospecting & Catalog Pitch',
        category: 'Sales Prospecting',
        location: 'Commercial Market Corridor',
        priority: 'HIGH',
        notes: 'Target new retail storefronts for wholesale orders.',
        status: 'Planned'
      },
      {
        time_start: '16:00',
        time_end: '17:00',
        activity: 'Daily Sales Settlement & EOD Reconciliations',
        category: 'Admin / Office',
        location: 'Regional Hub',
        priority: 'NORMAL',
        notes: 'Reconcile cash/transfer collections with ERP orders.',
        status: 'Planned'
      }
    ]
  },
  {
    id: 'field_audit',
    name: 'Store & Geofence Route Audit',
    icon: '📍',
    title: 'Retail Store Compliance & Geofence Verification',
    work_location: 'Assigned Territory Outlets',
    tasks: [
      {
        time_start: '08:30',
        time_end: '11:00',
        activity: 'Store Geofence Radius Verification & Signage Audit',
        category: 'Field Audit',
        location: 'Tier 1 Outlets',
        priority: 'NORMAL',
        notes: 'Verify 150m GPS geofence compliance and outdoor branding.',
        status: 'Planned'
      },
      {
        time_start: '11:30',
        time_end: '14:00',
        activity: 'Fast-Moving Goods Stock Count & Expiry Scan',
        category: 'Field Audit',
        location: 'Regional Supermarkets',
        priority: 'HIGH',
        notes: 'Barcode scan inventory and inspect storage standards.',
        status: 'Planned'
      },
      {
        time_start: '14:30',
        time_end: '16:30',
        activity: 'Merchant Satisfaction Review & Dispute Resolution',
        category: 'Client Visit',
        location: 'Trade Center Hub',
        priority: 'NORMAL',
        notes: 'Capture merchant feedback on logistics delivery turnaround.',
        status: 'Planned'
      }
    ]
  },
  {
    id: 'hq_office',
    name: 'HQ Operations & Project Sprint',
    icon: '🏢',
    title: 'Corporate Operations, System Telemetry & Workflow Execution',
    work_location: 'Corporate Headquarters',
    tasks: [
      {
        time_start: '08:30',
        time_end: '09:30',
        activity: 'Operational Sync & Daily Priorities Standup',
        category: 'Team Meeting',
        location: 'Operations Boardroom',
        priority: 'NORMAL',
        notes: 'Align on deliverables, system telemetry and pending approvals.',
        status: 'Planned'
      },
      {
        time_start: '10:00',
        time_end: '13:00',
        activity: 'Core Project Task Execution & Documentation',
        category: 'Admin / Office',
        location: 'HQ Office',
        priority: 'HIGH',
        notes: 'Complete milestone deliverables and department reports.',
        status: 'Planned'
      },
      {
        time_start: '14:00',
        time_end: '16:30',
        activity: 'Cross-Department Support & System Review',
        category: 'Support / Service',
        location: 'HQ Office',
        priority: 'NORMAL',
        notes: 'Address open helpdesk tickets and workforce syncs.',
        status: 'Planned'
      }
    ]
  },
  {
    id: 'delivery_logistics',
    name: 'Logistics & Fleet Dispatch',
    icon: '🚚',
    title: 'Fleet Delivery Manifest & Proof-of-Delivery Routing',
    work_location: 'Logistics Fleet Corridor',
    tasks: [
      {
        time_start: '08:00',
        time_end: '09:30',
        activity: 'Depot Waybill Verification & Vehicle Loading',
        category: 'Delivery / Dispatch',
        location: 'Central Warehouse',
        priority: 'HIGH',
        notes: 'Inspect seal integrity and manifest stock quantities.',
        status: 'Planned'
      },
      {
        time_start: '10:00',
        time_end: '14:00',
        activity: 'Scheduled Merchant Order Drop-offs & Electronic POD',
        category: 'Delivery / Dispatch',
        location: 'Customer Stores',
        priority: 'HIGH',
        notes: 'Collect client signature and photo proof of delivery.',
        status: 'Planned'
      },
      {
        time_start: '14:30',
        time_end: '16:30',
        activity: 'Returns Handling & Fleet Trip Debrief',
        category: 'Admin / Office',
        location: 'Central Depot',
        priority: 'NORMAL',
        notes: 'Submit signed waybills and return undamaged packaging.',
        status: 'Planned'
      }
    ]
  }
];

const CATEGORIES = [
  'Client Visit',
  'Field Audit',
  'Admin / Office',
  'Team Meeting',
  'Sales Prospecting',
  'Delivery / Dispatch',
  'Training / Onboarding',
  'Support / Service',
  'Other'
];

export default function SchedulePlannerModal({
  isOpen,
  onClose,
  initialSchedule = null,
  initialDate = null,
  onSuccess,
  user
}) {
  const [date, setDate] = useState(() => {
    if (initialSchedule?.date) return initialSchedule.date;
    if (initialDate) return initialDate;
    return new Date().toISOString().slice(0, 10);
  });

  const [title, setTitle] = useState('');
  const [shiftStart, setShiftStart] = useState('08:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [workLocation, setWorkLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialSchedule) {
      setDate(initialSchedule.date || new Date().toISOString().slice(0, 10));
      setTitle(initialSchedule.title || '');
      setShiftStart(initialSchedule.shift_start || '08:00');
      setShiftEnd(initialSchedule.shift_end || '17:00');
      setWorkLocation(initialSchedule.work_location || '');
      setNotes(initialSchedule.notes || '');
      setTasks(initialSchedule.tasks || []);
    } else {
      const defaultDate = initialDate || new Date().toISOString().slice(0, 10);
      setDate(defaultDate);
      setTitle(`Daily Work Plan - ${defaultDate}`);
      setShiftStart('08:00');
      setShiftEnd('17:00');
      setWorkLocation(user?.employee?.work_location || user?.employee?.territory || '');
      setNotes('');
      // Default with 2 blank task rows
      setTasks([
        {
          id: `task-${Date.now()}-1`,
          time_start: '08:30',
          time_end: '10:30',
          activity: 'Morning Operational Planning & Workstation Setup',
          category: 'Admin / Office',
          location: 'Assigned Workspace',
          priority: 'NORMAL',
          notes: '',
          status: 'Planned'
        },
        {
          id: `task-${Date.now()}-2`,
          time_start: '11:00',
          time_end: '13:00',
          activity: 'Priority Deliverable Execution',
          category: 'Client Visit',
          location: 'Operations Site',
          priority: 'HIGH',
          notes: '',
          status: 'Planned'
        }
      ]);
    }
    setErrorMsg('');
  }, [initialSchedule, initialDate, isOpen, user]);

  const handleApplyTemplate = (tmpl) => {
    setTitle(tmpl.title);
    setWorkLocation(tmpl.work_location);
    setTasks(tmpl.tasks.map((t, i) => ({
      ...t,
      id: `task-${Date.now()}-${i}`
    })));
  };

  const handleAddTask = () => {
    const lastTask = tasks[tasks.length - 1];
    let newStart = '14:00';
    let newEnd = '16:00';
    if (lastTask?.time_end) {
      newStart = lastTask.time_end;
      const [h, m] = newStart.split(':').map(Number);
      const endH = Math.min(h + 1, 23).toString().padStart(2, '0');
      newEnd = `${endH}:${m.toString().padStart(2, '0')}`;
    }

    setTasks([
      ...tasks,
      {
        id: `task-${Date.now()}-${tasks.length}`,
        time_start: newStart,
        time_end: newEnd,
        activity: '',
        category: 'Admin / Office',
        location: workLocation || 'Office',
        priority: 'NORMAL',
        notes: '',
        status: 'Planned'
      }
    ]);
  };

  const handleUpdateTask = (idx, field, val) => {
    setTasks(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleRemoveTask = (idx) => {
    setTasks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveTask = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === tasks.length - 1)) return;
    setTasks(prev => {
      const copy = [...prev];
      const target = idx + direction;
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSubmit = async (isDraft = false) => {
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg('Please enter a title or objective for your daily schedule.');
      return;
    }
    if (tasks.length === 0) {
      setErrorMsg('Please add at least one scheduled task activity for the day.');
      return;
    }
    for (let i = 0; i < tasks.length; i++) {
      if (!tasks[i].activity.trim()) {
        setErrorMsg(`Activity description is missing in item #${i + 1}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        date,
        title,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        work_location: workLocation,
        notes,
        tasks,
        status: isDraft ? 'DRAFT' : 'SUBMITTED'
      };

      const res = await api.post('/employee/schedule', payload);
      onSuccess?.(res.data || res);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save daily schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialSchedule ? 'Edit Daily Schedule' : 'Create & Submit Daily Schedule'}
      subtitle="Plan your daily itinerary, hourly tasks, and submit directly to your Supervisor and HR"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-xs text-zinc-800 dark:text-zinc-200">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Templates Carousel */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles size={14} className="text-orange-500" />
              <span>Quick Workday Templates (1-Click Fill)</span>
            </span>
            <span className="text-[11px] text-zinc-400">Click to auto-populate activities</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEMPLATES.map((tmpl) => (
              <button
                type="button"
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className="p-2.5 rounded-xl text-left border border-zinc-200 dark:border-zinc-800 surface-card-subtle hover:border-orange-500/50 hover:bg-orange-500/5 transition group"
              >
                <div className="text-base mb-1">{tmpl.icon}</div>
                <div className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 leading-tight">
                  {tmpl.name}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{tmpl.tasks.length} standard tasks</div>
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Header Fields */}
        <div className="p-4 rounded-xl surface-card-subtle border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                Schedule Date *
              </label>
              <input
                type="date"
                className="form-input w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                Shift Hours (Start - End) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  className="form-input w-full"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                />
                <span className="text-zinc-400 font-bold">to</span>
                <input
                  type="time"
                  className="form-input w-full"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                Primary Work Location / Territory *
              </label>
              <input
                type="text"
                placeholder="e.g. Lagos Mainland / Surulere Outlets"
                className="form-input w-full"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1 text-zinc-700 dark:text-zinc-300">
              Schedule Objective / Day Theme *
            </label>
            <input
              type="text"
              placeholder="e.g. Commercial Key Account Audits, POS Installations & Merchant Visits"
              className="form-input w-full font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Hourly Task Timeline Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              <span>Time-Slotted Task Itinerary ({tasks.length} items)</span>
            </h4>
            <button
              type="button"
              onClick={handleAddTask}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/10"
            >
              <Plus size={14} />
              <span>Add Time Slot</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {tasks.map((task, idx) => (
              <div
                key={task.id || idx}
                className="p-3.5 rounded-xl surface-card border border-zinc-200 dark:border-zinc-800 space-y-2.5 relative group hover:border-orange-500/40 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <input
                        type="time"
                        className="form-input py-1 px-2 text-xs w-24"
                        value={task.time_start}
                        onChange={(e) => handleUpdateTask(idx, 'time_start', e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        className="form-input py-1 px-2 text-xs w-24"
                        value={task.time_end}
                        onChange={(e) => handleUpdateTask(idx, 'time_end', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="form-input py-1 px-2 text-[11px] font-semibold"
                      value={task.category}
                      onChange={(e) => handleUpdateTask(idx, 'category', e.target.value)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <select
                      className={`form-input py-1 px-2 text-[11px] font-bold ${
                        task.priority === 'URGENT'
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          : task.priority === 'HIGH'
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                      value={task.priority}
                      onChange={(e) => handleUpdateTask(idx, 'priority', e.target.value)}
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent Priority</option>
                    </select>

                    {/* Move Up/Down Controls */}
                    <div className="flex items-center gap-0.5 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveTask(idx, -1)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === tasks.length - 1}
                        onClick={() => handleMoveTask(idx, 1)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                      title="Remove Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Activity Description (e.g. Shelf audit & retail stock count) *"
                      className="form-input w-full text-xs font-medium"
                      value={task.activity}
                      onChange={(e) => handleUpdateTask(idx, 'activity', e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Specific Site / Merchant Name / Address"
                      className="form-input w-full text-xs"
                      value={task.location}
                      onChange={(e) => handleUpdateTask(idx, 'location', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Notes, targets, deliverables or instructions (optional)..."
                    className="form-input w-full text-[11px] text-zinc-500 dark:text-zinc-400"
                    value={task.notes}
                    onChange={(e) => handleUpdateTask(idx, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Notes */}
        <div>
          <label className="block font-bold mb-1 text-zinc-700 dark:text-zinc-300">
            Supervisor & HR Daily Notes / Additional Context (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Following up on distributor backlog from Tuesday; expecting high client traffic in the afternoon..."
            className="form-input w-full text-xs"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-4 text-xs font-bold"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(true)}
              className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit(false)}
              className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20"
            >
              <Send size={14} className={saving ? 'animate-bounce' : ''} />
              <span>{saving ? 'Submitting...' : 'Submit to Supervisor & HR'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
