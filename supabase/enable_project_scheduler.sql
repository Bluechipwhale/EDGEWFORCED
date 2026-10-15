-- Supabase only. Run after migration 011; no data is removed.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('edgewforce-project-reminders', '* * * * *', 'SELECT public.collaboration_process_due();');
