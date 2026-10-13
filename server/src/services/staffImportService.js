// ==============================================================================
// EDGEWFORCE - AUTHORITATIVE STAFF DATASET & IDEMPOTENT IMPORT SERVICE
// Imports an explicitly supplied staff dataset with deduplication, multi-identifier
// auth account creation, field normalization, and HR review flagging.
// ==============================================================================

import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { normalizePhone, normalizeEmail, isEmail } from '../utils/phoneNormalizer.js';
import { logger } from '../utils/logger.js';


function deriveRoleCode(jobTitle = '', department = '') {
  const jt = String(jobTitle).toLowerCase();
  const dept = String(department).toLowerCase();

  if (jt.includes('cto') || jt.includes('chief technology')) return 'CTO';
  if (jt.includes('ceo') || jt.includes('chief executive') || jt.includes('managing director')) return 'CEO';
  if (dept.includes('hr') || dept.includes('human resource') || jt.includes('hr manager')) return 'HR_MANAGER';
  if (dept.includes('finance') || jt.includes('finance manager') || jt.includes('head of finance') || jt.includes('accountant')) return 'ACCOUNTANT';
  if (dept.includes('sales') || jt.includes('sales') || jt.includes('vsr')) return 'SALES_AGENT';
  if (dept.includes('operation') || dept.includes('compliance') || jt.includes('compliance') || jt.includes('field')) return 'FIELD_AGENT';
  if (jt.includes('supervisor')) return 'SUPERVISOR';
  if (jt.includes('manager')) return 'MANAGER';
  return 'STAFF_MEMBER';
}

function deriveRankCode(jobTitle = '', department = '') {
  const jt = String(jobTitle).toLowerCase();
  const dept = String(department).toLowerCase();

  if (jt.includes('cto')) return 'CTO';
  if (jt.includes('ceo') || jt.includes('managing director')) return 'CEO';
  if (dept.includes('hr') || jt.includes('hr manager')) return 'HR';
  if (dept.includes('finance') || jt.includes('finance manager') || jt.includes('head of finance')) return 'ACCOUNTANT';
  if (jt.includes('senior') || jt.includes('head of') || jt.includes('manager')) return 'MANAGER';
  if (jt.includes('supervisor')) return 'SUPERVISOR';
  return 'STAFF';
}

function splitFullName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: parts[0] };
  }
  const first_name = parts[0];
  const last_name = parts.slice(1).join(' ');
  return { first_name, last_name };
}

export const staffImportService = {
  /**
   * Idempotently imports explicitly supplied staff records. No built-in records.
   */
  async importAuthoritativeStaff(dataset = []) {
    if (process.env.NODE_ENV === 'production' && dataset.length) throw new Error('Use the HR directory CSV/Excel import for production staff provisioning.');
    const results = {
      total_records: dataset.length,
      processed: 0,
      employees_created: 0,
      employees_updated: 0,
      accounts_created: 0,
      accounts_updated: 0,
      duplicates_detected: 0,
      flagged_for_review: 0,
      review_items: [],
      errors: []
    };

    const existingUsers = await db.find('users');
    const existingEmployees = await db.find('employees');
    const existingDepartments = await db.find('departments');

    const defaultPasswordHash = bcrypt.hashSync('ChangeMe123!', 10);

    for (let i = 0; i < dataset.length; i++) {
      const record = dataset[i];
      try {
        results.processed++;

        // 1. Normalize identifiers
        const normalizedEmail = normalizeEmail(record.email);
        const normalizedWorkEmail = record.work_email && !record.work_email.toLowerCase().includes('not been assigned') && !record.work_email.toLowerCase().includes('nil')
          ? normalizeEmail(record.work_email.replace(/\s+/g, ''))
          : null;
        const normalizedPhone = normalizePhone(record.phone);
        const staffId = record.staff_id ? String(record.staff_id).trim() : null;

        // Determine primary login email/identifier
        const primaryLoginEmail = normalizedWorkEmail || normalizedEmail || (normalizedPhone ? `${normalizedPhone.replace('+', '')}@edgewforce.internal` : null);

        // 2. Check for missing/ambiguous fields needing review
        const reviewReasons = [];
        if (!staffId) reviewReasons.push('Missing official Staff ID (flagged for HR generation)');
        if (!normalizedWorkEmail) reviewReasons.push('Work email not yet assigned');
        if (record.blood_group === 'No idea' || record.blood_group === 'NA' || !record.blood_group) reviewReasons.push('Blood group unconfirmed');
        if (record.supervisor && record.supervisor.length > 30) reviewReasons.push('Multiple/complex reporting lines in supervisor field');

        const isFlagged = reviewReasons.length > 0;
        if (isFlagged) {
          results.flagged_for_review++;
          results.review_items.push({
            name: record.name,
            staff_id: staffId || 'UNASSIGNED',
            reasons: reviewReasons
          });
        }

        // 3. Match existing user / employee (Matching priority)
        let matchedUser = null;
        let matchedEmployee = null;

        if (staffId) {
          matchedEmployee = existingEmployees.find(e => e.staff_id === staffId || e.employee_code === staffId || e.employee_code === `EMP-${staffId}`);
        }
        if (!matchedEmployee && normalizedWorkEmail) {
          matchedEmployee = existingEmployees.find(e => e.work_email === normalizedWorkEmail || e.personal_email === normalizedWorkEmail);
        }
        if (!matchedEmployee && normalizedEmail) {
          matchedEmployee = existingEmployees.find(e => e.personal_email === normalizedEmail || e.work_email === normalizedEmail);
        }
        if (!matchedEmployee && normalizedPhone) {
          matchedEmployee = existingEmployees.find(e => normalizePhone(e.phone) === normalizedPhone);
        }
        if (!matchedEmployee && record.name) {
          matchedEmployee = existingEmployees.find(e => 
            (e.full_name && e.full_name.toLowerCase() === record.name.toLowerCase()) || 
            (`${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase() === record.name.toLowerCase())
          );
        }

        if (matchedEmployee?.user_id) {
          matchedUser = existingUsers.find(u => Number(u.id) === Number(matchedEmployee.user_id));
        }

        if (!matchedUser) {
          if (normalizedWorkEmail) matchedUser = existingUsers.find(u => u.email === normalizedWorkEmail);
          if (!matchedUser && normalizedEmail) matchedUser = existingUsers.find(u => u.email === normalizedEmail);
          if (!matchedUser && normalizedPhone) matchedUser = existingUsers.find(u => normalizePhone(u.phone) === normalizedPhone);
          if (!matchedUser && record.name) matchedUser = existingUsers.find(u => u.full_name && u.full_name.toLowerCase() === record.name.toLowerCase());
        }

        const roleCode = deriveRoleCode(record.job_title, record.department);
        const rankCode = deriveRankCode(record.job_title, record.department);
        const { first_name, last_name } = splitFullName(record.name);

        // Find department ID if exists
        const matchedDept = existingDepartments.find(d => 
          d.name.toLowerCase() === (record.department || '').toLowerCase() ||
          d.code.toLowerCase() === (record.department || '').toLowerCase()
        );

        // 4. Create or Update User Account
        let userId = null;
        if (matchedUser) {
          userId = matchedUser.id;
          results.duplicates_detected++;
          await db.update('users', matchedUser.id, {
            full_name: record.name,
            phone: normalizedPhone || matchedUser.phone,
            raw_phone: record.phone,
            onboarding_status: matchedUser.onboarding_status || 'Active'
          });
          results.accounts_updated++;
        } else {
          const newUser = await db.insert('users', {
            company_id: 1,
            full_name: record.name,
            email: primaryLoginEmail,
            phone: normalizedPhone,
            raw_phone: record.phone,
            password_hash: defaultPasswordHash,
            role_code: roleCode,
            status: 'active',
            requires_password_change: true,
            onboarding_status: 'Account Created',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          userId = newUser.id;
          existingUsers.push(newUser);
          results.accounts_created++;
        }

        // 5. Create or Update Employee Record
        const employeePayload = {
          company_id: 1,
          user_id: userId,
          employee_code: staffId ? `EMP-${staffId}` : `EMP-${1000 + i + 10}`,
          staff_id: staffId,
          first_name,
          last_name,
          full_name: record.name,
          personal_email: normalizedEmail,
          work_email: normalizedWorkEmail,
          phone: normalizedPhone,
          date_of_birth: record.dob,
          marital_status: record.marital_status,
          nationality: record.nationality || 'Nigerian',
          address: record.address,
          home_address: record.home_address,
          city_lga: record.city_lga,
          state_of_origin: record.state_origin_residence,
          state_of_residence: record.state_origin_residence,
          landmark: record.landmark,
          department_id: matchedDept ? matchedDept.id : null,
          department: record.department,
          department_raw: record.department,
          position: record.job_title,
          date_of_joining: record.date_joined,
          hire_date: record.date_joined ? new Date(record.date_joined).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          work_location: record.work_location,
          supervisor_name: record.supervisor,
          emergency_contact_name: record.emergency_contact,
          emergency_contact_relationship: record.emergency_relationship,
          emergency_contact_phone: record.emergency_phone,
          blood_group: record.blood_group,
          bank_name: record.bank_name,
          account_number: record.account_number,
          hobbies_interests: record.hobbies,
          rank_code: rankCode,
          flagged_for_review: isFlagged,
          review_reason: reviewReasons.join('; '),
          onboarding_status: 'Account Created',
          status: 'active',
          updated_at: new Date().toISOString()
        };

        if (matchedEmployee) {
          await db.update('employees', matchedEmployee.id, employeePayload);
          results.employees_updated++;
        } else {
          employeePayload.created_at = new Date().toISOString();
          const newEmp = await db.insert('employees', employeePayload);
          existingEmployees.push(newEmp);
          results.employees_created++;
        }
      } catch (err) {
        logger.error(`Error importing record for ${record.name}: ${err.message}`);
        results.errors.push({ name: record.name, error: err.message });
      }
    }

    logger.info(`Authoritative staff import complete: ${results.employees_created} employees created, ${results.accounts_created} accounts created.`);
    return results;
  }
};
