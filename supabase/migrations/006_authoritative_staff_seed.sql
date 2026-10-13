-- ==============================================================================
-- EDGEWFORCE - AUTHORITATIVE PRODUCTION DATABASE SEED & SCHEMA MIGRATION
-- Migration: 006_authoritative_staff_seed.sql
-- Extends staff profile columns only; no personal data or accounts.
-- ==============================================================================

-- 1. EXTEND TABLES COLUMNS SAFELY
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'Account Created';
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS raw_phone TEXT;

ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS work_email TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Nigerian';
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS city_lga TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS state_of_origin TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS state_of_residence TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS department_raw TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS date_of_joining TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS work_location TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS supervisor_name TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS hobbies_interests TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE IF EXISTS public.employees ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'Account Created';

-- No staff or login accounts are seeded.
