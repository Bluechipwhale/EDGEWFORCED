import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
  UserCheck,
  Building2,
  Sparkles,
  Printer,
  CalendarCheck,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import StatCard from '../common/StatCard';
import SchedulePlannerModal from './SchedulePlannerModal';
import { formatDate, formatTime } from '../../lib/formatters';
import { api } from '../../lib/api';

export default function DailyScheduleView({ user, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [schedule, setSchedule] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/schedule');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setAllSchedules(list);

      const found = list.find(s => s.date === selectedDate);
      setSchedule(found || null);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const handleToggleTaskStatus = async (task) => {
    if (!schedule) return;
    const nextStatus = task.status === 'Completed' ? 'Planned' : 'Completed';
    try {
      await api.put(`/employee/schedule/${schedule.id}/tasks/${task.id}`, { status: nextStatus });
      setSchedule(prev => ({
        ...prev,
        tasks: (prev.tasks || []).map(t => t.id === task.id ? { ...t, status: nextStatus } : t)
      }));
    } catch (err) {
      console.warn('Failed to update task status:', err.message);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule) return;
    if (!confirm('Are you sure you want to cancel and delete this schedule?')) return;
    try {
      await api.delete(`/employee/schedule/${schedule.id}`);
      setStatusMsg('Schedule removed successfully.');
      loadSchedules();
    } catch (err) {
      setStatusMsg(`Delete failed: ${err.message}`);
    }
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const completedTasksCount = (schedule?.tasks || []).filter(t => t.status === 'Completed').length;
  const totalTasksCount = schedule?.tasks?.length || 0;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Date Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" /> Daily Workforce Scheduler
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            My Daily Schedule & Itinerary
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Plan hourly operational tasks, submit to your supervisor ({user?.employee?.supervisor_name || 'Assigned Supervisor'}) & HR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker & Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              className="bg-transparent border-0 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:ring-0 px-2 py-1 cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button
                onClick={handleToday}
                className="text-[11px] font-bold px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md hover:bg-orange-500/20 transition"
              >
                Today
              </button>
            )}
          </div>

          <button
            onClick={() => setPlannerOpen(true)}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl shadow-md shadow-orange-500/20"
          >
            <Plus size={15} />
            <span>{schedule ? 'Edit Schedule' : 'Create Day Schedule'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-semibold flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">×</button>
        </div>
      )}

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          title="Schedule Status"
          value={
            schedule?.status === 'APPROVED'
              ? 'APPROVED'
              : schedule?.status === 'SUBMITTED'
              ? 'SUBMITTED'
              : schedule?.status === 'REVISION_REQUESTED'
              ? 'REVISION REQ.'
              : schedule?.status === 'DRAFT'
              ? 'DRAFT'
              : 'NOT CREATED'
          }
          icon={CalendarCheck}
          subtitle={
            schedule?.status === 'APPROVED'
              ? 'Approved by Supervisor'
              : schedule?.status === 'SUBMITTED'
              ? 'Pending Review'
              : selectedDate
          }
        />
        <StatCard
          title="Shift Hours"
          value={schedule ? `${schedule.shift_start} - ${schedule.shift_end}` : '08:00 - 17:00'}
          icon={Clock}
          subtitle={schedule ? `${schedule.total_planned_hours || 8} Planned Hours` : 'Standard 8h Shift'}
        />
        <StatCard
          title="Task Completion"
          value={`${completedTasksCount} / ${totalTasksCount}`}
          icon={CheckCircle2}
          subtitle={`${progressPercent}% Tasks Completed`}
        />
        <StatCard
          title="Supervisor & HR"
          value={schedule?.supervisor_status === 'APPROVED' ? 'Approved ✅' : (schedule?.supervisor_status || 'Pending')}
          icon={UserCheck}
          subtitle={schedule?.supervisor_name || 'Assigned Supervisor'}
        />
      </div>

      {/* Main Schedule Content */}
      {schedule ? (
        <div className="space-y-6">
          {/* Status & Review Feedback Banner */}
          <div className={`p-4 rounded-2xl border transition ${
            schedule.supervisor_status === 'APPROVED'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : schedule.supervisor_status === 'REJECTED'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
              : schedule.supervisor_status === 'REVISION_REQUESTED'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
              : 'bg-orange-500/10 border-orange-500/20 text-orange-800 dark:text-orange-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {schedule.supervisor_status === 'APPROVED' ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : schedule.supervisor_status === 'REJECTED' ? (
                  <AlertCircle size={18} className="text-rose-500 shrink-0" />
                ) : (
                  <ShieldCheck size={18} className="text-orange-500 shrink-0" />
                )}
                <div>
                  <div className="font-extrabold text-xs">
                    {schedule.supervisor_status === 'APPROVED'
                      ? `Schedule Approved by ${schedule.supervisor_name || 'Supervisor'}`
                      : schedule.supervisor_status === 'REVISION_REQUESTED'
                      ? 'Supervisor Requested Revisions'
                      : schedule.supervisor_status === 'REJECTED'
                      ? 'Schedule Rejected by Supervisor'
                      : 'Submitted & Awaiting Supervisor Review'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {schedule.submitted_at ? `Submitted on ${formatDate(schedule.submitted_at)} at ${formatTime(schedule.submitted_at)}` : 'Draft schedule'}
                    {schedule.hr_status === 'ACKNOWLEDGED' && ' • Acknowledged by HR Command Center'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlannerOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-800 text-xs font-bold shadow-xs hover:bg-white dark:hover:bg-zinc-700 transition flex items-center gap-1 text-zinc-900 dark:text-zinc-100"
                >
                  <Edit3 size={13} />
                  <span>Edit Day</span>
                </button>
                {schedule.status !== 'APPROVED' && (
                  <button
                    onClick={handleDeleteSchedule}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition"
                    title="Cancel & Delete Schedule"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Supervisor Notes/Feedback */}
            {schedule.supervisor_notes && (
              <div className="mt-3 pt-2.5 border-t border-current/10 flex items-start gap-2 text-xs">
                <MessageSquare size={14} className="mt-0.5 shrink-0 opacity-70" />
                <div>
                  <span className="font-bold">Supervisor Feedback: </span>
                  <span>"{schedule.supervisor_notes}"</span>
                  {schedule.supervisor_reviewed_at && (
                    <span className="text-[10px] opacity-70 ml-2">({formatTime(schedule.supervisor_reviewed_at)})</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Schedule Objective & Location Card */}
          <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">
                  Primary Objective & Theme
                </span>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {schedule.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl self-start">
                <MapPin size={14} className="text-orange-500" />
                <span>{schedule.work_location || 'Assigned Territory'}</span>
              </div>
            </div>

            {schedule.notes && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                {schedule.notes}
              </p>
            )}
          </div>

          {/* Hourly Timeline Itinerary */}
          <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                <span>Hourly Itinerary & Task Execution</span>
              </h3>
              <span className="text-xs font-bold text-zinc-500">
                {completedTasksCount} of {totalTasksCount} Completed ({progressPercent}%)
              </span>
            </div>

            {/* Task Progress Bar */}
            <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Timeline Items */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {(schedule.tasks || []).map((task, idx) => {
                const isCompleted = task.status === 'Completed';
                return (
                  <div key={task.id || idx} className="relative group">
                    {/* Circle Node */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(task)}
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center transition border-2 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-900 border-orange-500 text-orange-500 hover:scale-110'
                      }`}
                      title={isCompleted ? 'Mark as Planned' : 'Mark as Completed'}
                    >
                      {isCompleted ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </button>

                    <div className={`p-4 rounded-xl border transition ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-950/10'
                        : 'surface-card-subtle border-zinc-200 dark:border-zinc-800 hover:border-orange-500/40'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md">
                            {task.time_start} - {task.time_end}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {task.category || 'General'}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-500'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-500'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          }`}>
                            {task.priority || 'NORMAL'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-500'
                          }`}
                        >
                          {isCompleted ? '✓ Completed' : 'Mark Done'}
                        </button>
                      </div>

                      <div className={`text-sm font-bold mt-2 ${isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {task.activity}
                      </div>

                      {task.location && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          <MapPin size={13} className="text-orange-500 shrink-0" />
                          <span>{task.location}</span>
                        </div>
                      )}

                      {task.notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 italic bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg">
                          "{task.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="surface-card rounded-2xl p-10 border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto text-2xl font-black">
            <CalendarCheck size={28} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
              No Daily Schedule for {formatDate(selectedDate)}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
              You haven't planned or submitted your work schedule for this date yet. Use our 1-click templates or create custom hourly tasks.
            </p>
          </div>
          <button
            onClick={() => setPlannerOpen(true)}
            className="btn-primary py-2.5 px-5 text-xs font-bold inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-md"
          >
            <Plus size={15} />
            <span>Plan & Submit Schedule for {formatDate(selectedDate)}</span>
          </button>
        </div>
      )}

      {/* Schedule Planner Modal */}
      <SchedulePlannerModal
        isOpen={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        initialSchedule={schedule}
        initialDate={selectedDate}
        onSuccess={() => {
          setStatusMsg('Daily schedule saved and submitted to Supervisor & HR!');
          loadSchedules();
        }}
        user={user}
      />
    </div>
  );
}
