import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Briefcase,
  Calendar,
  CreditCard,
  HeartPulse,
  Shield,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  AlertTriangle,
  Send,
  Lock,
  Sparkles,
  History,
  CheckCircle2
} from 'lucide-react';
import { formatMoney, formatDate, formatTime } from '../../lib/formatters';

export default function StaffProfileDrawer({
  employee,
  isOpen,
  onClose,
  onEdit,
  onStatusChange,
  onResendInvitation,
  auditLogs = []
}) {
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [activeSection, setActiveSection] = useState('all');

  if (!isOpen || !employee) return null;

  const empAudits = (auditLogs || []).filter(
    a => String(a.entity_id) === String(employee.id) || (a.details && a.details.employee_id === employee.id)
  );

  const maskAccountNumber = (acc) => {
    if (!acc) return '—';
    const str = String(acc).trim();
    if (str.length <= 4) return str;
    return '•••• •••• ' + str.slice(-4);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-lg flex items-center justify-center shadow-md">
              {employee.first_name?.[0] || employee.full_name?.[0] || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()}
                </h2>
                {employee.staff_id && (
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    ID: {employee.staff_id}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {employee.employee_code}
                </span>
                {employee.flagged_for_review && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle size={10} /> HR Review Needed
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {employee.position || 'Staff Member'} • {employee.department || 'Operations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(employee)}
              className="btn-primary text-xs py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Edit3 size={13} />
              <span>Edit Staff</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Flagged Review Alert */}
        {employee.flagged_for_review && employee.review_reason && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Flagged for HR Review:</div>
              <div className="mt-0.5 text-[11px] opacity-90">{employee.review_reason}</div>
            </div>
          </div>
        )}

        {/* Section Filter Pills */}
        <div className="px-5 pt-3 pb-2 flex gap-1.5 overflow-x-auto border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold">
          {[
            ['all', 'All Sections'],
            ['personal', 'Personal'],
            ['contact', 'Contact'],
            ['employment', 'Employment'],
            ['emergency', 'Emergency'],
            ['banking', 'Banking & HR'],
            ['onboarding', 'Account Status'],
            ['audit', `Audit Trail (${empAudits.length})`]
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition ${
                activeSection === id
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          
          {/* SECTION 1: PERSONAL INFORMATION */}
          {(activeSection === 'all' || activeSection === 'personal') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <User size={14} className="text-orange-500" />
                <span>1. Personal Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-zinc-600 dark:text-zinc-300">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Full Name</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.full_name || `${employee.first_name} ${employee.last_name}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Date of Birth</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.date_of_birth || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Marital Status</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.marital_status || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Nationality</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.nationality || 'Nigerian'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: CONTACT INFORMATION */}
          {(activeSection === 'all' || activeSection === 'contact') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <Phone size={14} className="text-orange-500" />
                <span>2. Contact Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-zinc-600 dark:text-zinc-300">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Work Email</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-all">
                    {employee.work_email || <span className="text-zinc-400 italic">Not yet assigned</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Personal Email</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-all">
                    {employee.personal_email || employee.email || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Phone Number</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 font-mono">
                    {employee.phone || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">City / LGA</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.city_lga || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">State of Origin / Residence</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.state_of_origin || employee.state_of_residence || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Landmark / Bus Stop</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.landmark || '—'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Home Address</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.home_address || employee.address || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: EMPLOYMENT INFORMATION */}
          {(activeSection === 'all' || activeSection === 'employment') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <Briefcase size={14} className="text-orange-500" />
                <span>3. Employment Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-zinc-600 dark:text-zinc-300">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Staff ID</div>
                  <div className="font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                    {employee.staff_id || <span className="text-zinc-400 italic">Unassigned (EMP-{employee.id})</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">System Employee Code</div>
                  <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.employee_code}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Job Title / Position</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.position || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Department</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.department || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Date of Joining</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.date_of_joining || employee.hire_date || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Work Location</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.work_location || 'Headquarters'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Supervisor / Manager</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.supervisor_name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Rank Level</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.rank?.name || employee.rank_code || 'Staff'} (L{employee.rank?.level || 8})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Base Salary</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.base_salary ? formatMoney(employee.base_salary) : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: EMERGENCY CONTACT */}
          {(activeSection === 'all' || activeSection === 'emergency') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <HeartPulse size={14} className="text-rose-500" />
                <span>4. Emergency Contact</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-zinc-600 dark:text-zinc-300">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Contact Name</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.emergency_contact_name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Relationship</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.emergency_contact_relationship || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Emergency Phone</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 font-mono">
                    {employee.emergency_contact_phone || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: BANKING & SENSITIVE HR */}
          {(activeSection === 'all' || activeSection === 'banking') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                  <CreditCard size={14} className="text-emerald-500" />
                  <span>5. Banking & Sensitive HR Information</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="text-[11px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 hover:underline"
                >
                  {showAccountNumber ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{showAccountNumber ? 'Mask Details' : 'Reveal Account'}</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-zinc-600 dark:text-zinc-300">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Bank Name</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.bank_name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Account Number</div>
                  <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {showAccountNumber ? (employee.account_number || '—') : maskAccountNumber(employee.account_number)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Blood Group</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.blood_group || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: ADDITIONAL INFORMATION */}
          {(activeSection === 'all' || activeSection === 'personal') && employee.hobbies_interests && (
            <div className="space-y-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <Sparkles size={14} className="text-purple-500" />
                <span>6. Hobbies & Interests</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {employee.hobbies_interests}
              </p>
            </div>
          )}

          {/* SECTION 7: ACCOUNT & ONBOARDING STATUS */}
          {(activeSection === 'all' || activeSection === 'onboarding') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <Shield size={14} className="text-blue-500" />
                <span>7. Account & Onboarding Lifecycle</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-zinc-600 dark:text-zinc-300">
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Account Status</div>
                  <div className="mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      employee.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {employee.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Onboarding Phase</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.onboarding_status || 'Account Created'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">First Login Completed</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.first_login_at ? formatDate(employee.first_login_at) : <span className="text-zinc-400 italic">Pending First Sign-In</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Password Changed</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {employee.password_changed_at ? formatDate(employee.password_changed_at) : <span className="text-amber-600 italic font-semibold">Change Required on Login</span>}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 border-t border-zinc-200/40 dark:border-zinc-800/40">
                <button
                  type="button"
                  onClick={() => onResendInvitation?.(employee)}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Send size={12} />
                  <span>Resend Onboarding Invitation</span>
                </button>
                {employee.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(employee, 'suspended')}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg text-amber-600 border border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <span>Suspend Account</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStatusChange?.(employee, 'active')}
                    className="btn-secondary text-xs py-1.5 px-3 rounded-lg text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <span>Activate Account</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 8: AUDIT TRAIL */}
          {(activeSection === 'all' || activeSection === 'audit') && (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <History size={14} className="text-zinc-500" />
                <span>8. Staff Profile Audit History</span>
              </div>
              
              <div className="space-y-2">
                {empAudits.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 flex items-start justify-between gap-3 text-[11px]">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{log.action || 'PROFILE_UPDATED'}</div>
                      <div className="text-zinc-500 mt-0.5">By {log.actor_email || log.user_email || 'HR Administrator'}</div>
                      {log.metadata && (
                        <div className="mt-1 font-mono text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded">
                          {typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : log.metadata}
                        </div>
                      )}
                    </div>
                    <div className="text-zinc-400 text-[10px] shrink-0 font-mono">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
                {empAudits.length === 0 && (
                  <div className="text-center py-4 text-zinc-400 text-xs italic">
                    No HR modifications logged yet for this employee.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
