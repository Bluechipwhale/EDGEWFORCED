// Structural configuration only. No accounts, staff, stock, or schedules.
export const initialState = {
  "companies": [
    {
      "id": 1,
      "uuid": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "name": "Experiential Edge Nigeria Limited",
      "business_type": "Commercial Sales & Field Operations",
      "industry": "Field Sales Force Automation & Workforce Operations",
      "registration_number": "RC-1849201",
      "email": "operations@edgewforce.com",
      "phone": "+2348000000001",
      "address": "15 Atiba Osborne, Mende, Maryland, Lagos",
      "country": "Nigeria",
      "state": "Lagos",
      "city": "Lagos",
      "logo_url": null,
      "status": "active",
      "created_at": "2026-10-12T16:35:34.988Z"
    }
  ],
  "company_settings": [
    {
      "id": 1,
      "company_id": 1,
      "working_days": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "working_hours_start": "08:00",
      "working_hours_end": "17:00",
      "geofence_radius": 150,
      "attendance_rules": {
        "require_gps": true,
        "require_selfie": false,
        "auto_checkout": true
      },
      "visit_rules": {
        "min_duration_minutes": 15,
        "require_photo": true,
        "require_signature": true
      },
      "sales_targets": {
        "monthly_target_ngn": 10000000,
        "commission_percent": 5
      },
      "currency": "NGN",
      "timezone": "Africa/Lagos",
      "active_modules": {
        "workforce": true,
        "attendance": true,
        "field": true,
        "sales": true,
        "crm": true,
        "payments": true,
        "inventory": true,
        "delivery": true,
        "reports": true,
        "tracking": true
      },
      "created_at": "2026-10-12T16:35:34.992Z"
    }
  ],
  "regions": [
    {
      "id": 1,
      "company_id": 1,
      "code": "SW",
      "name": "South-West Region (Lagos & Ogun)",
      "description": "Primary commercial hub and retail corridor"
    },
    {
      "id": 2,
      "company_id": 1,
      "code": "NC",
      "name": "North-Central Region (Abuja & Plateau)",
      "description": "Federal capital territory and northern gateway"
    },
    {
      "id": 3,
      "company_id": 1,
      "code": "SS",
      "name": "South-South / South-East (Rivers & Enugu)",
      "description": "Oil hub and eastern trade networks"
    }
  ],
  "territories": [
    {
      "id": 1,
      "company_id": 1,
      "region_id": 1,
      "code": "LAG-MAIN",
      "name": "Lagos Mainland"
    },
    {
      "id": 2,
      "company_id": 1,
      "region_id": 1,
      "code": "LAG-ISL",
      "name": "Lagos Island & Lekki"
    },
    {
      "id": 3,
      "company_id": 1,
      "region_id": 1,
      "code": "LAG-IKJ",
      "name": "Ikeja & Industrial"
    },
    {
      "id": 4,
      "company_id": 1,
      "region_id": 2,
      "code": "ABJ-CEN",
      "name": "Abuja Central"
    },
    {
      "id": 5,
      "company_id": 1,
      "region_id": 3,
      "code": "PH-METRO",
      "name": "Port Harcourt Metro"
    },
    {
      "id": 6,
      "company_id": 1,
      "region_id": 2,
      "code": "KAN-URB",
      "name": "Kano Urban"
    }
  ],
  "teams": [],
  "branches": [],
  "warehouses": [],
  "departments": [
    {
      "id": 1,
      "name": "Commercial Sales",
      "code": "SALES",
      "description": "Retail distribution & accounts"
    },
    {
      "id": 2,
      "name": "Field Operations",
      "code": "FIELD",
      "description": "Store audits & route execution"
    },
    {
      "id": 3,
      "name": "Human Resources",
      "code": "HR",
      "description": "People operations & welfare"
    },
    {
      "id": 4,
      "name": "Finance & Accounts",
      "code": "FINANCE",
      "description": "Treasury, collections & payroll"
    },
    {
      "id": 5,
      "name": "Technology & IT",
      "code": "TECH",
      "description": "Portal administration, security & telemetry"
    },
    {
      "id": 6,
      "name": "Executive Management",
      "code": "EXEC",
      "description": "Strategic leadership"
    }
  ],
  "ranks": [
    {
      "id": 1,
      "code": "CEO",
      "name": "Chief Executive Officer",
      "level": 1,
      "active": true
    },
    {
      "id": 2,
      "code": "IT_ADMIN",
      "name": "IT Super Admin / Portal Administrator",
      "level": 1,
      "active": true
    },
    {
      "id": 3,
      "code": "CTO",
      "name": "Chief Technology Officer",
      "level": 2,
      "active": true
    },
    {
      "id": 4,
      "code": "HR",
      "name": "Head of Human Resources",
      "level": 3,
      "active": true
    },
    {
      "id": 5,
      "code": "SENIOR_ACCOUNTANT",
      "name": "Head of Accounting & Payroll",
      "level": 4,
      "active": true
    },
    {
      "id": 6,
      "code": "ACCOUNTANT",
      "name": "Accountant",
      "level": 5,
      "active": true
    },
    {
      "id": 7,
      "code": "MANAGER",
      "name": "Regional Manager",
      "level": 6,
      "active": true
    },
    {
      "id": 8,
      "code": "SUPERVISOR",
      "name": "Field Operations Supervisor",
      "level": 7,
      "active": true
    },
    {
      "id": 9,
      "code": "STAFF",
      "name": "Operations Staff",
      "level": 8,
      "active": true
    }
  ],
  "permissions": [
    {
      "id": 1,
      "code": "view_dashboard",
      "name": "View Dashboard",
      "category": "General"
    },
    {
      "id": 2,
      "code": "view_employees",
      "name": "View Employees",
      "category": "HR"
    },
    {
      "id": 3,
      "code": "create_employee",
      "name": "Create Employee",
      "category": "HR"
    },
    {
      "id": 4,
      "code": "edit_employee",
      "name": "Edit Employee",
      "category": "HR"
    },
    {
      "id": 5,
      "code": "assign_tasks",
      "name": "Assign Tasks",
      "category": "Tasks"
    },
    {
      "id": 6,
      "code": "approve_leave",
      "name": "Approve Leave",
      "category": "HR"
    },
    {
      "id": 7,
      "code": "view_payroll",
      "name": "View Payroll",
      "category": "Finance"
    },
    {
      "id": 8,
      "code": "manage_payroll",
      "name": "Manage Payroll",
      "category": "Finance"
    },
    {
      "id": 9,
      "code": "view_attendance",
      "name": "View Attendance",
      "category": "HR"
    },
    {
      "id": 10,
      "code": "manage_attendance",
      "name": "Manage Attendance",
      "category": "HR"
    },
    {
      "id": 11,
      "code": "view_idle_reports",
      "name": "View Idle Reports",
      "category": "HR"
    },
    {
      "id": 12,
      "code": "manage_ranks",
      "name": "Manage Ranks",
      "category": "HR"
    },
    {
      "id": 13,
      "code": "view_sales",
      "name": "View Sales",
      "category": "Sales"
    },
    {
      "id": 14,
      "code": "create_orders",
      "name": "Create Orders",
      "category": "Sales"
    },
    {
      "id": 15,
      "code": "record_collections",
      "name": "Record Collections",
      "category": "Sales"
    },
    {
      "id": 16,
      "code": "view_customers",
      "name": "View Customers",
      "category": "Sales"
    },
    {
      "id": 17,
      "code": "create_customers",
      "name": "Create Customers",
      "category": "Sales"
    },
    {
      "id": 18,
      "code": "view_field_operations",
      "name": "View Field Operations",
      "category": "Field"
    },
    {
      "id": 19,
      "code": "manage_routes",
      "name": "Manage Routes",
      "category": "Field"
    },
    {
      "id": 20,
      "code": "view_sos",
      "name": "View SOS Alerts",
      "category": "Emergency"
    },
    {
      "id": 21,
      "code": "resolve_sos",
      "name": "Resolve SOS Alerts",
      "category": "Emergency"
    },
    {
      "id": 22,
      "code": "manage_products",
      "name": "Manage Products",
      "category": "Inventory"
    },
    {
      "id": 23,
      "code": "view_competitors",
      "name": "View Competitor Intel",
      "category": "Marketing"
    },
    {
      "id": 24,
      "code": "view_reports",
      "name": "View Reports",
      "category": "Executive"
    },
    {
      "id": 25,
      "code": "admin_portal",
      "name": "Super Admin Portal Access",
      "category": "IT"
    }
  ],
  "users": [],
  "employees": [],
  "customers": [],
  "products": [],
  "orders": [],
  "order_items": [],
  "order_approvals": [],
  "collections": [],
  "deliveries": [],
  "inventory_movements": [],
  "inventory_alerts": [],
  "visits": [],
  "visit_reports": [],
  "attendance": [],
  "location_tracking": [],
  "alerts": [],
  "performance_scores": [],
  "audit_logs": [],
  "stores": [],
  "store_requests": [],
  "work_locations": [],
  "employee_location_assignments": [],
  "location_assignment_history": [],
  "location_logs": [],
  "field_activities": [],
  "sales_activities": [],
  "location_alerts": [],
  "daily_summaries": [],
  "leave_balances": [],
  "leave_requests": [],
  "payslips": [],
  "okrs": [],
  "tasks": [],
  "task_reminders": [],
  "task_reminder_rules": [],
  "reminder_delivery_logs": [],
  "employee_idle_sessions": [],
  "escalation_rules": [],
  "announcements": [],
  "holidays": [
    {
      "id": 1,
      "name": "New Year's Day",
      "date": "2026-01-01",
      "description": "Public Holiday",
      "year": 2026
    },
    {
      "id": 2,
      "name": "Workers' Day",
      "date": "2026-05-01",
      "description": "International Workers Day",
      "year": 2026
    },
    {
      "id": 3,
      "name": "Democracy Day",
      "date": "2026-06-12",
      "description": "Democracy Day",
      "year": 2026
    },
    {
      "id": 4,
      "name": "Independence Day",
      "date": "2026-10-01",
      "description": "National Independence Day",
      "year": 2026
    },
    {
      "id": 5,
      "name": "Christmas Day",
      "date": "2026-12-25",
      "description": "Christmas Day",
      "year": 2026
    },
    {
      "id": 6,
      "name": "Boxing Day",
      "date": "2026-12-26",
      "description": "Boxing Day",
      "year": 2026
    }
  ],
  "schedules": [],
  "settlements": [],
  "sos": [],
  "idle_alerts": [],
  "push_subscriptions": [],
  "notifications": [],
  "face_events": []
  ,"collaboration_projects": []
  ,"collaboration_members": []
  ,"collaboration_channels": []
  ,"collaboration_messages": []
  ,"collaboration_tasks": []
  ,"collaboration_events": []
  ,"collaboration_notices": []
};
