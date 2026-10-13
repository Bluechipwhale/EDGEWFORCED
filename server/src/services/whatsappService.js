// ==============================================================================
// EDGEWFORCE - WHATSAPP CLOUD API SERVICE
// Enterprise multi-channel proactive notifications & task reminders
// ==============================================================================

import { logger } from '../utils/logger.js';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export const whatsappService = {
  /**
   * Dispatches a WhatsApp notification message using Meta WhatsApp Cloud API.
   * Gracefully handles unconfigured credentials and returns clear diagnostics.
   */
  async sendMessage(toPhone, messageBody, metadata = {}) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

    const normalizedTo = normalizePhone(toPhone);
    if (!normalizedTo) {
      return {
        delivered: false,
        status: 'failed',
        error: 'Invalid recipient phone number'
      };
    }

    // Strip leading '+' for WhatsApp Graph API payload
    const recipientDigits = normalizedTo.replace(/^\+/, '');

    if (!accessToken || !phoneNumberId) {
      logger.info(`[WHATSAPP SIMULATED] To: ${normalizedTo} | Body: ${messageBody.slice(0, 80)}... (WhatsApp credentials not configured in .env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)`);
      return {
        delivered: false,
        status: 'not_configured',
        simulated: true,
        message: 'WhatsApp Cloud API credentials not configured in environment (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID).'
      };
    }

    try {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientDigits,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.error(`[WHATSAPP ERROR] Failed to send message to ${normalizedTo}: ${errorMsg}`);
        return {
          delivered: false,
          status: 'failed',
          error: errorMsg
        };
      }

      const messageId = data?.messages?.[0]?.id || 'WID-' + Date.now();
      logger.info(`[WHATSAPP DELIVERED] Message ${messageId} sent successfully to ${normalizedTo}`);
      return {
        delivered: true,
        status: 'sent',
        provider_message_id: messageId
      };
    } catch (err) {
      logger.error(`[WHATSAPP NETWORK ERROR] ${err.message}`);
      return {
        delivered: false,
        status: 'failed',
        error: err.message
      };
    }
  },

  /**
   * Generates formatted contextual task reminder template message.
   */
  formatTaskReminder(task, reminderLevel = 'pre_deadline') {
    const client = task.client_name ? `for *${task.client_name}*` : '';
    const project = task.project_name ? `(${task.project_name})` : '';
    const dueStr = task.due_at || task.due_date ? new Date(task.due_at || task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon';

    if (reminderLevel === 'deadline') {
      return `⏰ *EDGEWFORCE TASK DUE NOW*\n\nYour task *${task.title}* ${client} ${project} is due right now at ${dueStr}.\n\nPlease complete your deliverable, verify client delivery, and mark it done on your dashboard.\n\n— EdgeWForce Intelligence`;
    }

    if (reminderLevel === 'overdue' || reminderLevel === 'escalation') {
      return `🚨 *EDGEWFORCE TASK OVERDUE ALERT*\n\nAttention: *${task.title}* ${client} ${project} is now OVERDUE (Deadline was ${dueStr}).\n\nSupervisor escalation active. Please complete and attach proof immediately.\n\n— EdgeWForce Intelligence`;
    }

    return `🔔 *EDGEWFORCE TASK REMINDER*\n\nUpcoming: *${task.title}* ${client} ${project}\n⏰ Deadline: *${dueStr}*\nPriority: *${(task.priority || 'Normal').toUpperCase()}*\n\nPlease make sure this deliverable is completed and delivered on time.\n\n— EdgeWForce Intelligence`;
  }
};
