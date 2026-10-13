// ==============================================================================
// EDGEWFORCE - DELIVERY & LOGISTICS SERVICE
// ==============================================================================

import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

export const deliveryService = {
  async getDeliveries(companyId, filters = {}) {
    const compId = Number(companyId || 1);
    let list = await db.find('deliveries', { company_id: compId }, {
      order: { column: 'created_at', ascending: false }
    });

    if (filters.status && filters.status !== 'all') {
      list = list.filter(d => d.delivery_status === filters.status);
    }

    const customers = await db.find('customers', { company_id: compId });
    const custMap = new Map(customers.map(c => [c.id, c]));

    const orders = await db.find('orders', { company_id: compId });
    const orderMap = new Map(orders.map(o => [o.id, o]));

    return list.map(d => ({
      ...d,
      customer: custMap.get(d.customer_id) || { name: 'Customer Outlet', address: '' },
      order: orderMap.get(d.order_id) || { order_number: 'N/A', total_amount: 0 }
    }));
  },

  async getDeliveryById(id, companyId) {
    const delivery = await db.findById('deliveries', id);
    if (!delivery) return null;
    if (companyId && delivery.company_id !== Number(companyId)) return null;

    const customer = await db.findById('customers', delivery.customer_id);
    const order = await db.findById('orders', delivery.order_id);
    const orderItems = order ? await db.find('order_items', { order_id: order.id }) : [];

    return {
      ...delivery,
      customer,
      order,
      items: orderItems
    };
  },

  async dispatchOrder(dispatchData, user) {
    const { order_id, driver_name, driver_phone, vehicle_number } = dispatchData;
    const order = await db.findById('orders', order_id);
    if (!order) throw new Error('Order not found');

    // Create or update delivery
    let delivery = await db.findOne('deliveries', { order_id: Number(order_id) });
    if (delivery) {
      delivery = await db.update('deliveries', delivery.id, {
        driver_name,
        driver_phone,
        vehicle_number,
        dispatch_time: new Date().toISOString(),
        delivery_status: 'IN_TRANSIT'
      });
    } else {
      delivery = await db.insert('deliveries', {
        company_id: order.company_id,
        order_id: Number(order_id),
        customer_id: order.customer_id,
        driver_name,
        driver_phone,
        vehicle_number,
        dispatch_time: new Date().toISOString(),
        delivery_status: 'IN_TRANSIT'
      });
    }

    // Update order status
    await db.update('orders', order_id, {
      status: 'DISPATCHED',
      delivery_status: 'IN_TRANSIT'
    });

    return delivery;
  },

  async confirmProofOfDelivery(deliveryId, payload, user) {
    const delivery = await db.findById('deliveries', deliveryId);
    if (!delivery) throw new Error('Delivery not found');

    const updated = await db.update('deliveries', deliveryId, {
      delivery_status: 'DELIVERED',
      actual_delivery_time: new Date().toISOString(),
      recipient_name: payload.recipient_name || 'Customer Representative',
      recipient_signature: payload.signature_url || payload.recipient_signature || null,
      proof_of_delivery_photo: payload.photo_url || payload.proof_of_delivery_photo || null
    });

    // Update order status to DELIVERED
    await db.update('orders', delivery.order_id, {
      status: 'DELIVERED',
      delivery_status: 'DELIVERED'
    });

    return updated;
  },

  async failDelivery(deliveryId, reason, user) {
    const delivery = await db.findById('deliveries', deliveryId);
    if (!delivery) throw new Error('Delivery not found');

    const updated = await db.update('deliveries', deliveryId, {
      delivery_status: 'FAILED',
      failure_reason: reason
    });

    await db.update('orders', delivery.order_id, {
      delivery_status: 'FAILED'
    });

    return updated;
  },

  async getDeliveryMetrics(companyId) {
    const compId = Number(companyId || 1);
    const deliveries = await db.find('deliveries', { company_id: compId });

    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.delivery_status === 'DELIVERED').length;
    const inTransit = deliveries.filter(d => d.delivery_status === 'IN_TRANSIT').length;
    const pending = deliveries.filter(d => d.delivery_status === 'PENDING').length;
    const failed = deliveries.filter(d => d.delivery_status === 'FAILED').length;

    return {
      total,
      delivered,
      inTransit,
      pending,
      failed,
      successRate: total > 0 ? Math.round((delivered / total) * 100) : 100
    };
  }
};
