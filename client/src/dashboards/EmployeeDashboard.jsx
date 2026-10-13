import AttendanceControl from '../components/employee/AttendanceControl';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CalendarCheck,
  FileText,
  ClipboardList,
  Target,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import LeaveApplyModal from '../components/employee/LeaveApplyModal';
import PayslipModal from '../components/employee/PayslipModal';
import FaceVerificationModal from '../components/employee/FaceVerificationModal';
import { TodayTaskCenter } from '../components/tasks/TodayTaskCenter';
import { TaskCreateModal } from '../components/tasks/TaskCreateModal';
import { DailyReminderPrompt } from '../components/tasks/DailyReminderPrompt';
import GeoLocationReportView from '../components/field/GeoLocationReportView';
import EmployeeProfileView from '../components/employee/EmployeeProfileView';
import PublicStaffDirectoryView from '../components/employee/PublicStaffDirectoryView';
import DailyScheduleView from '../components/schedule/DailyScheduleView';
import { formatMoney, formatDate, formatTime } from '../lib/formatters';
import { getCurrentGPSLocation } from '../lib/geo';
import { api } from '../lib/api';

export default function EmployeeDashboard({ user, initialTab = 'dashboard' }) {
  const [tab, setTab] = useState(initialTab || 'dashboard');

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab === 'staff_directory' ? 'directory' : initialTab);
    }
  }, [initialTab]);

  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payslip, setPayslip] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [okrs, setOkrs] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [birthdaysList, setBirthdaysList] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState(null);

  // Modals
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const [clocking, setClocking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    try {
      const [dash, att, bal, reqs, pay, tList, oList, ann, bdays, sched] = await Promise.all([
        api.get('/employee/dashboard'),
        api.get('/employee/attendance'),
        api.get('/employee/leave/balances').catch(() => null),
        api.get('/employee/leave/requests').catch(() => []),
        api.get('/employee/payslips/latest').catch(() => null),
        api.get('/employee/tasks').catch(() => []),
        api.get('/employee/okrs').catch(() => []),
        api.get('/employee/announcements').catch(() => ({ data: [] })),
        api.get('/employee/birthdays').catch(() => ({ data: [] })),
        api.get('/employee/schedule/today').catch(() => null)
      ]);

      setDashboardData(dash);
      setAttendanceRecords(Array.isArray(att) ? att : (att?.records || []));
      setLeaveBalances(bal);
      setLeaveRequests(reqs || []);
      setPayslip(pay);
      setTasks(tList || []);
      setOkrs(oList || []);
      setAnnouncementsList(Array.isArray(ann) ? ann : (ann?.data || ann?.announcements || []));
      setBirthdaysList(Array.isArray(bdays) ? bdays : (bdays?.data || bdays?.birthdays || []));
      setTodaySchedule(sched?.data || sched || null);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Could not load your dashboard. Check your connection and try again.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClockAttendance = async (verificationMode = 'GPS') => {
    setClocking(true);
    setStatusMsg('');
    try {
      const p = await getCurrentGPSLocation();
      const lat = p.latitude;
      const lng = p.longitude;
      const accuracy = p.accuracy || 5;

      const res = await api.post('/employee/attendance/clock', {
        latitude: lat,
        longitude: lng,
        accuracy,
        verification_mode: verificationMode
      });

      setStatusMsg(res.clock_out_time ? '✓ Clocked out successfully!' : (res.message || '✓ Clocked in successfully with verified location.'));
      loadData();
    } catch (err) {
      setStatusMsg(`Check-in failed: ${err.message}`);
    } finally {
      setClocking(false);
    }
  };


  const handleToggleTask = async (task) => {
    try {
      const newStatus = task.status === 'completed' || task.status === 'Completed' ? 'Pending' : 'Completed';
      await api.put(`/employee/tasks/${task.id}`, { status: newStatus });
      loadData();
    } catch {
      // Handle error
    }
  };

  const handleUpdateOKR = async (okrId, newProgress) => {
    try {
      await api.put(`/employee/okrs/${okrId}`, { progress: newProgress });
      setOkrs(prev => prev.map(o => o.id === okrId ? { ...o, progress: newProgress } : o));
    } catch {
      // Handle error
    }
  };

  const todayAttendance = dashboardData?.todayAttendance;
  const isClockedIn = todayAttendance?.clock_in_time && !todayAttendance?.clock_out_time;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user?.employee?.position || 'Corporate Staff'} • {user?.employee?.department || 'Operations'} ({user?.employee?.employee_code})
          </p>
        </div>

        <div className="w-full xl:max-w-xl">
          <AttendanceControl onRecorded={loadData} />
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{statusMsg}</span>
        </div>
      )}

      {loadError && <p role="alert" className="p-3 rounded-lg text-rose-600 bg-rose-500/10 text-xs">{loadError}</p>}
      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
        {[
          ['dashboard', 'Dashboard'],
          ['schedule', 'Daily Schedule & Planner'],
          ['profile', 'My Staff Profile'],
          ['directory', 'Staff Directory'],
          ['attendance', 'Timesheet & Attendance'],
          ['leave', 'Leave Management'],
          ['payslip', 'Compensation & Payslips'],
          ['tasks', 'Assigned Tasks'],
          ['okrs', 'Objectives & Key Results'],
          ['geolocation', 'Geo-Location Report']
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id || (id === 'dashboard' && tab === 'home')}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              tab === id || (id === 'dashboard' && tab === 'home')
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: DASHBOARD WORKSPACE */}
      {(tab === 'dashboard' || tab === 'home') && (
        <div className="space-y-6">
          <DailyReminderPrompt
            user={user}
            onOpenTaskModal={() => setTaskModalOpen(true)}
            onTaskCreated={loadData}
          />

          {/* Today's Schedule Card */}
          <div className={`p-4 rounded-2xl border transition ${
            todaySchedule?.supervisor_status === 'APPROVED'
              ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30'
              : todaySchedule
              ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-orange-500/30'
              : 'surface-card border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CalendarCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      {todaySchedule ? todaySchedule.title : "Today's Work Schedule & Itinerary"}
                    </span>
                    {todaySchedule && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        todaySchedule.supervisor_status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                      }`}>
                        {todaySchedule.supervisor_status === 'APPROVED' ? 'Approved ✅' : todaySchedule.supervisor_status || 'Submitted'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {todaySchedule
                      ? `${todaySchedule.shift_start} - ${todaySchedule.shift_end} (${todaySchedule.total_planned_hours || 8}h) • ${(todaySchedule.tasks || []).length} scheduled tasks • ${todaySchedule.work_location || 'Assigned Territory'}`
                      : 'You haven\'t planned your work schedule for today yet. Submit your itinerary to your supervisor and HR.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTab('schedule')}
                className="btn-primary py-2 px-4 text-xs font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-sm"
              >
                <span>{todaySchedule ? 'View & Update Schedule' : 'Plan Today\'s Schedule'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <StatCard
              title="Attendance Status"
              value={isClockedIn ? 'CLOCKED IN' : (todayAttendance?.clock_out_time ? 'CLOCKED OUT' : 'NOT CLOCKED')}
              icon={Clock}
              subtitle={todayAttendance?.clock_in_time ? `Since ${formatTime(todayAttendance.clock_in_time)}` : 'Today'}
            />
            <StatCard
              title="Annual Leave"
              value={leaveBalances?.annual === undefined ? '—' : `${leaveBalances.annual} Days`}
              icon={Calendar}
              subtitle="Available Balance"
            />
            <StatCard
              title="Assigned Tasks"
              value={tasks.filter(t => t.status !== 'completed').length}
              icon={ClipboardList}
              subtitle="Pending Actions"
            />
            <StatCard
              title="Latest Net Pay"
              value={payslip ? formatMoney(payslip.net_pay) : '—'}
              icon={FileText}
              subtitle={payslip?.is_estimate ? 'Payroll not published' : new Date(payslip?.pay_month || Date.now()).toLocaleDateString('en-NG', {month:'long',year:'numeric',timeZone:'Africa/Lagos'})}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Announcements */}
            <div className="surface-card rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles size={16} className="text-orange-500" />
                  <span>Company Announcements & Notices</span>
                </h3>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  {announcementsList.length} Active
                </span>
              </div>

              <div className="space-y-2.5">
                {announcementsList.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-3.5 rounded-xl surface-card-subtle border transition ${
                      ann.pinned
                        ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/5 to-transparent'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {ann.pinned && <span className="text-orange-500 text-[10px]">📌</span>}
                        <span>{ann.title}</span>
                      </span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        ann.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-500'
                          : ann.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {ann.priority}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed whitespace-pre-line">
                      {ann.message || ann.body}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <span>By <b>{ann.author_name || 'HR Team'}</b></span>
                      <span>{formatDate(ann.created_at || ann.start_date)}</span>
                    </div>
                  </div>
                ))}

                {announcementsList.length === 0 && (
                  <div className="text-center p-6 text-zinc-400 text-xs italic">
                    No new announcements at this time.
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Holidays & Birthdays */}
            <div className="space-y-5">
              {/* Staff Celebrations & Birthdays */}
              <div className="surface-card rounded-xl p-5 space-y-3 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span className="text-base">🎂</span>
                    <span>Staff Birthdays & Celebrations</span>
                  </h3>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {birthdaysList.length} Upcoming
                  </span>
                </div>

                <div className="space-y-2">
                  {birthdaysList.map((b) => (
                    <div
                      key={b.id}
                      className={`p-2.5 rounded-xl surface-card-subtle flex items-center justify-between text-xs border ${
                        b.isToday
                          ? 'border-amber-500/40 bg-amber-500/10 shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          b.isToday ? 'bg-amber-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}>
                          {b.isToday ? '🎉' : '🎂'}
                        </div>
                        <div>
                          <b className="text-zinc-900 dark:text-zinc-100">{b.full_name}</b>
                          <div className="text-[10px] text-zinc-500">{b.position} • {b.department}</div>
                        </div>
                      </div>

                      <div>
                        {b.isToday ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] uppercase animate-pulse">
                            Today! 🎂
                          </span>
                        ) : (
                          <span className={`text-[11px] font-semibold ${b.daysUntil <= 7 ? 'text-orange-500 font-bold' : 'text-zinc-500'}`}>
                            {b.daysUntil === 1 ? 'Tomorrow' : b.daysUntil <= 30 ? `In ${b.daysUntil} days` : `In ${Math.round(b.daysUntil / 30)} mos`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {birthdaysList.length === 0 && (
                    <div className="text-center p-4 text-zinc-400 text-xs italic">
                      No upcoming staff birthdays in the next 30 days.
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Public Holidays */}
              <div className="surface-card rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Calendar size={16} className="text-orange-500" />
                  <span>Upcoming Public Holidays</span>
                </h3>
                <div className="space-y-2">
                  {(dashboardData?.holidays || [
                    { id: 1, name: 'National Public Holiday', date: '2026-10-01' },
                    { id: 2, name: 'Christmas Day', date: '2026-12-25' },
                    { id: 3, name: 'Boxing Day', date: '2026-12-26' }
                  ]).map((h) => (
                    <div key={h.id} className="p-2.5 rounded-lg surface-card-subtle flex items-center justify-between text-xs">
                      <b className="text-zinc-900 dark:text-zinc-100">{h.name}</b>
                      <span className="text-zinc-500 font-mono">{formatDate(h.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MY STAFF PROFILE */}
      {tab === 'profile' && (
        <EmployeeProfileView user={user} />
      )}

      {/* TAB: STAFF DIRECTORY */}
      {tab === 'directory' && (
        <PublicStaffDirectoryView />
      )}

      {/* TAB 2: TIMESHEET & ATTENDANCE */}
      {tab === 'attendance' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock size={18} className="text-orange-500" />
              <span>GPS Timesheet Records</span>
            </h3>
            <button onClick={() => handleClockAttendance('GPS')} className="btn-primary text-xs py-1.5 px-3">
              Clock In / Out
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Clock In</th>
                  <th className="pb-2">Clock Out</th>
                  <th className="pb-2">Hours Worked</th>
                  <th className="pb-2">Verification</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {attendanceRecords.map((att) => (
                  <tr key={att.id}>
                    <td className="py-3 font-bold">{formatDate(att.date)}</td>
                    <td className="py-3 font-mono">{formatTime(att.clock_in_time)}</td>
                    <td className="py-3 font-mono">{formatTime(att.clock_out_time)}</td>
                    <td className="py-3 font-bold">{att.working_hours || 0} hrs</td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {att.verification_mode || 'GPS'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.status === 'Present'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : (att.status === 'Late' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-500/10 text-zinc-400')
                      }`}>
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE MANAGEMENT */}
      {tab === 'leave' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="surface-card rounded-xl p-4.5 text-center">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Annual Leave</div>
              <div className="text-3xl font-black text-orange-500 mt-1">{leaveBalances?.annual ?? 20}</div>
              <div className="text-[10px] text-zinc-500 mt-1">days remaining</div>
            </div>
            <div className="surface-card rounded-xl p-4.5 text-center">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Sick Leave</div>
              <div className="text-3xl font-black text-emerald-500 mt-1">{leaveBalances?.sick ?? 12}</div>
              <div className="text-[10px] text-zinc-500 mt-1">days remaining</div>
            </div>
            <div className="surface-card rounded-xl p-4.5 text-center">
              <div className="text-[10px] font-bold uppercase text-zinc-400">Casual Leave</div>
              <div className="text-3xl font-black text-blue-500 mt-1">{leaveBalances?.casual ?? 5}</div>
              <div className="text-[10px] text-zinc-500 mt-1">days remaining</div>
            </div>
          </div>

          <div className="surface-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar size={18} className="text-orange-500" />
                <span>Leave Application History</span>
              </h3>
              <button onClick={() => setLeaveModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
                <Plus size={14} /> Apply for Leave
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Leave Type</th>
                    <th className="pb-2">Dates</th>
                    <th className="pb-2">Working Days</th>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {leaveRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="py-3 font-bold">{req.leave_type}</td>
                      <td className="py-3">{formatDate(req.start_date)} → {formatDate(req.end_date)}</td>
                      <td className="py-3 font-bold">{req.days} days</td>
                      <td className="py-3 text-zinc-500 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : (req.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500')
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPENSATION & PAYSLIP */}
      {tab === 'payslip' && (
        <div className="surface-card rounded-xl p-6 space-y-5 max-w-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                Latest Compensation Breakdown
              </h3>
              <p className="text-xs text-zinc-400">Period: {new Date(payslip?.pay_month || Date.now()).toLocaleDateString('en-NG', {month:'long',year:'numeric',timeZone:'Africa/Lagos'})}{payslip?.is_estimate ? ' · Draft estimate' : ''}</p>
            </div>
            <button onClick={() => setPayslipModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
              <FileText size={14} /> View Full Payslip
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {['HR', 'HR_MANAGER', 'CEO', 'SUPER_ADMIN', 'IT_ADMIN'].includes(user?.role_code || user?.rank?.code) ? (
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Basic Salary:</span>
                <b>{formatMoney(payslip?.basic_salary)}</b>
              </div>
            ) : (
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Base Salary:</span>
                <span className="text-zinc-400 italic font-mono">•••••••• (HR & CEO Only)</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Housing Allowance:</span>
              <b>{formatMoney(payslip?.housing_allowance)}</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Transport Allowance:</span>
              <b>{formatMoney(payslip?.transport_allowance)}</b>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100">
              <span>Gross Earnings:</span>
              <span className="text-emerald-500">{formatMoney(payslip?.gross_pay)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-rose-500">
              <span>PAYE Income Tax:</span>
              <span>-{formatMoney(payslip?.tax_paye)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-rose-500">
              <span>Employee Pension (8%):</span>
              <span>-{formatMoney(payslip?.pension)}</span>
            </div>
            <div className="flex justify-between py-3 text-base font-black text-orange-500">
              <span>Net Take-Home Pay:</span>
              <span>{formatMoney(payslip?.net_pay)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ASSIGNED TASKS & TASK INTELLIGENCE */}
      {tab === 'tasks' && (
        <TodayTaskCenter
          onOpenCreateModal={() => setTaskModalOpen(true)}
          currentEmployeeId={user?.employee?.id}
        />
      )}

      {/* TAB 6: OBJECTIVES & KEY RESULTS (OKRs) */}
      {tab === 'okrs' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Target size={18} className="text-orange-500" />
            <span>Annual Objectives & Key Results</span>
          </h3>

          <div className="space-y-4">
            {okrs.map((okr) => (
              <div key={okr.id} className="p-4 rounded-xl surface-card-subtle border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{okr.title}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{okr.description}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-500 font-mono">{okr.progress}%</span>
                </div>

                {/* Interactive Progress Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full accent-orange-500"
                  value={okr.progress}
                  onChange={(e) => handleUpdateOKR(okr.id, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: GEO-LOCATION REPORT */}
      {tab === 'geolocation' && (
        <GeoLocationReportView user={user} defaultRoleFilter="ALL" />
      )}

      {/* TAB: DAILY WORKFORCE SCHEDULE & PLANNER */}
      {(tab === 'schedule' || tab === 'schedules') && (
        <DailyScheduleView user={user} onNavigate={setTab} />
      )}

      {/* TAB 8: STAFF & COLLEAGUE DIRECTORY */}
      {(tab === 'directory' || tab === 'staff_directory') && (
        <PublicStaffDirectoryView />
      )}

      {/* TAB 9: EMPLOYEE OWN PROFILE */}
      {tab === 'profile' && (
        <EmployeeProfileView user={user} />
      )}

      {/* Modals */}
      <LeaveApplyModal
        balances={leaveBalances}
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onApplied={loadData}
      />
      <PayslipModal
        payslip={payslip}
        user={user}
        isOpen={payslipModalOpen}
        onClose={() => setPayslipModalOpen(false)}
      />
      <FaceVerificationModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        onVerified={() => handleClockAttendance('FACIAL')}
      />
      <TaskCreateModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
