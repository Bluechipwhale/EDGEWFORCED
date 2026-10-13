import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export default function FirstLoginPasswordModal({
  user,
  isOpen = true,
  onPasswordChanged,
  onSuccess
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setError('Please provide your temporary password and a new permanent password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === 'ChangeMe123!') {
      setError('You cannot use the default temporary password. Please choose a secure personal password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      const updatedUser = {
        ...user,
        requires_password_change: false,
        onboarding_status: 'Password Changed'
      };
      onPasswordChanged?.(updatedUser);
      onSuccess?.(updatedUser);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please verify your current temporary password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-orange-500/30 animate-in zoom-in-95 duration-200">
        
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
            <KeyRound size={28} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
            Secure Your Account
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Welcome to EdgeWForce, <span className="font-bold text-zinc-800 dark:text-zinc-200">{user.full_name || user.email}</span>! As part of enterprise security compliance, please set your permanent password to proceed.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Temporary / Current Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <Lock size={14} className="absolute right-3.5 top-3 text-zinc-400" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              New Permanent Password (min. 8 characters)
            </label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <Lock size={14} className="absolute right-3.5 top-3 text-zinc-400" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <Lock size={14} className="absolute right-3.5 top-3 text-zinc-400" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldAlert size={14} />
                  <span>Update Password & Enter Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
