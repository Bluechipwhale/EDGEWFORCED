import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { staffImportService } from '../services/staffImportService.js';
import { hrService } from '../services/hrService.js';
import { authService } from '../services/authService.js';

const staffFixture = ['019', '003'].map((staff_id, i) => ({
  name: `Test Import ${i}`, staff_id, email: `import${i}@example.test`,
  work_email: `import${i}@example.test`, phone: `0809999000${i}`,
  department: 'Technology & IT', job_title: 'Staff', date_joined: '2026-01-01',
  bank_name: 'Test Bank', account_number: '0000000000', blood_group: 'O+'
}));

describe('Authoritative Staff Provisioning & Security Tests', () => {
  it('1. Explicit imports preserve leading zeros in Staff ID', async () => {
    const importResult = await staffImportService.importAuthoritativeStaff(staffFixture);
    assert.strictEqual(importResult.total_records, staffFixture.length);

    const employees = await db.find('employees');
    assert(employees.length >= staffFixture.length);

    // Verify leading zeroes preservation in text staff IDs
    const emp019 = employees.find(e => e.staff_id === '019');
    assert(emp019, 'Staff ID 019 must exist and be stored as string with leading zero preserved');
    assert.strictEqual(emp019.staff_id, '019');

    const emp003 = employees.find(e => e.staff_id === '003');
    assert(emp003, 'Staff ID 003 must exist with leading zero preserved');
    assert.strictEqual(emp003.staff_id, '003');
  });

  it('2. Verifies import idempotency - running import second time produces 0 new accounts', async () => {
    const secondImport = await staffImportService.importAuthoritativeStaff(staffFixture);
    assert.strictEqual(secondImport.accounts_created, 0, 'Second import must create 0 new accounts');
    assert.strictEqual(secondImport.employees_created, 0, 'Second import must create 0 new employees');
    assert.strictEqual(secondImport.duplicates_detected, staffFixture.length);
  });

  it('3. Verifies Multi-Identifier login using email OR Nigerian phone number', async () => {
    const employees = await db.find('employees');
    const sampleEmp = employees.find(e => e.staff_id && e.phone && (e.work_email || e.personal_email) && e.user_id > 8);
    assert(sampleEmp, 'Sample employee with phone and email must exist');

    const email = sampleEmp.work_email || sampleEmp.personal_email;
    const phone = sampleEmp.phone;

    // Login via email
    const loginByEmail = await authService.login(email, 'ChangeMe123!');
    assert(loginByEmail.token, 'Must return JWT token on email login');
    assert.strictEqual(loginByEmail.user.requires_password_change, true, 'Default password must require change on first login');

    // Login via phone
    const loginByPhone = await authService.login(phone, 'ChangeMe123!');
    assert(loginByPhone.token, 'Must return JWT token on phone login');
    assert.strictEqual(loginByPhone.user.id, loginByEmail.user.id, 'Email and phone logins must resolve to the same user');
  });

  it('4. Verifies strict server-side redaction of sensitive HR/banking data for non-HR callers', async () => {
    const nonHrActor = {
      id: 999,
      email: 'agent@edgewforce.com',
      role_code: 'FIELD_AGENT',
      rank: { code: 'STAFF' }
    };

    const publicDirectory = await hrService.getEmployees(nonHrActor);
    assert(publicDirectory.length > 0, 'Directory must return records');

    for (const record of publicDirectory) {
      assert.strictEqual(record.bank_name, undefined, 'bank_name must be stripped for non-HR callers');
      assert.strictEqual(record.account_number, undefined, 'account_number must be stripped for non-HR callers');
      assert.strictEqual(record.date_of_birth, undefined, 'date_of_birth must be stripped for non-HR callers');
      assert.strictEqual(record.base_salary, undefined, 'base_salary must be stripped for non-HR callers');
      assert.strictEqual(record.emergency_contact_phone, undefined, 'emergency_contact_phone must be stripped for non-HR callers');
      assert.strictEqual(record.home_address, undefined, 'home_address must be stripped for non-HR callers');
    }
  });

  it('5. Verifies HR administrator can retrieve full unredacted staff profile including banking and review flags', async () => {
    const hrActor = {
      id: 2,
      email: 'hr@edgewforce.com',
      role_code: 'HR_MANAGER',
      rank: { code: 'HR' }
    };

    const hrDirectory = await hrService.getEmployees(hrActor);
    const sampleEmp = hrDirectory.find(e => e.account_number);
    assert(sampleEmp, 'Sample employee with bank account must exist in HR directory');
    assert(sampleEmp.account_number, 'HR must see account_number');
    assert(sampleEmp.bank_name, 'HR must see bank_name');
  });
});
