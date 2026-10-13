// ==============================================================================
// EDGEWFORCE - ROLE & GRANULAR PERMISSION (RBAC) & IDOR MIDDLEWARE
// ==============================================================================

import { db } from '../config/database.js';

// Base role mapping to default permissions
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  super_admin: ['*'],
  ADMIN: ['*'],
  CEO: ['*'],
  IT_ADMIN: ['*'],
  CTO: ['*'],
  HR_MANAGER: ['view_dashboard', 'view_employees', 'create_employee', 'edit_employee', 'delete_employee', 'assign_tasks', 'approve_leave', 'view_attendance', 'manage_attendance', 'view_idle_reports', 'manage_ranks', 'view_sos', 'resolve_sos', 'view_reports', 'admin_portal', 'view_inventory', 'manage_inventory'],
  hr_manager: ['view_dashboard', 'view_employees', 'create_employee', 'edit_employee', 'delete_employee', 'assign_tasks', 'approve_leave', 'view_attendance', 'manage_attendance', 'view_idle_reports', 'manage_ranks', 'view_sos', 'resolve_sos', 'view_reports', 'admin_portal', 'view_inventory', 'manage_inventory'],
  HR: ['view_dashboard', 'view_employees', 'create_employee', 'edit_employee', 'delete_employee', 'assign_tasks', 'approve_leave', 'view_attendance', 'manage_attendance', 'view_idle_reports', 'manage_ranks', 'view_sos', 'resolve_sos', 'view_reports', 'admin_portal', 'view_inventory', 'manage_inventory'],
  SENIOR_ACCOUNTANT: ['view_dashboard', 'view_payroll', 'manage_payroll', 'record_collections', 'view_sales', 'view_reports', 'view_inventory'],
  ACCOUNTANT: ['view_dashboard', 'view_payroll', 'manage_payroll', 'record_collections', 'view_sales', 'view_inventory'],
  MANAGER: ['view_dashboard', 'view_employees', 'assign_tasks', 'approve_leave', 'view_attendance', 'manage_attendance', 'view_sales', 'view_field_operations', 'manage_routes', 'view_reports', 'manage_stores', 'view_stores', 'manage_field_tracking', 'view_deliveries', 'manage_inventory', 'view_inventory'],
  SUPERVISOR: ['view_dashboard', 'assign_tasks', 'view_attendance', 'manage_attendance', 'view_field_operations', 'manage_routes', 'view_sos', 'view_reports', 'manage_stores', 'view_stores', 'manage_field_tracking', 'view_deliveries', 'approve_orders', 'view_inventory'],
  supervisor: ['view_dashboard', 'assign_tasks', 'view_attendance', 'manage_attendance', 'view_field_operations', 'manage_routes', 'view_sos', 'view_reports', 'manage_stores', 'view_stores', 'manage_field_tracking', 'view_deliveries', 'approve_orders', 'view_inventory'],
  AGENT_ADMIN: ['view_dashboard', 'view_field_operations', 'manage_routes', 'view_sos', 'manage_stores', 'view_stores', 'view_reports', 'manage_field_tracking', 'view_deliveries'],
  agent_admin: ['view_dashboard', 'view_field_operations', 'manage_routes', 'view_sos', 'manage_stores', 'view_stores', 'view_reports', 'manage_field_tracking', 'view_deliveries'],
  SALES_AGENT: ['view_dashboard', 'view_sales', 'create_orders', 'record_collections', 'view_customers', 'create_customers', 'view_competitors', 'view_stores', 'request_store'],
  sales_agent: ['view_dashboard', 'view_sales', 'create_orders', 'record_collections', 'view_customers', 'create_customers', 'view_competitors', 'view_stores', 'request_store'],
  FIELD_AGENT: ['view_dashboard', 'view_field_operations', 'view_customers', 'view_sos', 'view_stores', 'request_store'],
  field_agent: ['view_dashboard', 'view_field_operations', 'view_customers', 'view_sos', 'view_stores', 'request_store'],
  STAFF_MEMBER: ['view_dashboard', 'view_inventory'],
  staff: ['view_dashboard', 'view_inventory'],
  EMPLOYEE: ['view_dashboard', 'view_inventory']
};

/**
 * Returns true if user has elevated management or admin capabilities
 */
export function isManagementUser(user) {
  if (!user) return false;
  const role = user.role_code;
  const rank = user.rank?.code;
  const email = user.email;

  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'IT_ADMIN' ||
    rank === 'IT_ADMIN' ||
    role === 'CEO' ||
    rank === 'CEO' ||
    role === 'CTO' ||
    rank === 'CTO' ||
    role === 'HR_MANAGER' ||
    role === 'HR' ||
    rank === 'HR' ||
    role === 'MANAGER' ||
    role === 'SUPERVISOR'
  );
}

/**
 * Validates whether manager rank level is higher than subordinate rank level.
 */
export function validateHierarchyAssignment(managerRank, subordinateRank) {
  if (!managerRank || !subordinateRank) return true;
  const mgrLvl = typeof managerRank === 'object' ? managerRank.level : Number(managerRank);
  const subLvl = typeof subordinateRank === 'object' ? subordinateRank.level : Number(subordinateRank);
  if (isNaN(mgrLvl) || isNaN(subLvl)) return true;
  return mgrLvl <= subLvl;
}

/**
 * Checks if current user has any of the allowed roles.
 * @param  {...string} allowedRoles
 */
export function hasRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      });
    }

    const userRole = req.user.role_code;
    const userRank = req.user.rank?.code;
    const userEmail = req.user.email;

    const isMatch = allowedRoles.includes(userRole) || (userRank && allowedRoles.includes(userRank));
    if (
      userRole === 'SUPER_ADMIN' ||
      userRole === 'ADMIN' ||
      userRole === 'IT_ADMIN' ||
      userRank === 'IT_ADMIN' ||
      userRole === 'CEO' ||
      userRank === 'CEO' ||
      userRole === 'CTO' ||
      userRank === 'CTO' ||
      isMatch
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` }
    });
  };
}

/**
 * Checks if current user has a specific granular permission.
 * @param {string} permissionCode
 */
export function hasPermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      });
    }

    const role = req.user.role_code;
    const rank = req.user.rank?.code;
    const userPermissions = [
      ...(ROLE_PERMISSIONS[role] || []),
      ...(ROLE_PERMISSIONS[rank] || [])
    ];

    if (userPermissions.includes('*') || userPermissions.includes(permissionCode)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { code: 'PERMISSION_DENIED', message: `Missing required permission: ${permissionCode}` }
    });
  };
}

/**
 * IDOR / Object-Level Authorization Middleware:
 * Verifies that the authenticated Agent owns the requested resource, or is a supervisor/management user.
 * @param {string} tableName - Database table name (e.g. 'tasks', 'sales_orders', 'sos', 'attendance')
 * @param {string} paramKey - Request parameter name containing the ID (e.g. 'id', 'taskId', 'orderId')
 * @param {string[]} ownerFields - Candidate owner fields on the table (e.g. ['employee_id', 'agent_id', 'user_id'])
 */
export function verifyResourceOwnership(tableName, paramKey = 'id', ownerFields = ['employee_id', 'agent_id', 'user_id']) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      });
    }

    // Management/Supervisors bypass direct single-owner checks
    if (isManagementUser(req.user)) {
      return next();
    }

    const resourceId = req.params[paramKey] || req.body?.[paramKey];
    if (!resourceId) {
      return next();
    }

    try {
      const resource = await db.findById(tableName, resourceId);
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `${tableName} resource not found.` }
        });
      }

      const userEmpId = req.user.employee_id || req.user.employee?.id;
      const userId = req.user.id;

      // Check if any owner field matches
      let isOwner = false;
      for (const field of ownerFields) {
        if (resource[field] !== undefined && resource[field] !== null) {
          if (
            String(resource[field]) === String(userEmpId) ||
            String(resource[field]) === String(userId)
          ) {
            isOwner = true;
            break;
          }
        }
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. You do not have authorization to access or modify this ${tableName} record.`
          }
        });
      }

      req.targetResource = resource;
      return next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message }
      });
    }
  };
}
