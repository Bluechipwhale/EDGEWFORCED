// ==============================================================================
// EDGEWFORCE - EXECUTIVE MANAGEMENT SERVICE
// CEO Enterprise Overview, Commercial Performance & Strategic Telemetry
// ==============================================================================

import { db } from '../config/database.js';

export const executiveService = {
  /**
   * Retrieves enterprise-wide operational metrics for CEO & Executives.
   */
  async getCEODashboardMetrics() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);
    const monthlyTarget = Number(process.env.MONTHLY_SALES_TARGET || 10000000);

    const orders = await db.find('orders');
    const deliveredOrders = orders.filter(o => o.status !== 'cancelled');
    const monthOrders = deliveredOrders.filter(o => String(o.order_date).slice(0, 7) === monthStr);
    const totalRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const collections = await db.find('collections');
    const totalCollections = collections.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const customers = await db.find('customers');
    const totalDebt = customers.reduce((sum, c) => sum + Math.max(0, Number(c.balance || 0)), 0);

    const employees = await db.find('employees', { status: 'active' });
    const attendance = await db.find('attendance', { date: todayStr });
    const presentCount = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const attendanceRate = employees.length > 0 ? Math.round((presentCount / employees.length) * 100) : 100;

    const activeFieldAgents = attendance.filter(a => a.clock_in_time && !a.clock_out_time).length;

    const tasks = await db.find('tasks');
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'Completed').length;
    const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;

    const openSOS = await db.find('sos', { status: 'active' });

    // Territory breakdown
    const territorySales = {};
    for (const order of monthOrders) {
      const cust = customers.find(c => Number(c.id) === Number(order.customer_id));
      const terr = cust?.territory || 'Unassigned';
      territorySales[terr] = (territorySales[terr] || 0) + Number(order.total_amount || 0);
    }

    const territoryList = Object.entries(territorySales).map(([territory, revenue]) => ({
      territory,
      revenue
    }));

    return {
      revenue: totalRevenue,
      monthlyTarget,
      targetAchievement: Math.round(((totalRevenue / monthlyTarget) * 100) * 10) / 10,
      collections: totalCollections,
      outstandingDebt: totalDebt,
      totalEmployees: employees.length,
      activeFieldAgents,
      attendanceRate,
      tasksCompletedRate: taskCompletionRate,
      openSOSCount: openSOS.length,
      territories: territoryList,
      recentAlerts: openSOS.slice(0, 5)
    };
  },

  async getDashboard() {
    return this.getCEODashboardMetrics();
  }
};
