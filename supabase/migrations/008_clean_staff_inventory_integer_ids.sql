-- Clears staff/accounts, inventory, and dependent operational records.
-- Run with the backend stopped, as a database administrator.
-- Company configuration and reference tables are retained.
-- Converts application numeric identifiers to INTEGER. UUID authentication stays UUID.
-- The transaction rolls back if a retained value exceeds the INTEGER range,
-- or an unrecognised external dependency prevents conversion.
BEGIN;

CREATE TEMP TABLE cleanup_auth_ids (id UUID PRIMARY KEY) ON COMMIT DROP;
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND data_type = 'uuid' AND (
            (table_name = 'users' AND column_name IN ('id', 'auth_user_id')) OR
            (table_name = 'employees' AND column_name IN ('user_id', 'auth_user_id')) OR
            (table_name = 'profiles' AND column_name = 'id')
        )
    LOOP
        EXECUTE format('INSERT INTO cleanup_auth_ids SELECT DISTINCT %I FROM public.%I WHERE %I IS NOT NULL ON CONFLICT DO NOTHING',
            r.column_name, r.table_name, r.column_name);
    END LOOP;
END;
$$;

DO $$
DECLARE
    table_name TEXT;
    targets TEXT[] := ARRAY[
        'users', 'profiles', 'employees', 'products', 'inventory', 'warehouses', 'inventory_movements', 'inventory_alerts', 'stock_movements',
        'sales', 'orders', 'sale_items', 'order_items', 'order_approvals', 'collections',
        'deliveries', 'settlements', 'visits', 'field_visits', 'visit_reports', 'visit_audits',
        'attendance', 'location_tracking', 'employee_location_assignments', 'location_assignment_history',
        'location_logs', 'field_activities', 'sales_activities', 'location_alerts', 'daily_summaries',
        'leave_balances', 'leave_requests', 'payslips', 'okrs', 'tasks', 'task_reminders',
        'task_reminder_rules', 'reminder_delivery_logs', 'employee_idle_sessions', 'idle_records',
        'alerts', 'idle_alerts', 'sos', 'sos_events', 'notifications', 'push_subscriptions',
        'face_events', 'performance_scores', 'schedules', 'audit_logs', 'expenses'
    ];
BEGIN
    FOREACH table_name IN ARRAY targets LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', table_name);
        END IF;
    END LOOP;
    IF to_regclass('auth.users') IS NOT NULL THEN
        DELETE FROM auth.users WHERE id IN (SELECT id FROM cleanup_auth_ids);
    END IF;
END;
$$;

-- Save dependencies before changing column types; restore their original rules.
CREATE TEMP TABLE cleanup_foreign_keys ON COMMIT DROP AS
SELECT conrelid::regclass::TEXT AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace;

CREATE TEMP TABLE cleanup_policies ON COMMIT DROP AS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public';

CREATE TEMP TABLE cleanup_functions ON COMMIT DROP AS
SELECT oid::regprocedure::TEXT AS signature, prorettype, pg_get_functiondef(oid) AS definition,
       pg_get_userbyid(proowner) AS owner_name
FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN (
    'get_my_company_id', 'get_my_employee_id', 'get_my_role', 'is_super_admin',
    'handle_new_auth_user', 'audit_order_event', 'audit_collection_event'
);

CREATE TEMP TABLE cleanup_function_grants ON COMMIT DROP AS
SELECT p.oid::regprocedure::TEXT AS signature, a.grantee, a.is_grantable
FROM pg_proc p JOIN cleanup_functions f ON f.signature = p.oid::regprocedure::TEXT
CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
WHERE f.prorettype = 20 AND a.privilege_type = 'EXECUTE';

CREATE TEMP TABLE cleanup_directory_view ON COMMIT DROP AS
SELECT pg_get_viewdef(c.oid) AS definition, pg_get_userbyid(c.relowner) AS owner_name,
       array_to_string(c.reloptions, ', ') AS options
FROM pg_class c WHERE c.oid = to_regclass('public.public_employee_directory') AND c.relkind = 'v';
CREATE TEMP TABLE cleanup_directory_grants ON COMMIT DROP AS
SELECT grantee, privilege_type, is_grantable FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'public_employee_directory';

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT * FROM cleanup_policies LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
    DROP VIEW IF EXISTS public.public_employee_directory;
    FOR r IN SELECT * FROM cleanup_foreign_keys LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
    END LOOP;
    FOR r IN SELECT * FROM cleanup_functions WHERE prorettype = 20 LOOP
        EXECUTE format('DROP FUNCTION %s', r.signature);
    END LOOP;
END;
$$;

-- Type OIDs 20 and 1016 identify the old numeric scalar and array types.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname AS table_name, a.attname AS column_name, a.atttypid,
               pg_get_expr(d.adbin, d.adrelid) AS default_expression
        FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
          AND a.attnum > 0 AND NOT a.attisdropped AND a.atttypid IN (20, 1016)
    LOOP
        IF r.default_expression IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name);
        END IF;
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE %s USING %I::%s',
            r.table_name, r.column_name, CASE WHEN r.atttypid = 1016 THEN 'INTEGER[]' ELSE 'INTEGER' END,
            r.column_name, CASE WHEN r.atttypid = 1016 THEN 'INTEGER[]' ELSE 'INTEGER' END);
        IF r.default_expression IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %s', r.table_name, r.column_name,
                regexp_replace(r.default_expression, '\m' || format_type(20, NULL) || '\M', 'integer', 'gi'));
        END IF;
    END LOOP;
    FOR r IN
        SELECT c.oid::regclass::TEXT AS sequence_name FROM pg_sequence s
        JOIN pg_class c ON c.oid = s.seqrelid
        WHERE c.relnamespace = 'public'::regnamespace AND s.seqtypid = 20
    LOOP
        EXECUTE format('ALTER SEQUENCE %s AS INTEGER', r.sequence_name);
    END LOOP;
END;
$$;

DO $$
DECLARE r RECORD; policy_sql TEXT; role_names TEXT;
BEGIN
    FOR r IN SELECT * FROM cleanup_functions LOOP
        EXECUTE regexp_replace(r.definition, '\m' || format_type(20, NULL) || '\M', 'integer', 'gi');
    END LOOP;
    FOR r IN SELECT * FROM cleanup_functions WHERE prorettype = 20 LOOP
        EXECUTE format('ALTER FUNCTION %s OWNER TO %I', r.signature, r.owner_name);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.signature);
    END LOOP;
    FOR r IN SELECT * FROM cleanup_function_grants LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %s%s', r.signature,
            CASE WHEN r.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r.grantee)) END,
            CASE WHEN r.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
    END LOOP;
    FOR r IN SELECT * FROM cleanup_foreign_keys LOOP
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', r.table_name, r.conname, r.definition);
    END LOOP;
    FOR r IN SELECT * FROM cleanup_directory_view LOOP
        EXECUTE 'CREATE VIEW public.public_employee_directory' ||
            CASE WHEN r.options IS NOT NULL THEN ' WITH (' || r.options || ')' ELSE '' END ||
            ' AS ' || r.definition;
        EXECUTE format('ALTER VIEW public.public_employee_directory OWNER TO %I', r.owner_name);
    END LOOP;
    FOR r IN SELECT * FROM cleanup_directory_grants LOOP
        EXECUTE format('GRANT %s ON public.public_employee_directory TO %s%s', r.privilege_type,
            CASE WHEN r.grantee = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(r.grantee) END,
            CASE WHEN r.is_grantable = 'YES' THEN ' WITH GRANT OPTION' ELSE '' END);
    END LOOP;
    FOR r IN SELECT * FROM cleanup_policies LOOP
        SELECT string_agg(CASE WHEN role_name = 'public' THEN 'PUBLIC' ELSE quote_ident(role_name) END, ', ')
        INTO role_names FROM unnest(r.roles) AS role_name;
        policy_sql := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
            r.policyname, r.tablename, r.permissive, r.cmd, role_names);
        IF r.qual IS NOT NULL THEN
            policy_sql := policy_sql || ' USING (' || regexp_replace(r.qual, '\m' || format_type(20, NULL) || '\M', 'integer', 'gi') || ')';
        END IF;
        IF r.with_check IS NOT NULL THEN
            policy_sql := policy_sql || ' WITH CHECK (' || regexp_replace(r.with_check, '\m' || format_type(20, NULL) || '\M', 'integer', 'gi') || ')';
        END IF;
        EXECUTE policy_sql;
    END LOOP;
END;
$$;

COMMIT;
