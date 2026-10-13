// ==============================================================================
// EDGEWFORCE - SUPABASE AUTHENTICATION SERVICE MANAGER
// Authoritative Identity Provisioning, Authentication, and Password Lifecycle
// ==============================================================================

import { supabase, supabaseAdmin } from '../config/database.js';
import { logger } from '../utils/logger.js';

const isTestMode = process.env.NODE_ENV === 'test' || Boolean(process.env.TEST_MODE) || Boolean(process.env.NODE_TEST_CONTEXT);
const CLIENT_URL = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:5173';

export const supabaseAuthService = {
  /**
   * Provisions a real user in Supabase Auth (auth.users).
   * Supports both Admin API (service role key) and Client API (publishable key).
   */
  async provisionUser({ email, password, fullName, roleCode }) {
    if (isTestMode || !email) return null;
    if (!supabaseAdmin?.auth?.admin) throw new Error('Staff provisioning requires the Supabase service role.');
    if (!password || password.length < 12) throw new Error('Use an initial password of at least 12 characters.');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: email.toLowerCase().trim(), password, email_confirm: true, user_metadata: { full_name: fullName || 'Staff Member', role_code: roleCode || 'STAFF_MEMBER' } });
    if (error) throw new Error('Authentication account creation failed: ' + error.message);
    return { authUserId: data.user.id, user: data.user };
  },

  /**
   * Authenticates user against Supabase Auth using email and password.
   */
  async signIn({ email, password }) {
    if (isTestMode || !supabase?.auth || !email || !password) return null;
    try {
      const cleanEmail = email.toLowerCase().trim();
      const res = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      return res;
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Sends an official Supabase password reset email.
   */
  async requestPasswordReset(email) {
    if (isTestMode || !supabase?.auth || !email) return { error: new Error('Supabase not configured') };
    try {
      const cleanEmail = email.toLowerCase().trim();
      const redirectTo = `${CLIENT_URL}/#reset-password`;
      const res = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
      return res;
    } catch (err) {
      return { error: err };
    }
  },

  /**
   * Updates user password in Supabase Auth.
   */
  async updatePassword(authUserId, newPassword) {
    if (isTestMode || !newPassword) return false;
    if (supabaseAdmin?.auth?.admin && authUserId) {
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: newPassword
        });
        if (!error) return true;
      } catch (err) {
        logger.warn(`Supabase Admin password update notice: ${err.message}`);
      }
    }
    return false;
  },

  /**
   * Validates access token with Supabase Auth.
   */
  async getUserFromToken(token) {
    if (isTestMode || !supabase?.auth || !token) return null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        return data.user;
      }
    } catch {}
    return null;
  }
};
