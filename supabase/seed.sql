-- ==============================================================================
-- EDGEWFORCE - ENTERPRISE SEED DATA (seed.sql)
-- Structural reference data only; no staff or inventory records.
-- ==============================================================================

-- 1. DEPARTMENTS
INSERT INTO departments (name, code, description) VALUES
('Commercial Sales', 'SALES', 'Retail distribution, key accounts and merchant network'),
('Field Operations', 'FIELD', 'Store audits, route execution, merchandising and GPS verification'),
('Human Resources', 'HR', 'People operations, talent, leave and workforce welfare'),
('Finance & Accounts', 'FINANCE', 'Treasury, audit, collections, settlements and payroll'),
('Technology & Product', 'TECH', 'Platform infrastructure, cybersecurity and telemetry'),
('Executive Management', 'EXEC', 'Corporate leadership and strategic governance')
ON CONFLICT (code) DO NOTHING;

-- 2. RANKS
INSERT INTO ranks (code, name, level, description) VALUES
('CEO', 'Chief Executive Officer', 1, 'Top executive authority and corporate governance'),
('CTO', 'Chief Technology Officer', 2, 'Technology, cybersecurity and telemetry oversight'),
('HR', 'Head of Human Resources', 3, 'Workforce operations and people management'),
('SENIOR_ACCOUNTANT', 'Senior Accountant', 4, 'Financial approvals, payroll and cash reconciliation'),
('ACCOUNTANT', 'Accountant', 5, 'Collections ledger, invoice audits and reconciliations'),
('MANAGER', 'Regional Manager', 6, 'Territory operations and commercial targets'),
('SUPERVISOR', 'Field Operations Supervisor', 7, 'Route planning, shift oversight and store audits'),
('STAFF', 'Operations Staff', 8, 'Commercial sales agents, field officers and staff')
ON CONFLICT (code) DO NOTHING;

-- 3. PERMISSIONS
INSERT INTO permissions (code, name, category, description) VALUES
('view_dashboard', 'View Dashboard', 'General', 'Access to main workspace dashboard'),
('view_employees', 'View Employees', 'HR', 'View employee directory and organizational chart'),
('create_employee', 'Create Employee', 'HR', 'Add new employees to the workforce directory'),
('edit_employee', 'Edit Employee', 'HR', 'Modify employee profile and assignments'),
('delete_employee', 'Delete Employee', 'HR', 'Deactivate employee profile'),
('assign_tasks', 'Assign Tasks', 'Tasks', 'Assign tasks to subordinates in hierarchy'),
('approve_leave', 'Approve Leave', 'HR', 'Review and approve/reject leave applications'),
('view_payroll', 'View Payroll', 'Finance', 'View payroll summaries and compensation'),
('manage_payroll', 'Manage Payroll', 'Finance', 'Generate and publish monthly payslips'),
('view_attendance', 'View Attendance', 'HR', 'View team attendance and timesheets'),
('manage_attendance', 'Manage Attendance', 'HR', 'Correct or verify attendance anomalies'),
('view_idle_reports', 'View Idle Reports', 'HR', 'Review 10-minute inactivity reports and explanations'),
('manage_ranks', 'Manage Ranks', 'HR', 'Configure organizational ranks and levels'),
('view_sales', 'View Sales', 'Sales', 'Access commercial sales metrics and POS orders'),
('create_orders', 'Create Orders', 'Sales', 'Book POS sales orders with stock deduction'),
('record_collections', 'Record Collections', 'Sales', 'Post debt recovery collections into ledger'),
('view_customers', 'View Customers', 'Sales', 'Access customer register and credit balances'),
('create_customers', 'Create Customers', 'Sales', 'Register new outlets with GPS tagging'),
('view_field_operations', 'View Field Operations', 'Field', 'Access route manifest and live map'),
('manage_routes', 'Manage Routes', 'Field', 'Assign daily customer stops to field agents'),
('view_sos', 'View SOS Alerts', 'Emergency', 'Receive emergency panic beacon broadcasts'),
('resolve_sos', 'Resolve SOS Alerts', 'Emergency', 'Acknowledge and resolve SOS incidents'),
('manage_products', 'Manage Products', 'Inventory', 'Edit product SKUs, prices and stock counts'),
('manage_inventory', 'Manage Inventory', 'Inventory', 'Perform inventory adjustments and restocks'),
('view_competitors', 'View Competitor Intel', 'Marketing', 'Analyze competitor pricing and shelf share'),
('view_reports', 'View Management Reports', 'Executive', 'Access executive analytics and territory summaries'),
('manage_settings', 'Manage System Settings', 'Admin', 'Configure system parameters and telemetry thresholds')
ON CONFLICT (code) DO NOTHING;

-- 6. HOLIDAYS (Nigerian Public Holidays 2026)
INSERT INTO holidays (name, date, description, year) VALUES
('New Year''s Day', '2026-01-01', 'Public holiday commemorating the start of the year', 2026),
('Workers'' Day', '2026-05-01', 'International Labor Day celebration', 2026),
('Democracy Day', '2026-06-12', 'Commemoration of Nigeria''s democratic heritage', 2026),
('Independence Day', '2026-10-01', 'National Independence Day celebration', 2026),
('Christmas Day', '2026-12-25', 'Celebration of Christmas', 2026),
('Boxing Day', '2026-12-26', 'Boxing Day holiday', 2026)
ON CONFLICT (date) DO NOTHING;
