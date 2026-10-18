// ==============================================================================
// EDGEWFORCE - SUPABASE AUTHORITATIVE AUTHENTICATION SERVICE
// Single Source of Truth for Identity, Session Validation & Password Lifecycle
// ==============================================================================

import bcrypt from 'bcryptjs';
import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { db, supabase } from '../config/database.js';
import { supabaseAuthService } from './supabaseAuthService.js';
import { signUserToken } from '../middleware/auth.js';
import { recordAudit } from '../middleware/auditLogger.js';
import { hrService } from './hrService.js';
import { emailService } from './emailService.js';
import { normalizePhone, isEmail, normalizeEmail } from '../utils/phoneNormalizer.js';
import { logger } from '../utils/logger.js';

const isTestMode = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_MODE) || Boolean(process.env.NODE_TEST_CONTEXT);
const CLIENT_URL = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:5173';

export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const trimmedInput = String(identifier).trim();
  const isPhoneIdentifier = /^\+?[\d ()-]{8,20}$/.test(trimmedInput);
  let user = null;

  if (isEmail(trimmedInput)) {
    const normalizedEmail = normalizeEmail(trimmedInput);
    user = await db.findOne('users', { email: normalizedEmail });
    if (!user && (normalizedEmail === 'itadmin@edgewforce.com' || normalizedEmail === 'it-admin@edgewforce.com')) {
      user = await db.findOne('users', { email: 'it@edgewforce.com' }) || await db.findOne('users', { email: 'admin@edgewforce.com' });
    }
    if (!user) {
      const employees = await db.find('employees');
      const emp = employees.find(e => 
        (e.work_email && normalizeEmail(e.work_email) === normalizedEmail) ||
        (e.personal_email && normalizeEmail(e.personal_email) === normalizedEmail) ||
        (e.email && normalizeEmail(e.email) === normalizedEmail)
      );
      if (emp?.user_id) {
        user = await db.findById('users', emp.user_id);
      }
    }
  }

  if (!user && isPhoneIdentifier) {
    const normalizedPhone = normalizePhone(trimmedInput);
    if (normalizedPhone) {
      user = await db.findOne('users', { phone: normalizedPhone });
      if (!user) {
        const employees = await db.find('employees');
        const emp = employees.find(e => normalizePhone(e.phone) === normalizedPhone);
        if (emp?.user_id) {
          user = await db.findById('users', emp.user_id);
        }
      }
    }
  }

  // Fallback: Support login via Staff ID / Employee Code (e.g. EMP-1001, EMP-003, 003)
  if (!user && !isEmail(trimmedInput) && !isPhoneIdentifier) {
    const employees = await db.find('employees');
    const cleanInput = trimmedInput.toUpperCase();
    const numOnly = /^(?:EMP[- ]?)?\d{1,10}$/.test(cleanInput) ? cleanInput.replace(/[^0-9]/g, '') : '';
    const matches = employees.filter(e => {
      const exact = [e.employee_code, e.staff_id].some(v => String(v || '').toUpperCase() === cleanInput);
      const numeric = numOnly && [e.employee_code, e.staff_id].some(v => String(v || '').replace(/[^0-9]/g, '') === numOnly);
      return exact || numeric;
    });
    if (matches.length > 1) throw new Error('This staff ID is shared. Sign in with your email address or phone number.');
    const emp = employees.find(e => {
      const empCode = (e.employee_code || '').toUpperCase();
      const staffId = String(e.staff_id || '').toUpperCase();
      const empNum = empCode.replace(/[^0-9]/g, '');
      return (
        empCode === cleanInput ||
        staffId === cleanInput ||
        (numOnly && empNum === numOnly) ||
        (numOnly && staffId === numOnly)
      );
    });
    if (emp?.user_id) {
      user = await db.findById('users', emp.user_id);
    }
  }

  return user;
}

export const authService = {
  /**
   * Logs in an enterprise user via Supabase Auth with linked profile resolution.
   */
  async login(identifier, password, req = null) {
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password || identifier.length > 254 || password.length > 256) {
      throw new Error('Please enter your email address or phone number, and your password.');
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.status !== 'active') {
      throw new Error('This account has been deactivated. Please contact your HR administrator.');
    }

    let token = null;
    let refresh_token = null;
    let authUser = null;

    // 1. Supabase Auth Verification (Production / Live Cloud Mode)
    if (supabase && user.auth_user_id) {
      const result = await supabaseAuthService.signIn({ email: user.email, password });
      if (!result?.data?.session) throw new Error('Invalid login credentials or authentication service unavailable.');
      token = result.data.session.access_token; refresh_token = result.data.session.refresh_token; authUser = result.data.user;
    }
    if (!token && !isTestMode && user.email && !user.auth_user_id) {
      try {
        const sbRes = await supabaseAuthService.signIn({
          email: user.email,
          password
        });

        if (sbRes?.data?.session) {
          token = sbRes.data.session.access_token;
          refresh_token = sbRes.data.session.refresh_token;
          authUser = sbRes.data.user;

          if (authUser && user.auth_user_id !== authUser.id) {
            await db.update('users', user.id, { auth_user_id: authUser.id, uuid: authUser.id });
          }
        } else if (sbRes?.error) {
          // Check if local bcrypt password matches (e.g. initial seed account / offline record)
          const isMatch = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
          if (isMatch) {
            // Auto-provision and sync seamlessly into Supabase Auth!
            try {
              const provisionRes = await supabaseAuthService.provisionUser({
                email: user.email,
                password,
                fullName: user.full_name,
                roleCode: user.role_code
              });
              if (provisionRes?.authUserId) {
                await db.update('users', user.id, { auth_user_id: provisionRes.authUserId, uuid: provisionRes.authUserId });
                // Re-attempt sign-in with the freshly synced Supabase user
                const retryLogin = await supabaseAuthService.signIn({ email: user.email, password });
                if (retryLogin?.data?.session) {
                  token = retryLogin.data.session.access_token;
                  refresh_token = retryLogin.data.session.refresh_token;
                }
              }
            } catch (syncErr) {
              logger.warn(`Supabase seed sync note: ${syncErr.message}`);
            }
          }

          if (!token) {
            if (isMatch) {
              token = signUserToken(user);
            } else {
              throw new Error('Invalid email or password.');
            }
          }
        }
      } catch (err) {
        if (err.message.includes('Invalid email or password') || err.message.includes('Invalid login credentials')) {
          throw err;
        }
        logger.warn(`Supabase login attempt note: ${err.message}`);
      }
    }

    // 2. Fallback Verification (Local Store / Test Mode)
    if (!token) {
      const isMatch = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
      if (!isMatch) {
        throw new Error('Invalid login credentials.');
      }
      token = signUserToken(user);
    }

    // Update last login timestamp asynchronously
    db.update('users', user.id, { last_login_at: new Date().toISOString() }).catch(() => {});
    recordAudit(user, 'LOGIN', 'users', user.id, { email: user.email, phone: user.phone }, req).catch(() => {});

    const employee = await db.findOne('employees', { user_id: user.id }) ||
                     (user.auth_user_id ? await db.findOne('employees', { auth_user_id: user.auth_user_id }) : null);

    const [rank, department] = await Promise.all([
      employee?.rank_code ? db.findOne('ranks', { code: employee.rank_code }) : null,
      employee?.department_id ? db.findById('departments', employee.department_id) : (employee?.department ? { name: employee.department } : null)
    ]);

    const userProfile = {
      id: user.id,
      company_id: user.company_id,
      uuid: user.uuid || user.auth_user_id || user.id,
      auth_user_id: user.auth_user_id || user.uuid || null,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role_code: user.role_code,
      status: user.status,
      requires_password_change: Boolean(user.requires_password_change),
      onboarding_status: user.onboarding_status || 'Active',
      employee,
      rank,
      department
    };

    return {
      token,
      refresh_token,
      user: userProfile
    };
  },

  /**
   * Gets current user session profile.
   */
  async me(userId) {
    let user = await db.findById('users', userId) ||
               await db.findOne('users', { auth_user_id: userId }) ||
               await db.findOne('users', { uuid: userId });

    if (!user) throw new Error('User not found');

    const employee = await db.findOne('employees', { user_id: user.id }) ||
                     (user.auth_user_id ? await db.findOne('employees', { auth_user_id: user.auth_user_id }) : null);

    const [rank, department] = await Promise.all([
      employee?.rank_code ? db.findOne('ranks', { code: employee.rank_code }) : null,
      employee?.department_id ? db.findById('departments', employee.department_id) : (employee?.department ? { name: employee.department } : null)
    ]);

    return {
      id: user.id,
      company_id: user.company_id,
      uuid: user.uuid || user.auth_user_id || user.id,
      auth_user_id: user.auth_user_id || user.uuid || null,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role_code: user.role_code,
      status: user.status,
      requires_password_change: Boolean(user.requires_password_change),
      onboarding_status: user.onboarding_status || 'Active',
      employee,
      rank,
      department
    };
  },

  /**
   * Changes user password securely.
   */
  async changePassword(userId, currentPassword, newPassword, req = null) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const user = await db.findById('users', userId) ||
                 await db.findOne('users', { auth_user_id: userId }) ||
                 await db.findOne('users', { uuid: userId });

    if (!user) throw new Error('User not found');

    if (!currentPassword) throw new Error('Current password is required.');
    if (supabase && user.auth_user_id && !isTestMode) {
      const result = await supabaseAuthService.signIn({ email: user.email, password: currentPassword });
      if (!result?.data?.session) throw new Error('Current password is incorrect or the authentication service is unavailable.');
    } else if (user.password_hash) {
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        throw new Error('Current password is incorrect.');
      }
    }

    if (supabase && user.auth_user_id && !isTestMode) {
      if (!await supabaseAuthService.updatePassword(user.auth_user_id, newPassword)) throw new Error('Authentication password update failed. Try again.');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update('users', user.id, {
      password_hash: newHash,
      requires_password_change: false
    });

    await recordAudit(user, 'PASSWORD_CHANGED', 'users', user.id, {}, req);

    return { message: 'Password updated successfully.' };
  },

  /**
   * Registers a new staff member with Supabase Auth integration.
   */
  async registerEmployee(data, actor = null, req = null) {
    const parts = String(data.full_name || '').trim().split(/\s+/);
    return hrService.registerStaff({ ...data, first_name: data.first_name || parts[0], last_name: data.last_name || parts.slice(1).join(' ') }, actor, req);
  },

  /**
   * Generates a password recovery request using Supabase Auth.
   */
  async forgotPassword(identifier, req = null) {
    if (!identifier) throw new Error('Please provide your registered corporate email address or Staff ID.');
    const user = await findUserByIdentifier(identifier);

    let supabaseRecoveryDispatched = false;
    const targetEmail = user?.email || (isEmail(identifier) ? normalizeEmail(identifier) : null);

    // 1. Supabase Auth Recovery Dispatch (Official Cloud Flow)
    if (!isTestMode && targetEmail) {
      try {
        const { error } = await supabaseAuthService.requestPasswordReset(targetEmail);
        if (!error) {
          supabaseRecoveryDispatched = true;
        }
      } catch (err) {
        logger.warn(`Supabase resetPasswordForEmail note: ${err.message}`);
      }
    }

    // 2. Deterministic Reset Token for Test Suite / Legacy Compatibility
    const resetToken = isTestMode ? String(randomInt(100000, 1000000)) : randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    if (user) {
      await db.update('users', user.id, {
        reset_token: createHash('sha256').update(resetToken).digest('hex'),
        reset_token_expires_at: expiresAt
      });
      await recordAudit(user, 'PASSWORD_RESET_REQUESTED', 'users', user.id, { identifier }, req).catch(() => {});
    }

    let emailDelivered = supabaseRecoveryDispatched;
    if (!emailDelivered && user && targetEmail) {
      try {
        const emailResult = await emailService.sendPasswordResetEmail(targetEmail, resetToken, user?.full_name || 'Staff Member');
        emailDelivered = emailResult.delivered;
      } catch {
        emailDelivered = false;
      }
    }

    const targetIdentifier = user ? (user.email || user.phone || identifier) : identifier;
    const msg = emailDelivered || supabaseRecoveryDispatched
      ? `A password recovery link has been sent to ${targetEmail || targetIdentifier}. Please check your inbox.`
      : `If an account exists for ${targetIdentifier}, password recovery instructions have been processed.`;

    return {
      success: true,
      message: msg,
      ...(isTestMode ? { reset_token: resetToken } : {}),
      identifier: targetIdentifier,
      email_sent: emailDelivered || supabaseRecoveryDispatched
    };
  },

  /**
   * Resets password using Supabase Auth or verified token.
   */
  async resetPassword(identifier, token, newPassword, req = null) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    let user = identifier ? await findUserByIdentifier(identifier) : null;
    let verified = false;
    if (supabase && token) {
      const identity = await supabaseAuthService.getUserFromToken(token);
      if (identity) {
        const linked = await db.findOne('users', { auth_user_id: identity.id });
        if (linked && (!user || user.id === linked.id)) { user = linked; verified = true; }
      }
    }
    if (!verified && user?.reset_token && token && new Date(user.reset_token_expires_at) > new Date()) {
      const hash = createHash('sha256').update(String(token)).digest('hex');
      verified = user.reset_token.length === hash.length && timingSafeEqual(Buffer.from(user.reset_token), Buffer.from(hash));
    }
    if (!user || !verified) throw new Error('Invalid or expired recovery token. Request a new recovery link.');

    if (supabase && user.auth_user_id && !isTestMode && !await supabaseAuthService.updatePassword(user.auth_user_id, newPassword)) throw new Error('Authentication password update failed. Try again.');

    if (user) {
      const newHash = await bcrypt.hash(newPassword, 10);
      await db.update('users', user.id, {
        password_hash: newHash,
        reset_token: null,
        reset_token_expires_at: null,
        requires_password_change: false
      });
      await recordAudit(user, 'PASSWORD_RESET_COMPLETED', 'users', user.id, { identifier }, req).catch(() => {});
    }

    return {
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.'
    };
  }
};
