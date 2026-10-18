import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, AlertCircle, KeyRound, CheckCircle2, X, Lock, Mail, Eye, EyeOff, CalendarCheck, Users, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { supabase, updateSupabasePassword } from '../lib/supabase';

export default function LoginPage({ onLogin, onNavigatePublic }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Recovery State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = request reset email, 2 = set new password
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  // Detect Supabase Password Recovery from Email Action Link in URL
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('reset-password');

    if (isRecovery) {
      setIsRecoverySession(true);
      setForgotStep(2);
      setForgotModalOpen(true);
      setForgotSuccess('Recovery session established. Please set your new secure password below.');
    }

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoverySession(true);
          setForgotStep(2);
          setForgotModalOpen(true);
          setForgotSuccess('Recovery session verified. Please enter your new password.');
        }
      });
      return () => subscription?.unsubscribe();
    }
  }, []);

  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!identifier || !password) {
      setError('Please provide your corporate email address or phone number, and your password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/login', { identifier: identifier.trim(), password }, { requireOnline: true });
      const userData = res.user;
      let token = res.token;
      if (!token || !userData?.id) throw new Error('Sign-in did not return a valid staff profile. Please try again.');
      if (supabase && res.refresh_token) {
        const { data, error: sessionError } = await supabase.auth.setSession({ access_token: token, refresh_token: res.refresh_token });
        if (sessionError || !data.session) throw new Error('Could not save your secure session. Please try again.');
        token = data.session.access_token;
      }
      localStorage.setItem('ewf_token', token);
      localStorage.setItem('ewf_user', JSON.stringify(userData));
      onLogin?.(userData);
    } catch (err) {
      setError(err.message || 'Invalid login credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetToken = async (e) => {
    e?.preventDefault();
    if (!forgotIdentifier) {
      setForgotError('Please enter your registered corporate email address or staff ID.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      // If email, call Supabase Auth directly or via backend
      let emailToSend = forgotIdentifier.trim();
      
      const res = await api.post('/auth/forgot-password', { identifier: emailToSend });
      


      if (!supabase && res.email_sent) setForgotStep(2);
      setForgotSuccess(
        res.message ||
        `If an account exists for ${emailToSend}, a password recovery link has been sent. Please check your email inbox.`
      );
    } catch (err) {
      setForgotError(err.message || 'Failed to process password recovery request. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e?.preventDefault();
    if (!newPassword) {
      setForgotError('Please enter your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }
    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      // 1. Update in Supabase Auth if in active recovery session
      if (supabase && isRecoverySession) {
        await updateSupabasePassword(newPassword);
      }

      const recoverySession = supabase && isRecoverySession ? await supabase.auth.getSession() : null;
      // Synchronize the application account using the verified recovery session.
      const res = await api.post('/auth/reset-password', {
        identifier: forgotIdentifier,
        token: recoverySession?.data?.session?.access_token || recoveryCode.trim(),
        new_password: newPassword
      });

      setSuccessMsg(res.message || 'Password updated successfully! You can now sign in with your new password.');
      setForgotModalOpen(false);
      setForgotStep(1);
      setForgotIdentifier('');
      setNewPassword('');
      setConfirmPassword('');
      setIsRecoverySession(false);
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      setForgotError(err.message || 'Password update failed. Please request a new recovery link.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-experience min-h-screen bg-zinc-950 text-zinc-100 grid lg:grid-cols-12">
      {/* Left Branding Showcase */}
      <div className="hidden lg:flex lg:col-span-7 p-12 flex-col justify-between relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-r border-zinc-900 sunburst-bg">
        {/* Top Branding */}
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Logo" className="w-9 h-9" />
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              EDGE<span className="text-orange-500">W</span>FORCE
            </div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Powered by Experiential Edge
            </div>
          </div>
        </div>

        {/* Hero Narrative */}
        <div className="max-w-xl space-y-5 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
            <Sparkles size={13} />
            <span>Enterprise Workforce Operating System</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
            Your people.<br />Your projects.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-400">One shared rhythm.</span>
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
            Start your day, connect with your team and keep work moving. Your workstation, attendance and shared projects, together in one calm workspace.
          </p>

          <div className="flex items-center gap-6 text-xs text-zinc-400 pt-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-500" />
              <span>Built for teams, designed for people</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-500" />
              <span>Your workplace. Your daily flow.</span>
            </div>
          </div>
        </div>

        {/* Public Navigation Links */}
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <button onClick={() => onNavigatePublic?.('about')} className="hover:text-zinc-300 transition">About</button>
          <button onClick={() => onNavigatePublic?.('features')} className="hover:text-zinc-300 transition">Features</button>
          <button onClick={() => onNavigatePublic?.('privacy')} className="hover:text-zinc-300 transition">Privacy & Ethics</button>
          <button onClick={() => onNavigatePublic?.('terms')} className="hover:text-zinc-300 transition">Terms of Service</button>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-8"><img src="/favicon.svg" alt="" className="w-10 h-10" /><span className="text-lg font-bold tracking-tight">EdgeWForce<span className="block text-xs text-zinc-400 font-normal mt-1">Your working day, simplified.</span></span></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Welcome to your workspace</h2>
            <p className="text-xs text-zinc-400">
              Sign in with your work email, phone number or staff ID.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} />
              <span role="alert">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {capsLock && <p role="status" className="text-sm text-amber-300">Caps Lock is on.</p>}
          <form onSubmit={handleSignIn} className="space-y-5" aria-label="Staff sign in">
            <div>
              <label htmlFor="login-identifier" className="block text-sm font-semibold text-zinc-300 mb-2">Email, phone or staff ID</label>
              <div className="relative">
                <input
                  id="login-identifier"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  type="text"
                  required
                  className="form-input bg-zinc-900 border-zinc-800 text-white text-base py-3.5 pl-10 pr-12"
                  placeholder="name@company.com, 080… or EMP-003"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
                <Mail size={15} className="absolute left-3 top-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm font-semibold text-zinc-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(identifier || '');
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotStep(1);
                    setForgotModalOpen(true);
                  }}
                  className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                  required
                  className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2.5 pl-9"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1 p-3 text-zinc-400 hover:text-white">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                <Lock size={15} className="absolute left-3 top-3 text-zinc-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating…' : 'Let’s get to work'}</span>
              <ArrowRight size={15} />
            </button>
          </form>


          <div className="pt-3 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
            <span>Corporate Access Only</span>
            <span className="text-[11px] text-zinc-400 font-semibold">&copy; Nexfeild. edgewforce.com</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md surface-card rounded-2xl p-6 border border-zinc-800 shadow-2xl space-y-5 animate-fade-in text-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {forgotStep === 1 ? 'Recover Account Password' : 'Set New Permanent Password'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {forgotStep === 1
                      ? 'Enter your corporate email to receive a secure recovery link.'
                      : 'Choose a strong password (minimum 8 characters) to secure your account.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestResetToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Corporate Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2.5"
                    placeholder="e.g. name@company.com"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary text-xs py-2 px-4 font-bold"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Recovery Email'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-3.5">
                {!isRecoverySession && <div><label htmlFor="recovery-code" className="block text-xs font-bold text-zinc-300 mb-1">Recovery code from your email</label><input id="recovery-code" required value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2.5" autoComplete="one-time-code" /></div>}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">New Password (min 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2.5"
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2.5"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    ← Back to Step 1
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="btn-secondary text-xs py-2 px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="btn-primary text-xs py-2 px-4 font-bold"
                    >
                      {forgotLoading ? 'Saving…' : 'Save New Password'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

