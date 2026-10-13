// ==============================================================================
// EDGEWFORCE - NOTIFICATION ENGINE SERVICE
// In-App Notifications, Push Subscriptions & Emergency Chimes
// ==============================================================================

import { db } from '../config/database.js';

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
  async getNotifications(employeeId) {
    const list = await db.find('notifications', { employee_id: Number(employeeId) }, { order: { column: 'created_at', ascending: false } });
    const unreadCount = list.filter(n => !n.read).length;
    return {
      notifications: list,
      unreadCount
    };
  },

  /**
   * Marks a notification or all notifications as read.
   */
  async markRead(notificationId, employeeId) {
    if (notificationId === 'all') {
      const all = await db.find('notifications', { employee_id: Number(employeeId), read: false });
      for (const n of all) {
        await db.update('notifications', n.id, { read: true });
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
