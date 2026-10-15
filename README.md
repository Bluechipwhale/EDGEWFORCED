# EDGEWFORCE
## Enterprise Commercial Sales, Field Operations & Workforce Automation Platform
**Powered by Experiential Edge / Integrated Marketing Solutions**

---

## 🌟 Executive Overview
**EdgeWForce** is a unified enterprise workforce operating system designed for high-velocity commercial sales distribution, field marketing operations, GPS telemetry, employee self-service, and organizational intelligence across Nigeria.

The platform eliminates operational blind spots by unifying:
1. **Commercial Sales Force Automation**: 12-section cockpit, POS order execution with Nigerian **7.5% VAT**, merchant credit control, receipt printing, debt collections, and an automated **5% Take-Home Commission Engine**.
2. **Field Operations & GPS Telemetry**: Route manifests, Leaflet OpenStreetMap telemetry with radar markers, **Strict 150-Meter Geofence Verification** (Haversine formula), store audits with HTML5 canvas customer signatures, and an unmutable **Emergency SOS Panic Beacon**.
3. **Corporate Employee Self-Service**: GPS attendance timesheet clock-in, biometric facial verification with confidence scoring, leave applications with working days calculation (excluding weekends), official downloadable payslips (Basic + Housing + Transport − PAYE & 8% Pension), and OKRs.
4. **HR Command Center & Governance**: Real-time workforce overview, live attendance monitoring, **10-minute non-invasive browser inactivity monitoring**, leave approvals, hierarchical task assignments (preventing upward assignment), SOS emergency queue, and an interactive organization chart.
5. **Sales AI Copilot**: Real-time tactical assistant for objection handling, cross-selling bundles, competitive pricing intelligence, and debt recovery dialogue.

---

## 🚀 Quick Start Guide

### 1. Requirements
- **Node.js**: `24.x`
- **npm**: `v9.0.0` or higher

### 2. Installation
Clone or open the project root directory and install dependencies:
```bash
# Install all workspaces from the root
npm ci
```

### 3. Running the Test Suite
The automated test suite covers strict 150m boundary calculations, 7.5% VAT, 5% commission, working days, payroll deductions, and end-to-end integration workflows:
```bash
cd server
npm test
```

### 4. Running the Development Server
You can launch both the backend API server and frontend Vite application concurrently:
```bash
# From the root directory:
npm run dev

# Or launch independently:
# Backend (Port 3000):
cd server && npm run dev

# Frontend (Port 5173):
cd client && npm run dev
```

### 5. Building for Production
```bash
cd client
npm run build
```
Once built, starting the server (`cd server && npm start`) automatically serves both the backend REST APIs and the built production SPA on `http://localhost:3000`.

---

## Initial access and data

Inventory, warehouses, staff, login accounts and schedules start empty. Startup and inventory reads do not import any bundled records. Departments, ranks, permissions and company settings remain available.

To create your first administrator, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters), then run:

```bash
node server/scripts/bootstrapAdmin.js
```

The bootstrap only works when the users table is empty and creates no employee record or inventory. For Supabase, use `supabase/install_empty_database.sql` (the app-compatible schema and migrations 006, 007, 009, 010 and 011), and configure `SUPABASE_SERVICE_ROLE_KEY`. No predefined login credentials are supplied.

To reset a local database, stop the server and run `node server/scripts/cleanDatabase.js`. This clears all local accounts and operational records while retaining structural configuration. `EDGEWFORCE_DATA_DIR` can select a different local store directory.

For an existing cloud database, stop the backend and apply `supabase/migrations/008_clean_staff_inventory_integer_ids.sql`. This removes staff/accounts, stock, linked authentication identities and related operational records, and converts application numeric columns and sequences to `INTEGER`. It preserves company configuration, UUID identities, foreign keys, policies and the staff directory view. An unsupported external dependency or an out-of-range retained value causes the transaction to roll back. Cloud changes require running this migration; editing the source does not modify an existing hosted database.

Use **Staff Directory → Import Staff** to upload CSV or Excel, preview invalid rows and duplicates, and download newly generated account credentials. A blank template is in `templates/staff-import-template.csv`. Use **Assign workplace** on a staff row to choose their office; changing a primary office updates the directory and check-in permissions, with history retained. No personal staff dataset ships with the application.

See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for production configuration, database migrations, administrator bootstrap, import instructions and hosting limitations. The active Supabase project is configured. See FEATURES.md and RELEASE_VERIFICATION.md for current capabilities and verification.

---

## 📐 Core Business Rules & Formulas

### 1. Strict 150-Meter Geofence Verification
Field check-ins require proximity verified mathematically using the **Haversine formula** with Earth Radius $R = 6,371,000\text{ m}$:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2R \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
- **Rule**: Check-in is allowed **only** if $d \le 150.0\text{ meters}$.
- Verified and enforced on both client and backend.

### 2. 5% Commercial Sales Commission Engine
$$\text{Take-Home Commission} = \text{Closed/Delivered Sales} \times 5\%$$
- Real-time milestone tracker shows current take-home earnings alongside quota achievement percentage.

### 3. POS Order Financial Calculations (Nigerian VAT)
$$\text{Taxable Amount} = \max(0, \text{Subtotal} - \text{Discount})$$
$$\text{VAT (7.5\%)} = \text{Taxable Amount} \times 0.075$$
$$\text{Grand Total} = \text{Taxable Amount} + \text{VAT}$$

### 4. Employee Payroll Deductions (Nigerian Labour & Tax Law)
- **Gross Pay**: $\text{Basic Salary} + \text{Housing} + \text{Transport} + \text{Other Allowances}$
- **Pension Contribution**: $8\%$ of $(\text{Basic} + \text{Housing} + \text{Transport})$
- **PAYE Income Tax**: Progressive tax bands with statutory consolidated relief
- **Net Pay**: $\text{Gross Pay} - (\text{PAYE} + \text{Pension} + \text{Other Deductions})$

### 5. 10-Minute Non-Invasive Workstation Idle Monitoring
- Workstation inactivity is tracked at 10 minutes (600,000 ms).
- **Ethics Guarantee**: No keylogging, no screen captures, no webcam recording.
- Non-invasive prompt allows staff to categorize inactive periods (*Break, Meeting, Field Work, Reading/Research, System Issue, Other*) with optional explanation for management review.

---

## 🗄️ Database Architecture & Migrations
The database layer is located in `supabase/migrations/`:
- `001_initial_schema.sql`: 32+ relational PostgreSQL tables with indexes, foreign keys, constraints, and audit tables.
- `002_security_rls.sql`: Row-Level Security (RLS) policies enforcing multi-tenant role permissions.
- `003_audit_triggers.sql`: Automated PostgreSQL audit triggers logging user actions.
- `seed.sql`: Structural reference data only; no staff or inventory records.
- `008_clean_staff_inventory_integer_ids.sql`: Existing database cleanup and conversion to INTEGER.
- `009_hr_import_and_workplace_assignments.sql`: HR support tables, protected API access and atomic workplace replacement/removal.
- `010_attendance_and_module_support.sql`: transactional attendance and module schema support.

*Data persistence*: Development without Supabase uses the persistent local store (`server/data/store.json`). Production requires Supabase or an explicitly configured durable local directory on a single server. Cloud errors are surfaced; the backend does not silently write to a local fallback.

---

## 🛡️ Security & Quality Assurance
- **Strict Role-Based Access Control (RBAC)** across 24 distinct permission categories.
- **Hierarchy Invalidation**: Supervisors and managers can assign tasks down to staff, but upward task assignment is rejected.
- **Biometric Identity Security**: Face verification generates biometric hashes; raw video streams are never transmitted or retained.
- **Offline Idempotency**: Queue keys (`IDEMP-ACTION-...`) ensure offline order bookings and check-ins never duplicate on network recovery.

---
*© 2026 Experiential Edge Nigeria Limited. All rights reserved.*

## Shared projects and task scheduling

Open **Projects & team chat** for private team projects, channels, message threads, mentions, shared task boards and daily/weekly schedules. Project reminders run every minute in Supabase. Existing operational modules remain available. See [FEATURES.md](FEATURES.md) for the complete guide.
