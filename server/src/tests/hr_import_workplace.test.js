import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { parseStaffFile, previewStaffImport, importStaffFile } from '../services/staffFileImportService.js';
import { locationService } from '../services/locationService.js';
import { hrService } from '../services/hrService.js';
import { requireAuth, signUserToken } from '../middleware/auth.js';
import { hasRole } from '../middleware/rbac.js';
import { authService } from '../services/authService.js';
import express from 'express';
import hrRoutes from '../routes/hrRoutes.js';
import locationRoutes from '../routes/locationRoutes.js';

const actor = { id: 1, company_id: 1, full_name: 'Test HR', email: 'hr@example.test', role_code: 'HR_MANAGER' };
const csv = text => ({ originalname: 'staff.csv', buffer: Buffer.from(text) });
test('HR file import and actual workplace assignment', async t => {
  db.resetToSeed();
  await db.insert('users', { ...actor, status: 'active' });
  const office = await locationService.createLocation({ name: 'Test Office A', latitude: 6.6, longitude: 3.4 }, actor);
  const other = await locationService.createLocation({ name: 'Test Office B', latitude: 6.7, longitude: 3.5 }, actor);
  const file = csv('\uFEFFstaff_id,first_name,last_name,email,phone,work_location\r\n019,Ada,"Example, Jr",ada@example.test,08099990001,Test Office A\r\n020,Bola,Example,bola@example.test,,\r\n');
  await t.test('Preview parses quotes/BOM, preserves staff IDs and makes no writes', async () => {
    const preview = await previewStaffImport(file, actor);
    assert.equal(preview.ready, 2); assert.equal(preview.rows[0].staff_id, '019');
    assert.equal(preview.rows[0].last_name, 'Example, Jr');
    assert.equal((await db.find('employees')).length, 0);
  });
  await t.test('Rejects invalid contacts, dates, file types and duplicate rows', async () => {
    const preview = await previewStaffImport(csv('first_name,last_name,email,phone,hire_date\nAda,Example,invalid,123,2026-02-30'), actor);
    assert.equal(preview.invalid, 1);
    await assert.rejects(importStaffFile(csv('first_name,last_name,email\nAda,Example,invalid'), actor), /invalid rows/);
    const duplicate = await previewStaffImport(csv('first_name,last_name,email\nAda,Example,a@example.test\nBola,Example,a@example.test'), actor);
    assert.equal(duplicate.invalid, 1);
    await assert.rejects(parseStaffFile({ originalname: 'staff.exe', buffer: Buffer.from('x') }), /csv or .xlsx/);
    assert.equal((await db.find('employees')).length, 0);
  });
  await t.test('Excel zero formatting and dates are preserved; formulas are rejected', async () => {
    const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('Staff');
    sheet.addRow(['staff_id', 'first_name', 'last_name', 'email', 'hire_date']);
    sheet.addRow([3, 'Excel', 'Example', 'excel@example.test', new Date('2026-01-01T00:00:00Z')]);
    sheet.getCell('A2').numFmt = '000';
    const rows = await parseStaffFile({ originalname: 'staff.xlsx', buffer: await workbook.xlsx.writeBuffer() });
    assert.equal(rows[0].staff_id, '003'); assert.equal(rows[0].hire_date, '2026-01-01');
    sheet.getCell('A2').value = { formula: '1+2', result: 3 };
    await assert.rejects(parseStaffFile({ originalname: 'staff.xlsx', buffer: await workbook.xlsx.writeBuffer() }), /formulas/);
  });
  let employee;
  await t.test('Commit creates accounts with unique passwords and actual assignments', async () => {
    const result = await importStaffFile(file, actor, { location_id: other.id });
    assert.equal(result.created, 2); assert.deepEqual(result.errors, []);
    assert.notEqual(result.accounts[0].temporary_password, result.accounts[1].temporary_password);
    assert.ok(result.accounts.every(a => a.temporary_password.length >= 12));
    employee = await db.findOne('employees', { staff_id: '019' });
    assert.equal(employee.work_location, office.name);
    const user = await db.findById('users', employee.user_id); assert.equal(user.requires_password_change, true);
    assert.equal((await db.findOne('employees', { staff_id: '020' })).work_location, other.name);
    const repeat = await importStaffFile(file, actor); assert.equal(repeat.created, 0); assert.equal(repeat.skipped, 2);
  });
  await t.test('Primary replacement updates directory, allowed geofences and previous-office history', async () => {
    await locationService.assignEmployeeLocation({ employee_id: employee.id, location_id: other.id }, actor);
    assert.equal((await db.findById('employees', employee.id)).work_location, other.name);
    const permitted = await locationService.getActivePermittedLocations(employee.id, 1);
    assert.deepEqual(permitted.map(l => l.id), [other.id]);
    const history = await db.find('location_assignment_history', { employee_id: employee.id });
    assert.equal(history.at(-1).previous_location_id, office.id);
    assert.equal(history.at(-1).previous_location_name, office.name);
    assert.equal((await db.find('employee_location_assignments', { employee_id: employee.id, is_primary: true, is_active: true })).length, 1);
  });
  await t.test('Tenant isolation, disabled offices and invalid dates cannot change assignments', async () => {
    await assert.rejects(locationService.assignEmployeeLocation({ employee_id: employee.id, location_id: office.id }, { ...actor, company_id: 2 }), /another company/);
    await assert.rejects(locationService.assignEmployeeLocation({ employee_id: employee.id, location_id: office.id, assignment_type: 'temporary', start_date: 'invalid', end_date: 'invalid' }, actor), /valid assignment dates/);
    await db.update('work_locations', office.id, { status: 'inactive' });
    await assert.rejects(locationService.assignEmployeeLocation({ employee_id: employee.id, location_id: office.id }, actor), /active work location/);
    assert.equal((await db.findById('employees', employee.id)).work_location, other.name);
    const preview = await previewStaffImport(file, { ...actor, company_id: 2 }); assert.equal(preview.invalid, 2);
    assert.equal((await hrService.getEmployees({ ...actor, company_id: 2 })).length, 0);
  });
  await t.test('Temporary date-only assignment covers the entire Lagos end date', async () => {
    await db.update('work_locations', office.id, { status: 'active' });
    const result = await locationService.assignEmployeeLocation({ employee_id: employee.id, location_id: office.id, assignment_type: 'temporary', start_date: '2026-10-12', end_date: '2026-10-12' }, actor);
    assert.equal(result.assignment.start_date, '2026-10-11T23:00:00.000Z');
    assert.equal(result.assignment.end_date, '2026-10-12T22:59:59.999Z');
  });
  await t.test('Removing the primary clears the staff directory label', async () => {
    const assignment = await db.findOne('employee_location_assignments', { employee_id: employee.id, is_primary: true, is_active: true });
    await locationService.removeEmployeeLocationAssignment(assignment.id, 1, actor);
    assert.equal((await db.findById('employees', employee.id)).work_location, '');
  });
  await t.test('Simultaneous primary assignments leave one active primary and a matching directory label', async () => {
    await Promise.all([office, other].map(location => locationService.assignEmployeeLocation({ employee_id: employee.id, location_id: location.id }, actor)));
    const primary = await db.find('employee_location_assignments', { employee_id: employee.id, is_primary: true, is_active: true });
    assert.equal(primary.length, 1);
    const location = await db.findById('work_locations', primary[0].location_id);
    assert.equal((await db.findById('employees', employee.id)).work_location, location.name);
  });
  await t.test('Forged and expired JWTs are rejected; email alone grants no administrative role', async () => {
    const response = () => ({ code: null, body: null, status(code) { this.code=code; return this; }, json(body) { this.body=body; } });
    const forged = jwt.sign({ userId: actor.id, email: actor.email }, 'wrong-secret');
    for (const token of [forged, jwt.sign({ userId: actor.id }, process.env.JWT_SECRET || '3458929f44e69c199398c77212600d9f760aabb9b1dda42680556892307277ea', { expiresIn: -1 })]) {
      const res = response(); await requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('Invalid token accepted')); assert.equal(res.code, 401);
    }
    let next = false;
    await requireAuth({ headers: { authorization: 'Bearer ' + signUserToken(actor) } }, response(), () => { next = true; }); assert.equal(next, true);
    const res = response(); hasRole('HR_MANAGER')({ user: { role_code: 'STAFF_MEMBER', email: 'admin@edgewforce.com' } }, res, () => assert.fail('Email elevated privileges')); assert.equal(res.code, 403);
    hasRole('HR_MANAGER')({ user: { role_code: 'ADMIN' } }, response(), () => {});
  });
  await t.test('Recovery requires a valid, unexpired, single-use token', async () => {
    await assert.rejects(authService.resetPassword(actor.email, null, 'UpdatedPassword123!'), /recovery token/);
    await assert.rejects(authService.resetPassword(actor.email, 'wrong', 'UpdatedPassword123!'), /recovery token/);
    const recovery = await authService.forgotPassword(actor.email);
    assert.ok(recovery.reset_token);
    assert.notEqual((await db.findById('users', actor.id)).reset_token, recovery.reset_token);
    await db.update('users', actor.id, { reset_token_expires_at: '2000-01-01T00:00:00Z' });
    await assert.rejects(authService.resetPassword(actor.email, recovery.reset_token, 'UpdatedPassword123!'), /recovery token/);
    const fresh = await authService.forgotPassword(actor.email);
    await authService.resetPassword(actor.email, fresh.reset_token, 'UpdatedPassword123!');
    await assert.rejects(authService.resetPassword(actor.email, fresh.reset_token, 'UpdatedPassword123!'), /recovery token/);
  });
  await t.test('HTTP endpoints authorize HR/admin, reject staff and oversized uploads, and assign actual offices', async () => {
    const app = express(); app.use(express.json()); app.use('/api/hr', hrRoutes); app.use('/api/locations', locationRoutes);
    const server = await new Promise(resolve => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const admin = await db.insert('users', { company_id: 1, full_name: 'Test Admin', email: 'admin-test@example.test', status: 'active', role_code: 'ADMIN' });
    const staff = await db.insert('users', { company_id: 1, full_name: 'Test Staff', email: 'staff-test@example.test', status: 'active', role_code: 'STAFF_MEMBER' });
    const headers = user => ({ Authorization: 'Bearer ' + signUserToken(user) });
    const form = (buffer = file.buffer) => { const body = new FormData(); body.append('file', new Blob([buffer]), 'staff.csv'); return body; };
    try {
      const unauthorized = await fetch(base + '/hr/employees/import/preview', { method: 'POST', headers: headers(staff), body: form() }); assert.equal(unauthorized.status, 403);
      const preview = await fetch(base + '/hr/employees/import/preview', { method: 'POST', headers: headers(admin), body: form() }); assert.equal(preview.status, 200); assert.equal((await preview.json()).data.skipped, 2);
      const oversized = await fetch(base + '/hr/employees/import/preview', { method: 'POST', headers: headers(admin), body: form(Buffer.alloc(5 * 1024 * 1024 + 1)) }); assert.equal(oversized.status, 400);
      const assign = await fetch(base + `/locations/employee/${employee.id}/assign`, { method: 'POST', headers: { ...headers(admin), 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: 2, location_id: other.id }) }); assert.equal(assign.status, 201);
      assert.equal((await db.findById('employees', employee.id)).work_location, other.name);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
});
