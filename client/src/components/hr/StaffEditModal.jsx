import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle2, ShieldCheck, User, Phone, Mail, Building, Briefcase, CreditCard, HeartPulse } from 'lucide-react';
import { api } from '../../lib/api';

export default function StaffEditModal({
  employee,
  isOpen,
  onClose,
  onSaved,
  onAssignWorkplace,
  ranks = [],
  departments = []
}) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        full_name: employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        personal_email: employee.personal_email || employee.email || '',
        work_email: employee.work_email || '',
        phone: employee.phone || '',
        date_of_birth: employee.date_of_birth || '',
        marital_status: employee.marital_status || 'Single',
        nationality: employee.nationality || 'Nigerian',
        address: employee.address || '',
        home_address: employee.home_address || '',
        city_lga: employee.city_lga || '',
        state_of_origin: employee.state_of_origin || '',
        state_of_residence: employee.state_of_residence || '',
        landmark: employee.landmark || '',
        staff_id: employee.staff_id || '',
        job_title: employee.position || employee.job_title || '',
        position: employee.position || '',
        department: employee.department || 'Operations',
        department_id: employee.department_id || 1,
        date_of_joining: employee.date_of_joining || employee.hire_date || '',
        work_location: employee.work_location || 'Not assigned',
        supervisor_name: employee.supervisor_name || '',
        rank_code: employee.rank_code || 'STAFF',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_relationship: employee.emergency_contact_relationship || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        blood_group: employee.blood_group || '',
        bank_name: employee.bank_name || '',
        account_number: employee.account_number || '',
        hobbies_interests: employee.hobbies_interests || '',
        base_salary: employee.base_salary || 0,
        housing_allowance: employee.housing_allowance || 0,
        transport_allowance: employee.transport_allowance || 0,
        status: employee.status || 'active',
        flagged_for_review: employee.flagged_for_review || false,
        review_reason: employee.review_reason || ''
      });
      setError('');
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    if (!formData.first_name && !formData.full_name) {
      setError('Please provide the employee name.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.put(`/hr/employees/${employee.id}`, formData);
      onSaved?.(res.data || res);
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update employee profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Edit Staff Profile</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400">
                {employee.staff_id || employee.employee_code}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Make validated HR updates to personal, employment, emergency contact, or banking records.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          
          {/* 1. Identity & Personal */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
              <User size={14} className="text-orange-500" />
              <span>Personal Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Date of Birth</label>
                <input
                  type="text"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Marital Status</label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Contact & Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
              <Phone size={14} className="text-orange-500" />
              <span>Contact Details & Address</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Work Email</label>
                <input
                  type="email"
                  name="work_email"
                  value={formData.work_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Personal Email</label>
                <input
                  type="email"
                  name="personal_email"
                  value={formData.personal_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Home Address</label>
                <input
                  type="text"
                  name="home_address"
                  value={formData.home_address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Landmark / Bus Stop</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">City / LGA</label>
                <input
                  type="text"
                  name="city_lga"
                  value={formData.city_lga}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">State of Origin / Residence</label>
                <input
                  type="text"
                  name="state_of_origin"
                  value={formData.state_of_origin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Employment & Role */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
              <Briefcase size={14} className="text-orange-500" />
              <span>Employment & Hierarchy</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Official Staff ID</label>
                <input
                  type="text"
                  name="staff_id"
                  value={formData.staff_id}
                  onChange={handleChange}
                  placeholder="e.g. 019"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Job Title / Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Work Location</label>
                <p className="text-sm py-2">{formData.work_location}</p>
                {onAssignWorkplace && <button type="button" onClick={() => onAssignWorkplace(employee)} className="text-xs text-orange-600 font-semibold">Assign workplace</button>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Supervisor / Manager Name</label>
                <input
                  type="text"
                  name="supervisor_name"
                  value={formData.supervisor_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Rank Level</label>
                <select
                  name="rank_code"
                  value={formData.rank_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="CEO">CEO (Level 1)</option>
                  <option value="IT_ADMIN">IT Admin (Level 1)</option>
                  <option value="CTO">CTO (Level 2)</option>
                  <option value="HR">HR (Level 3)</option>
                  <option value="ACCOUNTANT">Accountant (Level 4/5)</option>
                  <option value="MANAGER">Manager (Level 6)</option>
                  <option value="SUPERVISOR">Supervisor (Level 7)</option>
                  <option value="STAFF">Operations Staff (Level 8)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Base Salary (NGN)</label>
                <input
                  type="number"
                  name="base_salary"
                  value={formData.base_salary}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Emergency Contacts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
              <HeartPulse size={14} className="text-rose-500" />
              <span>Emergency Contact</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Relationship</label>
                <input
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Emergency Phone</label>
                <input
                  type="text"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 5. Banking & Sensitive HR */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
              <CreditCard size={14} className="text-emerald-500" />
              <span>Banking & Sensitive HR</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Account Number</label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Blood Group</label>
                <input
                  type="text"
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleChange}
                  placeholder="e.g. O+, AA"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. HR Review Flag */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="flagged_for_review"
                checked={formData.flagged_for_review}
                onChange={handleChange}
                className="rounded text-orange-500 focus:ring-orange-500"
              />
              <span className="font-bold text-amber-900 dark:text-amber-300">Flag this employee record for HR Review</span>
            </label>
            {formData.flagged_for_review && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Reason for Flagging</label>
                <input
                  type="text"
                  name="review_reason"
                  value={formData.review_reason}
                  onChange={handleChange}
                  placeholder="e.g. Missing official staff ID, need to verify bank account number"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs outline-none"
                />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-2">
            {!confirmOpen ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="btn-primary text-xs py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Save size={14} />
                <span>Review & Save Changes</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Confirm update?</span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Yes, Save to Production'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
