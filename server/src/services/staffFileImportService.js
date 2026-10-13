import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { randomBytes } from 'node:crypto';
import { db } from '../config/database.js';
import { hrService } from './hrService.js';
import { normalizeEmail, normalizePhone, isEmail } from '../utils/phoneNormalizer.js';
import { recordAudit } from '../middleware/auditLogger.js';

export const STAFF_IMPORT_HEADERS = ['staff_id', 'first_name', 'last_name', 'email', 'phone', 'department', 'position', 'work_location', 'hire_date'];
const MAX_ROWS = 500;
const aliases = {
  name: 'name', full_name: 'name', employee_name: 'name', staff_name: 'name',
  staff_id: 'staff_id', employee_code: 'staff_id', staff_code: 'staff_id',
  first_name: 'first_name', last_name: 'last_name', email: 'email', work_email: 'email',
  phone: 'phone', phone_number: 'phone', mobile: 'phone', department: 'department',
  position: 'position', job_title: 'position', designation: 'position',
  work_location: 'work_location', workspace: 'work_location', office: 'work_location',
  hire_date: 'hire_date', date_joined: 'hire_date', date_of_joining: 'hire_date'
};
const clean = value => String(value ?? '').trim();

function validateWorkbookSize(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > buffer.length) throw new Error('Invalid Excel workbook.');
  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16), expanded = 0;
  if (entries > 2000) throw new Error('Excel workbook is too complex. Export the staff sheet as CSV.');
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid Excel archive.');
    expanded += buffer.readUInt32LE(offset + 24);
    if (expanded > 32 * 1024 * 1024) throw new Error('Expanded Excel workbook exceeds 32 MB. Export the staff sheet as CSV.');
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

export async function parseStaffFile(file) {
  if (!file?.buffer?.length) throw new Error('Select a CSV or XLSX staff file.');
  let matrix;
  if (/\.csv$/i.test(file.originalname)) {
    matrix = parse(file.buffer, { bom: true, skip_empty_lines: true, relax_column_count: false, max_record_size: 10000 });
  } else if (/\.xlsx$/i.test(file.originalname)) {
    validateWorkbookSize(file.buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('The workbook has no worksheet.');
    if (sheet.columnCount > 50) throw new Error('Use a staff worksheet with no more than 50 columns.');
    if (sheet.rowCount > MAX_ROWS + 1) throw new Error(`Import up to ${MAX_ROWS} staff per file.`);
    matrix = [];
    sheet.eachRow(row => {
      const values = [];
      for (let i = 1; i <= sheet.columnCount; i++) {
        const cell = row.getCell(i);
        let value = cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text;
        if (typeof cell.value === 'number' && /^0+$/.test(cell.numFmt)) value = String(cell.value).padStart(cell.numFmt.length, '0');
        if (cell.type === ExcelJS.ValueType.Formula) throw new Error('Replace formulas with values before importing.');
        values.push(value);
      }
      matrix.push(values);
    });
  } else throw new Error('Use a .csv or .xlsx file.');
  if (matrix.length < 2) throw new Error('The file needs a header and at least one staff row.');
  if (matrix.length > MAX_ROWS + 1) throw new Error(`Import up to ${MAX_ROWS} staff per file.`);
  const headers = matrix[0].map(h => aliases[clean(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] || null);
  const known = headers.filter(Boolean);
  if (new Set(known).size !== known.length) throw new Error('Two columns map to the same field. Use the template headers.');
  if (!headers.includes('name') && (!headers.includes('first_name') || !headers.includes('last_name'))) throw new Error('Include first_name and last_name, or a full name column.');
  if (!headers.includes('email') && !headers.includes('phone')) throw new Error('Include an email or phone column.');
  return matrix.slice(1).filter(row => row.some(v => clean(v))).map((row, i) => {
    const record = { row: i + 2 };
    headers.forEach((key, index) => { if (key) record[key] = clean(row[index]); });
    return record;
  });
}

export async function previewStaffImport(file, actor, options = {}) {
  const records = await parseStaffFile(file);
  const companyId = Number(actor.company_id || 1);
  const [employees, users, locations, departments] = await Promise.all([
    db.find('employees'), db.find('users'), db.find('work_locations', { company_id: companyId, status: 'active' }), db.find('departments')
  ]);
  const seen = new Set();
  const rows = records.map(record => {
    const errors = [];
    const parts = clean(record.name).split(/\s+/);
    const first_name = record.first_name || parts[0] || '';
    const last_name = record.last_name || parts.slice(1).join(' ');
    const email = record.email ? normalizeEmail(record.email) : null;
    const phone = record.phone ? normalizePhone(record.phone) : null;
    if (!first_name || !last_name) errors.push('First and last name are required.');
    if (!email && !phone) errors.push('Provide a valid email address or Nigerian phone number.');
    if (record.email && !isEmail(email)) errors.push('Invalid email address.');
    if (record.phone && !/^\+234[789]\d{9}$/.test(phone || '')) errors.push('Invalid Nigerian phone number.');
    if (Object.values(record).some(v => typeof v === 'string' && v.length > 255)) errors.push('A field exceeds 255 characters.');
    const identifiers = [record.staff_id && `id:${record.staff_id.toLowerCase()}`, email && `email:${email}`, phone && `phone:${phone}`].filter(Boolean);
    for (const identifier of identifiers) {
      if (seen.has(identifier)) errors.push('Duplicate staff ID or contact within this file.');
      seen.add(identifier);
    }
    const matches = employees.filter(e =>
      (record.staff_id && [e.staff_id, e.employee_code, String(e.employee_code || '').replace(/^EMP-/, '')].some(id => clean(id).toLowerCase() === record.staff_id.toLowerCase())) ||
      (email && [e.email, e.work_email, e.personal_email].some(v => v && normalizeEmail(v) === email)) ||
      (phone && normalizePhone(e.phone) === phone)
    );
    const accountMatches = users.filter(u => (email && normalizeEmail(u.email) === email) || (phone && normalizePhone(u.phone) === phone));
    if (matches.length > 1 || accountMatches.some(user => matches.length && !matches.some(employee => Number(employee.user_id) === Number(user.id)))) errors.push('Staff ID and contact identify different staff. Correct this row.');
    if ([...matches, ...accountMatches].some(e => Number(e.company_id || 1) !== companyId)) errors.push('A staff ID or contact is already in use.');
    const ownMatch = matches.find(e => Number(e.company_id || 1) === companyId);
    if (!ownMatch && accountMatches.length) errors.push('This contact already has an account. Link it through staff registration instead.');
    let location = null;
    if (record.work_location) {
      const matches = locations.filter(l => l.name.toLowerCase() === record.work_location.toLowerCase());
      if (matches.length !== 1) errors.push('Work location must match one active office. Create the location first.');
      else location = matches[0];
    } else if (options.location_id) {
      location = locations.find(l => String(l.id) === String(options.location_id));
      if (!location) errors.push('Selected default work location is unavailable.');
    }
    if (record.hire_date && (!/^\d{4}-\d{2}-\d{2}$/.test(record.hire_date) || Number.isNaN(Date.parse(record.hire_date)) || new Date(record.hire_date).toISOString().slice(0, 10) !== record.hire_date)) errors.push('Use YYYY-MM-DD for hire_date.');
    const department = departments.find(d => clean(d.name).toLowerCase() === clean(record.department).toLowerCase() || clean(d.code).toLowerCase() === clean(record.department).toLowerCase());
    return {
      row: record.row, first_name, last_name, name: `${first_name} ${last_name}`.trim(),
      staff_id: record.staff_id || '', email, phone, department: record.department || 'Operations',
      department_id: department?.id || null, position: record.position || 'Staff Member',
      hire_date: record.hire_date || null, location_id: location?.id || null, work_location: location?.name || '',
      action: errors.length ? 'invalid' : ownMatch ? 'skip' : 'create', errors
    };
  });
  return { rows, total: rows.length, ready: rows.filter(r => r.action === 'create').length, skipped: rows.filter(r => r.action === 'skip').length, invalid: rows.filter(r => r.action === 'invalid').length };
}

export async function importStaffFile(file, actor, options = {}, req = null) {
  const preview = await previewStaffImport(file, actor, options);
  if (preview.invalid) throw new Error('Fix all invalid rows before importing. Preview the file for details.');
  const result = { created: 0, skipped: preview.skipped, errors: [], accounts: [] };
  for (const row of preview.rows.filter(r => r.action === 'create')) {
    try {
      const password = 'Ewf-' + randomBytes(18).toString('base64url');
      const registered = await hrService.registerStaff({
        ...row, email: row.email, password, role_code: 'STAFF_MEMBER', rank_code: 'STAFF',
        company_id: actor.company_id || 1, assigned_location_id: row.location_id,
        base_salary: 0, housing_allowance: 0, transport_allowance: 0, other_allowance: 0
      }, actor, req);
      result.created++;
      result.accounts.push({ name: row.name, staff_id: registered.employee.staff_id || registered.employee.employee_code, email: row.email || '', phone: row.phone || '', temporary_password: password });
    } catch (error) {
      result.errors.push({ row: row.row, name: row.name, message: error.message });
    }
  }
  await recordAudit(actor, 'STAFF_FILE_IMPORTED', 'employees', null, { created: result.created, skipped: result.skipped, failed: result.errors.length }, req);
  return result;
}
