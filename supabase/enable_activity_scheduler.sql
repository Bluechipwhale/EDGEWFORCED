-- Run after migration 012. Checks continue when browsers are closed or suspended.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('edgewforce-activity-monitor', '* * * * *', 'SELECT public.workforce_activity_process_due();');
