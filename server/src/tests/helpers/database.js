// Synthetic accounts for tests only; never imported by the application.
import bcrypt from 'bcryptjs';
import { db } from '../../config/database.js';
export { db };
const users = [
  {
    "id": 1,
    "company_id": 1,
    "full_name": "Test User 1",
    "email": "it@edgewforce.com",
    "phone": "+2348000000001",
    "role_code": "SUPER_ADMIN",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 2,
    "company_id": 1,
    "full_name": "Test User 2",
    "email": "ceo@edgewforce.com",
    "phone": "+2348000000002",
    "role_code": "CEO",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 3,
    "company_id": 1,
    "full_name": "Test User 3",
    "email": "hr@edgewforce.com",
    "phone": "+2348000000003",
    "role_code": "HR_MANAGER",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 4,
    "company_id": 1,
    "full_name": "Test User 4",
    "email": "sales@edgewforce.com",
    "phone": "+2348000000004",
    "role_code": "SALES_AGENT",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 5,
    "company_id": 1,
    "full_name": "Test User 5",
    "email": "field@edgewforce.com",
    "phone": "+2348000000005",
    "role_code": "FIELD_AGENT",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 6,
    "company_id": 1,
    "full_name": "Test User 6",
    "email": "accountant@edgewforce.com",
    "phone": "+2348000000006",
    "role_code": "ACCOUNTANT",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 7,
    "company_id": 1,
    "full_name": "Test User 7",
    "email": "supervisor@edgewforce.com",
    "phone": "+2348000000007",
    "role_code": "SUPERVISOR",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 8,
    "company_id": 1,
    "full_name": "Test User 8",
    "email": "staff@edgewforce.com",
    "phone": "+2348000000008",
    "role_code": "STAFF_MEMBER",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  },
  {
    "id": 9,
    "company_id": 1,
    "full_name": "Test User 9",
    "email": "admin@edgewforce.com",
    "phone": "+2348000000009",
    "role_code": "SUPER_ADMIN",
    "status": "active",
    "created_at": "2026-10-12T16:35:34.992Z"
  }
];
const employees = [
  {
    "id": 1,
    "company_id": 1,
    "user_id": 1,
    "employee_code": "EMP-1001",
    "first_name": "Test1",
    "last_name": "Employee",
    "phone": "+2348000000001",
    "department_id": 5,
    "department": "Technology & IT",
    "position": "IT Super Admin / System Engineer",
    "territory": "Headquarters",
    "rank_code": "IT_ADMIN",
    "base_salary": 1800000,
    "performance_score": 98,
    "status": "active"
  },
  {
    "id": 2,
    "company_id": 1,
    "user_id": 2,
    "employee_code": "EMP-1002",
    "first_name": "Test2",
    "last_name": "Employee",
    "phone": "+2348000000002",
    "department_id": 6,
    "department": "Executive Management",
    "position": "Chief Executive Officer",
    "territory": "National",
    "rank_code": "CEO",
    "base_salary": 2500000,
    "performance_score": 99,
    "status": "active"
  },
  {
    "id": 3,
    "company_id": 1,
    "user_id": 3,
    "employee_code": "EMP-1003",
    "first_name": "Test3",
    "last_name": "Employee",
    "phone": "+2348000000003",
    "department_id": 3,
    "department": "Human Resources",
    "position": "Head of Human Resources",
    "territory": "Headquarters",
    "rank_code": "HR",
    "base_salary": 1200000,
    "performance_score": 95,
    "status": "active"
  },
  {
    "id": 4,
    "company_id": 1,
    "user_id": 4,
    "employee_code": "EMP-1004",
    "first_name": "Test4",
    "last_name": "Employee",
    "phone": "+2348000000004",
    "department_id": 1,
    "department": "Commercial Sales",
    "position": "Senior Commercial Sales Agent",
    "territory": "Lagos Mainland",
    "supervisor_id": 7,
    "rank_code": "STAFF",
    "base_salary": 380000,
    "performance_score": 92.5,
    "status": "active"
  },
  {
    "id": 5,
    "company_id": 1,
    "user_id": 5,
    "employee_code": "EMP-1005",
    "first_name": "Test5",
    "last_name": "Employee",
    "phone": "+2348000000005",
    "department_id": 2,
    "department": "Field Operations",
    "position": "Field Operations Lead Agent",
    "territory": "Lagos Island & Lekki",
    "supervisor_id": 7,
    "rank_code": "STAFF",
    "base_salary": 350000,
    "performance_score": 88,
    "status": "active"
  },
  {
    "id": 6,
    "company_id": 1,
    "user_id": 6,
    "employee_code": "EMP-1006",
    "first_name": "Test6",
    "last_name": "Employee",
    "phone": "+2348000000006",
    "department_id": 4,
    "department": "Finance & Accounts",
    "position": "Head of Accounting & Payroll",
    "territory": "Headquarters",
    "rank_code": "ACCOUNTANT",
    "base_salary": 1100000,
    "performance_score": 90,
    "status": "active"
  },
  {
    "id": 7,
    "company_id": 1,
    "user_id": 7,
    "employee_code": "EMP-1007",
    "first_name": "Test7",
    "last_name": "Employee",
    "phone": "+2348000000007",
    "department_id": 2,
    "department": "Field Operations",
    "position": "Field Operations Supervisor",
    "territory": "Lagos Island",
    "rank_code": "SUPERVISOR",
    "base_salary": 750000,
    "performance_score": 96,
    "status": "active"
  },
  {
    "id": 8,
    "company_id": 1,
    "user_id": 8,
    "employee_code": "EMP-1008",
    "first_name": "Test8",
    "last_name": "Employee",
    "phone": "+2348000000008",
    "department_id": 3,
    "department": "Corporate Operations",
    "position": "Workforce Operations Analyst",
    "territory": "Headquarters",
    "supervisor_id": 3,
    "rank_code": "STAFF",
    "base_salary": 420000,
    "performance_score": 85,
    "status": "active"
  },
  {
    "id": 9,
    "company_id": 1,
    "user_id": 9,
    "employee_code": "EMP-1009",
    "first_name": "Test9",
    "last_name": "Employee",
    "phone": "+2348000000009",
    "department_id": 6,
    "department": "Executive Governance",
    "position": "Super Administrator",
    "territory": "National",
    "rank_code": "CEO",
    "base_salary": 1800000,
    "performance_score": 99,
    "status": "active"
  }
];
export async function resetTestData() {
  db.resetToSeed();
  const password_hash = bcrypt.hashSync('ChangeMe123!', 10);
  for (const user of users) await db.insert('users', { ...user, password_hash });
  for (const employee of employees) await db.insert('employees', employee);
}
await resetTestData();
