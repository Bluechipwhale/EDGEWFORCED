// ==============================================================================
// EDGEWFORCE - NOTIFICATION ENGINE SERVICE
// In-App Notifications, Push Subscriptions & Emergency Chimes
// ==============================================================================

import { db } from '../config/database.js';
import { collaborationService } from './collaborationService.js';

export const notificationService = {
  /**
   * Dispatches a notification to an employee.
   */
  async notify(employeeId, type, title, body, link = null) {
    return await db.insert('notifications', {
      employee_id: Number(employeeId),
      type: type || 'System',
      title,
      body,
      link: link || null,
      read: false
    });
  },

  /**
   * Retrieves user notifications with unread count.
   */
  async getNotifications(employeeId, user = null) {
    let list = employeeId ? await db.find('notifications', { employee_id: Number(employeeId) }, { order: { column: 'created_at', ascending: false } }) : [];
    if (user) {
      list = list.filter(n => !n.company_id || Number(n.company_id) === Number(user.company_id));
      await collaborationService.processDue(user);
      const notices = await db.find('collaboration_notices', { user_id: Number(user.id), company_id: Number(user.company_id) }, { order: { column: 'created_at', ascending: false }, limit: 100 });
      list = [...notices.map(n => ({ ...n, id: `project:${n.id}`, type: 'Tasks', read: Boolean(n.read_at), link: 'projects' })), ...list].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    }
    const unreadCount = list.filter(n => !n.read).length;
    return {
      notifications: list,
      unreadCount
    };
  },

  /**
   * Marks a notification or all notifications as read.
   */
  async markRead(notificationId, employeeId, user = null) {
    if (String(notificationId).startsWith('project:')) {
      if (!user) throw new Error('Authentication required.');
      return collaborationService.markRead(user, String(notificationId).slice(8));
    }
    if (notificationId === 'all') {
      const all = employeeId ? await db.find('notifications', { employee_id: Number(employeeId), read: false }) : [];
      for (const n of all) {
        await db.update('notifications', n.id, { read: true });
      }
      if (user) {
        const notices = await db.find('collaboration_notices', { user_id: Number(user.id), company_id: Number(user.company_id) });
        for (const notice of notices.filter(n=>!n.read_at)) await collaborationService.markRead(user, notice.id);
      }
      return { success: true };
    }

    const notification = await db.findById('notifications', notificationId);
    if (!notification || Number(notification.employee_id) !== Number(employeeId)) throw new Error('Notification not found.');
    return await db.update('notifications', notificationId, { read: true });
  },

  /**
   * Saves Web Push subscription.
   */
  async subscribePush(employeeId, endpoint, subscriptionJson) {
    const existing = await db.findOne('push_subscriptions', { employee_id: Number(employeeId) });
    if (existing) {
      return await db.update('push_subscriptions', existing.id, {
        endpoint,
        subscription_json: typeof subscriptionJson === 'string' ? subscriptionJson : JSON.stringify(subscriptionJson)
      });
    }

    return await db.insert('push_subscriptions', {
      employee_id: Number(employeeId),
      endpoint,
      subscription_json: typeof subscriptionJson === 'string' ? subscriptionJson : JSON.stringify(subscriptionJson)
    });
  }
};
