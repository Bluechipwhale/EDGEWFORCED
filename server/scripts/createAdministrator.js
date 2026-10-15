// Explicit provisioning of a separate administrator; never runs at app startup.
import bcrypt from 'bcryptjs';
import { db, supabaseAdmin } from '../src/config/database.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const companyId = Number(process.env.ADMIN_COMPANY_ID || 1);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).');
if (!Number.isSafeInteger(companyId) || !await db.findById('companies', companyId)) throw new Error('Choose an existing company with ADMIN_COMPANY_ID.');
if (await db.findOne('users', { email })) throw new Error('This email already has an account. No account or password has been changed.');
let identity = null;
if (db.isCloud) {
  if (!supabaseAdmin) throw new Error('Backend service credentials are required.');
  const {data,error} = await supabaseAdmin.auth.admin.createUser({email,password,email_confirm:true});
  if (error) throw error;
  identity = data.user.id;
}
try {
  const user = await db.insert('users', {company_id:companyId,full_name:process.env.ADMIN_NAME||'EdgeWForce Administrator',email,password_hash:await bcrypt.hash(password,12),role_code:'SUPER_ADMIN',status:'active',requires_password_change:false,...(identity?{auth_user_id:identity}: {})});
  console.log(`Created separate administrator ${user.email}. Existing accounts are unchanged.`);
} catch (error) {
  if (identity) await supabaseAdmin.auth.admin.deleteUser(identity);
  throw error;
}
