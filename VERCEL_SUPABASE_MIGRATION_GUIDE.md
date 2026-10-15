# Vercel and Supabase deployment

Follow [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for the schema, environment variables, administrator setup and verification steps.

Deploy from the repository root. The repository includes vercel.json and the Express serverless entrypoint api/index.js. Use Node.js 24.x and the installation/build commands in vercel.json. Set NODE_ENV=production, CLIENT_URL, JWT_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before building for browser email recovery.

For a fresh database run supabase/install_empty_database.sql, or use supabase/supabase_production_schema.sql followed by migrations 006, 007, 009, 010 and 011. No staff or inventory seed is needed. Migration 008 is destructive cleanup for an existing installation being cleared. Do not combine the separate legacy UUID schema with this integer-ID application schema.

Configure Supabase Auth site URL, recovery redirects and email delivery for the live domain. Bootstrap the first administrator using the command in the setup guide, then create offices and use Staff Directory → Import Staff.

Serverless environments require Supabase. Cloud errors are reported instead of falling back to ephemeral local storage. Smaller import files may be necessary to fit the hosting request-body limit. Test sign-in, import, office assignment and check-in on the deployed app before using real data.

The active Supabase project is tabuvkmkptaxrgygubjs. The application schema, collaboration migration and minute reminder job are installed. See RELEASE_VERIFICATION.md for hosted checks.
