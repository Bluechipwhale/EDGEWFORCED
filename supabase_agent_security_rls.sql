-- ==============================================================================
-- EDGEWFORCE ENTERPRISE - STRICT AGENT ROW LEVEL SECURITY (RLS) POLICIES
-- Run this SQL in your Supabase SQL Editor / PostgreSQL console.
-- (c) Nexfeild. edgewforce.com
-- ==============================================================================

-- 1. Enable RLS on Operational Tables
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS store_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS location_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. ATTENDANCE & TIMESHEETS
-- ------------------------------------------------------------------------------
-- Agents can SELECT their own attendance records; Management can view all company records
DROP POLICY IF EXISTS "attendance_agent_select" ON attendance;
CREATE POLICY "attendance_agent_select" ON attendance
  FOR SELECT USING (
    employee_id = auth.uid()::text::integer 
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR', 'IT_ADMIN')
    )
  );

-- Agents can INSERT clock-in records for themselves
DROP POLICY IF EXISTS "attendance_agent_insert" ON attendance;
CREATE POLICY "attendance_agent_insert" ON attendance
  FOR INSERT WITH CHECK (
    employee_id = auth.uid()::text::integer 
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'SUPERVISOR')
    )
  );

-- Agents can UPDATE clock-out for themselves; Management can override
DROP POLICY IF EXISTS "attendance_agent_update" ON attendance;
CREATE POLICY "attendance_agent_update" ON attendance
  FOR UPDATE USING (
    employee_id = auth.uid()::text::integer 
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'SUPERVISOR')
    )
  );

-- AGENTS CAN NEVER DELETE ATTENDANCE RECORDS (Only Super Admins)
DROP POLICY IF EXISTS "attendance_no_agent_delete" ON attendance;
CREATE POLICY "attendance_no_agent_delete" ON attendance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'IT_ADMIN')
    )
  );

-- ------------------------------------------------------------------------------
-- 3. EMERGENCY SOS & BEACONS
-- ------------------------------------------------------------------------------
-- Agents can only view their own SOS incidents; Management can view all
DROP POLICY IF EXISTS "sos_agent_select" ON emergency_incidents;
CREATE POLICY "sos_agent_select" ON emergency_incidents
  FOR SELECT USING (
    agent_id = auth.uid()::text::integer 
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR', 'IT_ADMIN')
    )
  );

-- Agents can INSERT emergency distress beacons
DROP POLICY IF EXISTS "sos_agent_insert" ON emergency_incidents;
CREATE POLICY "sos_agent_insert" ON emergency_incidents
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()::text::integer
  );

-- AGENTS CAN NEVER RESOLVE, EDIT, OR DELETE EMERGENCY RECORDS (Management only)
DROP POLICY IF EXISTS "sos_mgmt_update_only" ON emergency_incidents;
CREATE POLICY "sos_mgmt_update_only" ON emergency_incidents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR')
    )
  );

DROP POLICY IF EXISTS "sos_no_agent_delete" ON emergency_incidents;
CREATE POLICY "sos_no_agent_delete" ON emergency_incidents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'IT_ADMIN')
    )
  );

-- ------------------------------------------------------------------------------
-- 4. TASKS & WORK ORDERS
-- ------------------------------------------------------------------------------
-- Agents can only see tasks assigned to them; Supervisors and HR see all
DROP POLICY IF EXISTS "tasks_agent_select" ON tasks;
CREATE POLICY "tasks_agent_select" ON tasks
  FOR SELECT USING (
    assigned_to = auth.uid()::text::integer
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR')
    )
  );

-- Agents can only update task progress/status on their assigned tasks
DROP POLICY IF EXISTS "tasks_agent_update_progress" ON tasks;
CREATE POLICY "tasks_agent_update_progress" ON tasks
  FOR UPDATE USING (
    assigned_to = auth.uid()::text::integer
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR')
    )
  );

-- AGENTS CAN NEVER DELETE OR CREATE TASKS (Only Supervisors and HR)
DROP POLICY IF EXISTS "tasks_mgmt_insert" ON tasks;
CREATE POLICY "tasks_mgmt_insert" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR')
    )
  );

DROP POLICY IF EXISTS "tasks_mgmt_delete_only" ON tasks;
CREATE POLICY "tasks_mgmt_delete_only" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'SUPERVISOR')
    )
  );

-- ------------------------------------------------------------------------------
-- 5. COMMERCIAL SALES ORDERS
-- ------------------------------------------------------------------------------
-- Sales agents can only view their own sales orders; Supervisors view team orders
DROP POLICY IF EXISTS "sales_orders_agent_select" ON sales_orders;
CREATE POLICY "sales_orders_agent_select" ON sales_orders
  FOR SELECT USING (
    agent_id = auth.uid()::text::integer
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT', 'SENIOR_ACCOUNTANT')
    )
  );

-- Sales agents can create orders
DROP POLICY IF EXISTS "sales_orders_agent_insert" ON sales_orders;
CREATE POLICY "sales_orders_agent_insert" ON sales_orders
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()::text::integer
  );

-- AGENTS CAN NEVER APPROVE OR DELETE SALES ORDERS (Supervisors/Managers only)
DROP POLICY IF EXISTS "sales_orders_mgmt_update" ON sales_orders;
CREATE POLICY "sales_orders_mgmt_update" ON sales_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'MANAGER', 'SUPERVISOR')
    )
  );

-- ------------------------------------------------------------------------------
-- 6. EMPLOYEE PROFILES & ASSIGNMENTS
-- ------------------------------------------------------------------------------
-- Employees can view their own profile; HR/Admins view all
DROP POLICY IF EXISTS "employees_self_select" ON employees;
CREATE POLICY "employees_self_select" ON employees
  FOR SELECT USING (
    id = auth.uid()::text::integer
    OR user_id = auth.uid()::text::integer
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text::integer 
      AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'HR_MANAGER', 'HR', 'MANAGER', 'SUPERVISOR', 'IT_ADMIN')
    )
  );

-- AGENTS CANNOT UPDATE ORGANIZATIONAL ASSIGNMENTS (Role, Location, Supervisor, Salary)
-- Protected by server-side controller and trigger validation
