// ==============================================================================
// EDGEWFORCE - TASK INTELLIGENCE & DELIVERY PROTECTION SERVICE
// Manages task lifecycle, client/project deliverables, 4-stage client delivery,
// acknowledgement ("I'm Aware"), and task completion evidence.
// ==============================================================================

import { db } from '../config/database.js';
import { recordAudit } from '../middleware/auditLogger.js';
import { reminderService } from './reminderService.js';
import { validateHierarchyAssignment, isManagementUser } from '../middleware/rbac.js';

async function assertTaskAccess(task, actor) {
  if (!actor) return;
  if (Number(task.company_id || 1) !== Number(actor.company_id || 1)) throw new Error('Task is outside your company.');
  const employee = await db.findById('employees', task.assigned_to);
  if (!isManagementUser(actor) && Number(employee?.user_id) !== Number(actor.id)) throw new Error('You can only update your own tasks.');
}

export const taskService = {
  /**
   * Creates a new task with custom client deliverables, deadlines, and multi-channel reminders.
   */
  async createTask(data, actor, req = null) {
    const {
      title,
      description,
      assigned_to,
      client_name,
      project_name,
      priority = 'normal',
      task_type = 'general', // 'general' | 'delivery'
      due_at,
      due_date,
      reminders = [], // Array of reminder minutes before due (e.g. [15, 0, -15])
      channels = ['in_app', 'email', 'whatsapp', 'push']
    } = data;

    if (!title || !assigned_to) {
      throw new Error('Task title and assigned employee are required.');
    }

    const targetEmployee = await db.findById('employees', assigned_to);
    if (!targetEmployee) {
      throw new Error('Assigned employee not found.');
    }
    if (Number(targetEmployee.company_id || 1) !== Number(actor?.company_id || 1)) throw new Error('Assigned employee is outside your company.');

    // Enforce rank hierarchy unless CEO/Super Admin
    const ranks = await db.find('ranks');
    const assignerRank = ranks.find(r => r.code === actor.rank?.code) || { level: 8 };
    const targetRank = ranks.find(r => r.code === targetEmployee.rank_code) || { level: 8 };

    const isAuthorized = validateHierarchyAssignment(assignerRank.level, targetRank.level);
    if (!isAuthorized && !['CEO', 'SUPER_ADMIN', 'HR_MANAGER', 'HR'].includes(actor.role_code)) {
      throw new Error(`Hierarchy violation: Level ${assignerRank.level} cannot assign tasks upward to Level ${targetRank.level}.`);
    }

    const dueTimestamp = due_at || due_date ? new Date(due_at || due_date).toISOString() : new Date(Date.now() + 4 * 3600000).toISOString();

    const task = await db.insert('tasks', {
      company_id: Number(actor?.company_id || targetEmployee.company_id || 1),
      assigned_to: Number(targetEmployee.id),
      assigned_by: Number(actor?.id || 1),
      supervisor_id: targetEmployee.reporting_manager_id || Number(actor?.id || 1),
      department_id: targetEmployee.department_id || 1,
      title,
      description: description || '',
      client_name: client_name || null,
      project_name: project_name || null,
      priority: String(priority).toLowerCase(),
      task_type,
      status: 'pending',
      delivery_stages: task_type === 'delivery' ? {
        prepared: false,
        reviewed: false,
        sent_to_client: false,
        client_delivery: false
      } : null,
      due_at: dueTimestamp,
      due_date: dueTimestamp.slice(0, 10),
      acknowledged_at: null,
      acknowledged_by: null,
      completed_at: null,
      created_at: new Date().toISOString()
    });

    // Notify employee in-app immediately
    await db.insert('notifications', {
      employee_id: targetEmployee.id,
      company_id: task.company_id,
      type: 'Tasks',
      title: `New Task: ${title}`,
      body: `You have been assigned "${title}" for ${client_name || 'Operations'}. Due at ${new Date(dueTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      link: `/tasks/${task.id}`
    });

    // Schedule default multi-stage reminders if none provided
    const reminderOffsets = reminders.length > 0 ? reminders : [15, 0, -15]; // 15m before, at due, 15m after
    for (const offset of reminderOffsets) {
      const remTime = new Date(new Date(dueTimestamp).getTime() - offset * 60000);
      const level = offset > 0 ? 'pre_deadline' : (offset === 0 ? 'deadline' : 'overdue');

      await reminderService.scheduleReminder({
        task_id: task.id,
        user_id: targetEmployee.user_id,
        employee_id: targetEmployee.id,
        company_id: task.company_id,
        reminder_at: remTime.toISOString(),
        reminder_level: level,
        channels
      });
    }

    await recordAudit(actor, 'TASK_CREATED', 'tasks', task.id, { title, assigned_to: targetEmployee.id, client_name }, req);

    return task;
  },

  /**
   * Retrieves tasks with live countdown metrics and filter criteria.
   */
  async getTasks(filters = {}, actor = null) {
    let allTasks = await db.find('tasks', actor ? { company_id: actor.company_id || 1 } : {}, { order: { column: 'due_at', ascending: true } });
    if (actor && !isManagementUser(actor)) {
      const ownEmployee = actor.employee || await db.findOne('employees', { user_id: actor.id });
      allTasks = allTasks.filter(task => Number(task.assigned_to) === Number(ownEmployee?.id));
    }
    const employees = await db.find('employees');
    const now = new Date();

    const enriched = allTasks.map(t => {
      const emp = employees.find(e => Number(e.id) === Number(t.assigned_to));
      const due = t.due_at || t.due_date ? new Date(t.due_at || t.due_date) : null;
      let diffMs = due ? due.getTime() - now.getTime() : 0;
      const isOverdue = diffMs < 0 && t.status !== 'completed' && t.status !== 'cancelled';

      return {
        ...t,
        assigned_employee: emp ? { id: emp.id, name: `${emp.first_name} ${emp.last_name}`, phone: emp.phone, email: emp.email } : null,
        is_overdue: isOverdue,
        remaining_seconds: Math.round(diffMs / 1000),
        countdown_text: isOverdue ? `Overdue by ${Math.abs(Math.round(diffMs / 60000))} mins` : `${Math.max(0, Math.round(diffMs / 60000))} mins remaining`
      };
    });

    if (filters.employee_id) {
      return enriched.filter(t => Number(t.assigned_to) === Number(filters.employee_id));
    }
    if (filters.status) {
      return enriched.filter(t => t.status === filters.status);
    }
    if (filters.today) {
      const todayStr = now.toISOString().slice(0, 10);
      return enriched.filter(t => String(t.due_at || t.due_date).startsWith(todayStr));
    }

    return enriched;
  },

  /**
   * Acknowledges task ("I'M AWARE").
   */
  async acknowledgeTask(taskId, actor, req = null) {
    const task = await db.findById('tasks', taskId);
    if (!task) throw new Error('Task not found');
    await assertTaskAccess(task, actor);

    const updated = await db.update('tasks', task.id, {
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: actor.id
    });

    await recordAudit(actor, 'TASK_ACKNOWLEDGED', 'tasks', task.id, { title: task.title }, req);
    return updated;
  },

  /**
   * Completes task with "Forgot to Send" client delivery verification & evidence upload.
   * Cancels future pending reminders.
   */
  async completeTask(taskId, data = {}, actor = null, req = null) {
    const task = await db.findById('tasks', taskId);
    if (!task) throw new Error('Task not found');
    await assertTaskAccess(task, actor);

    const {
      completion_notes = '',
      evidence_url = null,
      evidence_name = null,
      delivery_stages = null
    } = data;

    // Delivery task protection: ensure client delivery stage is checked
    let finalStages = delivery_stages || task.delivery_stages;
    if (task.task_type === 'delivery') {
      if (finalStages && !finalStages.sent_to_client && !data.bypass_delivery_check) {
        throw new Error('Forgot-To-Send Protection: You must verify that the deliverable was sent to the client (sent_to_client = true) before marking as completed.');
      }
    }

    const updated = await db.update('tasks', task.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: actor?.id || null,
      completion_notes: completion_notes || 'Task deliverable confirmed and marked completed.',
      evidence_url,
      evidence_name,
      delivery_stages: finalStages,
      progress: 100
    });

    // TASK COMPLETION PROTECTION: Cancel all scheduled reminders for this task!
    await reminderService.cancelTaskReminders(task.id);

    await recordAudit(actor, 'TASK_COMPLETED', 'tasks', task.id, {
      title: task.title,
      client_name: task.client_name,
      completion_notes
    }, req);

    return updated;
  },

  /**
   * Updates task delivery milestones (e.g. prepared, reviewed, sent_to_client).
   */
  async updateDeliveryStages(taskId, stages, actor = null, req = null) {
    const task = await db.findById('tasks', taskId);
    if (!task) throw new Error('Task not found');
    await assertTaskAccess(task, actor);

    const updated = await db.update('tasks', task.id, {
      delivery_stages: {
        ...(task.delivery_stages || {}),
        ...stages
      }
    });

    await recordAudit(actor, 'TASK_DELIVERY_STAGES_UPDATED', 'tasks', task.id, { stages }, req);
    return updated;
  }
};
