# EdgeWForce production setup

Staff and inventory start empty. Application numeric IDs use INTEGER; authentication IDs remain UUID. Departments, ranks and company configuration remain available.

## Install and configure

Use Node.js 24.x. From the application folder:

```sh
npm ci
npm test
npm run build
```

Create `.env` from `.env.example`. Replace the placeholders for NODE_ENV=production, PORT, CLIENT_URL, JWT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. CLIENT_URL is the permitted browser origin; separate multiple origins with commas. JWT_SECRET must be a new random secret of at least 32 characters. Generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep the service role key on the backend. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY support browser email recovery and contain only public values. Build the frontend after setting its VITE variables. Never set a VITE service role key.

Run `npm start` to serve the frontend and API together. Configure HTTPS through your host or reverse proxy.

## Database

For a **new empty Supabase project**, run these files in the SQL Editor in order:

1. `supabase/supabase_production_schema.sql`
2. `supabase/migrations/006_authoritative_staff_seed.sql`
3. `supabase/migrations/007_supabase_auth_integration.sql`
4. `supabase/migrations/009_hr_import_and_workplace_assignments.sql`
5. `supabase/migrations/010_attendance_and_module_support.sql`
6. `supabase/migrations/011_project_collaboration.sql`

The release also includes `supabase/install_empty_database.sql`, which combines these files in order for a new project.

This is the integer-ID schema used by the Express app. `supabase/schema.sql` is a separate legacy UUID layout; do not combine the layouts in a new installation. No staff or inventory seed is needed.

For an **existing installation being cleared**, stop the app and export a backup before applying `008_clean_staff_inventory_integer_ids.sql`, then migrations 009 and 010. Migration 008 clears staff, accounts, linked authentication identities, inventory and dependent operational data. Migration 009 preserves staff data and adds HR support tables and transactional workplace assignments. It requires the app-compatible integer-ID schema and fails transactionally if retained duplicate staff IDs or unsupported dependencies need correction. Migration 010 adds attendance transactions and missing module tables and columns.

The API verifies the user and role before using the backend service role. Cloud persistence failures return errors without falling back to a local store. Workplace replacement/removal uses PostgreSQL transactions. Staff import processes rows individually, reports failures and compensates for failed provisioning; retrying skips successful imports. If provisioning is interrupted by a network failure, review failed rows and Supabase Auth for incomplete accounts before retrying.

## First administrator

Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (at least 12 characters) in your shell, then run:

```sh
node server/scripts/bootstrapAdmin.js
```

Bootstrap only works when the users table is empty. It creates one administrator and no staff or stock. Remove the bootstrap password from the environment afterward. Sign in and open **Staff Directory**.

## Import your HR directory

Choose **Staff Directory → Import Staff → Download blank CSV template**. Fill the template or upload Excel `.xlsx`. Columns:

```csv
staff_id,first_name,last_name,email,phone,department,position,work_location,hire_date
```

Each row needs first and last names plus an email or valid Nigerian mobile number. A `full_name` or `name` column is also accepted. Keep IDs such as `019` as text. Use YYYY-MM-DD dates. Limits: 500 staff, 5 MB per file, 50 Excel columns and 32 MB expanded Excel data. Replace Excel formulas with values.

Create offices under **Work Locations & Geofence** before naming them in a file. work_location must match one active office name, ignoring case. A default office can cover rows without one; leaving them unassigned is supported. Preview shows invalid rows and existing staff. Correct invalid rows before importing. Existing staff are skipped and retain their profiles.

After importing, download credentials before closing. Each new account has a unique temporary password, and the sign-in screen requires a password change. Share each password securely with its owner. Imports do not send invitations automatically. Accounts start as staff, and salaries start at zero until authorized HR/admin users enter real values and set roles. Credentials are not stored in the browser. The legacy JSON maintenance importer is restricted to development; use the validated HR screen in production.

## Assign or change an office

Choose **Assign workplace** on an employee row in **Staff Directory**:

- **Primary Workplace:** replaces the previous primary office and updates the directory and check-in permissions.
- **Allowed Secondary:** adds an explicitly permitted additional office.
- **Temporary Window:** allows an office during selected dates, including the whole end date in Africa/Lagos time.

HR/admin users can assign any staff member in their company. History retains the previous office and reason. Removing a primary assignment clears the directory label. Creating an office from the assignment dialog selects it automatically. Administrative imports and workplace changes require a connection and report failed saves.

## Hosting and verification

Attendance uses the server's Africa/Lagos clock for every employee role:

- Morning clock-in: 06:00 up to 12:00.
- Midday attendance: 12:00 up to 16:30, preserving the first clock-in.
- Clock-out: 16:30 up to midnight; a previous clock-in is required.

Clock actions require GPS inside an active assigned office, acceptable GPS accuracy and an online connection. The button follows the server window and disables duplicate or completed actions. Supervisors can explicitly correct exceptions. Migration 010 makes concurrent attendance writes transactional in PostgreSQL.

The repository has `vercel.json` and `api/index.js` for a Vercel deployment from its root. Use the configured install command `npm ci --include=dev --include=optional`, build command `npm --workspace client run build`, output `client/dist` and Node.js 24.x. Set the same production variables in that project; serverless environments require Supabase. Your host may impose a smaller request-body limit, so use smaller staff files if an upload is rejected. `/api/health` checks the API process; `/api/health/ready` returns 503 until the database and release migration are available.

Configure Supabase Auth's site URL, allowed recovery redirects and email delivery for your live domain. The local backend is available only on one long-running server with DATA_BACKEND=local and EDGEWFORCE_DATA_DIR pointing to durable storage. It is unsuitable for serverless or multiple server processes. Local recovery requires SMTP and a valid expiring recovery code.

Verification on 2026-10-15 includes automated server tests, browser collaboration checks with separate test users, PostgreSQL migration/permission checks and hosted readiness. The active EdgeWForce project is tabuvkmkptaxrgygubjs.supabase.co. A new administrator is provisioned explicitly; the account password is not stored in source. See FEATURES.md and RELEASE_VERIFICATION.md for the feature guide and validation results.

Staff import files are parsed in memory and are not uploaded to storage. Configure file storage policies for other modules appropriately; private HR and payroll files must not be exposed through public buckets.

## Shared projects and scheduled tasks

Apply migration 011 to an existing app-compatible installation. This migration is additive and does not clear staff, inventory, accounts or individual tasks. Open Projects & team chat to create a project, invite colleagues, use channels and threads, and schedule shared tasks. Dates are entered in Lagos time. Daily/weekly tasks create their next occurrence on completion.

Run supabase/enable_project_scheduler.sql after migration 011 to enable the Supabase minute-by-minute in-app reminder job. It does not require a Vercel Pro cron plan. Check cron.job and cron.job_run_details for execution status. The standalone server also processes due project reminders. Duplicate delivery is prevented by database uniqueness constraints. Existing individual-task email/WhatsApp background delivery still requires the reminder worker and configured providers.

To provision a separate administrator on a configured database, set ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters), optional ADMIN_NAME and ADMIN_COMPANY_ID, then run node server/scripts/createAdministrator.js. It refuses to overwrite an existing account. Remove the password from the environment afterward.

## Ten-minute app activity flags

Apply additive migration 012_workforce_activity.sql, then run supabase/enable_activity_scheduler.sql on the active Supabase project. Neither script clears staff, accounts, inventory or existing reports. Existing installations must apply this migration before deploying the updated API; readiness checks require its RPC.

The edgewforce-activity-monitor job runs every minute independently of Vercel requests. Inspect cron.job and cron.job_run_details for active/successful execution. Detection uses server timestamps and a 600-second threshold; the scheduled flag can appear up to one minute after the threshold, plus the 30-second notification refresh. Browser timers are not the sole detector. No SMTP or paid Vercel cron is needed for these in-app alerts.

Tracking applies to signed-in active employee profiles, across tabs. Explicit sign-out stops the user's active presence records. Browser close, sleep and network loss are marked as unconfirmed connection gaps. Office/device activity outside EdgeWForce is not visible. The interface discloses monitoring and lets staff explain a flag. This is not a tamper-proof productivity or attendance measurement. Preserve HR event history and restrict access using the existing company role policy.

For one durable local server, HR queue reads and staff heartbeats process due flags. Automatic unattended checks require a worker calling activityService.processDue for each company; the production Vercel deployment uses Supabase pg_cron instead.
