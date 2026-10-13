// ==============================================================================
// EDGEWFORCE - EMPLOYEE & AGENT SECURE PROFILE VIEW
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  CreditCard,
  HeartPulse,
  KeyRound,
  Shield,
  CheckCircle2,
  Lock,
  X,
  Building2,
  Compass
} from 'lucide-react';
import { api } from '../../lib/api';

export default function EmployeeProfileView({ user }) {
  const [profile, setProfile] = useState(user?.employee || null);
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passData, setPassData] = useState({ current: '', next: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/employee/profile')
      .then(res => {
        if (res.data || res.profile) {
          setProfile(res.data || res.profile);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passData.current || !passData.next) {
      setPassError('Please fill all password fields.');
      return;
    }
    if (passData.next !== passData.confirm) {
      setPassError('New password and confirmation do not match.');
      return;
    }
    if (passData.next.length < 8) {
      setPassError('Password must be at least 8 characters long.');
      return;
    }

    setPassLoading(true);
    setPassError('');
    setPassMsg('');
    try {
      await api.post('/auth/change-password', {
        current_password: passData.current,
        new_password: passData.next
      });
      setPassMsg('Password updated successfully!');
      setPassData({ current: '', next: '', confirm: '' });
      setTimeout(() => setPasswordModalOpen(false), 1500);
    } catch (err) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const emp = profile || user?.employee || {};
  const isAgent = (user?.role_code || '').includes('AGENT') || ['PROMOTER', 'BRAND_AMBASSADOR'].includes(user?.role_code);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-4 sm:p-6">
      
      {/* Header Profile Banner */}
      <div className="surface-card rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            {emp.first_name?.[0] || user?.full_name?.[0] || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                {emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || user?.full_name}
              </h2>
              {emp.staff_id && (
                <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  ID: {emp.staff_id}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md font-mono text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {emp.employee_code || `EMP-${user?.id}`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
              <span>{emp.position || user?.role_code?.replace('_', ' ') || 'Field Operator'}</span>
              <span>•</span>
              <span>{emp.department || 'Commercial Operations'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setPasswordModalOpen(true)}
          className="btn-secondary text-xs py-2 px-3.5 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold flex items-center gap-1.5 self-start md:self-auto hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <KeyRound size={14} className="text-orange-500" />
          <span>Change Password</span>
        </button>
      </div>

      {/* Protected Organizational Assignments (Read-Only) */}
      <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            <Lock size={15} className="text-amber-500" />
            <span>Organizational & Hierarchy Assignments (Read-Only)</span>
          </div>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Protected By Enterprise RBAC
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Employee ID</div>
            <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">
              {emp.staff_id || emp.employee_code || `EMP-${user?.id}`}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Assigned Role</div>
            <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {user?.role_code || 'STAFF'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Assigned Location</div>
            <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {emp.assigned_location || emp.work_location || 'Lagos Central'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Assigned Supervisor</div>
            <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {emp.supervisor_name || 'Regional Operations Lead'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Department</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {emp.department || 'Field Operations'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Assigned Territory</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {emp.territory || emp.city_lga || emp.state_of_residence || 'Lagos State'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Employment Status</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>{emp.employment_status || 'Active'}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">Date Joined</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {emp.date_of_joining || emp.hire_date || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Personal Details */}
        <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
            <User size={15} className="text-orange-500" />
            <span>Personal Details</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Date of Birth</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{emp.date_of_birth || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Marital Status</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{emp.marital_status || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Nationality</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{emp.nationality || 'Nigerian'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Blood Group</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{emp.blood_group || '—'}</div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
            <Phone size={15} className="text-orange-500" />
            <span>Official Contact & Address</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Official Work Email</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 break-all">{emp.work_email || user?.email || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Phone Number</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">{emp.phone || user?.phone || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Residential Address</div>
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{emp.home_address || emp.address || '—'}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Password Change Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <KeyRound size={16} className="text-orange-500" />
                <span>Change Your Password</span>
              </h3>
              <button onClick={() => setPasswordModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            {passError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">
                {passError}
              </div>
            )}
            {passMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{passMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passData.current}
                  onChange={(e) => setPassData({ ...passData, current: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={passData.next}
                  onChange={(e) => setPassData({ ...passData, next: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passData.confirm}
                  onChange={(e) => setPassData({ ...passData, confirm: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="btn-secondary py-2 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  {passLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
