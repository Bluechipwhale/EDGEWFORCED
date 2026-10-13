// Create the first administrator explicitly; no predefined credentials or staff.
import bcrypt from 'bcryptjs';
import { db, supabase, supabaseAdmin } from '../src/config/database.js';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!email?.includes('@') || !password || password.length < 12) {
  throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters).');
}
const admin = {
  company_id: 1,
  full_name: process.env.BOOTSTRAP_ADMIN_NAME || 'Administrator',
  email,
  password_hash: bcrypt.hashSync(password, 10),
  role_code: 'SUPER_ADMIN',
  status: 'active',
  requires_password_change: false
};
if (supabase) {
  if (!supabaseAdmin) throw new Error('Cloud bootstrap requires SUPABASE_SERVICE_ROLE_KEY.');
  const { data: existing, error: lookupError } = await supabaseAdmin.from('users').select('id').limit(1);
  if (lookupError) throw lookupError;
  if (existing.length) throw new Error('Administrator bootstrap is only allowed on an empty users table.');
  const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) throw authError;
  const { error } = await supabaseAdmin.from('users').insert({ ...admin, auth_user_id: auth.user.id });
  if (error) {
    await supabaseAdmin.auth.admin.deleteUser(auth.user.id);
    throw error;
  }
} else {
  if ((await db.find('users')).length) throw new Error('Administrator bootstrap is only allowed on an empty users table.');
  await db.insert('users', admin);
}
console.log('Administrator created. The staff directory and inventory remain empty.');
