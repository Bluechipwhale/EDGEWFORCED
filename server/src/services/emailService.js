import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.resend.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465; // true for 465, false for 587
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: true }
    });
    logger.info(`Email service initialized with SMTP host: ${host}:${port} (${user})`);
  } else {
    logger.warn('SMTP credentials not configured in environment (SMTP_USER / SMTP_PASS). Emails will be logged to console in simulation mode.');
  }

  return transporter;
}

export const emailService = {
  /**
   * Sends password reset verification PIN email.
   */
  async sendPasswordResetEmail(recipientEmail, resetToken, recipientName = 'Team Member') {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@edgewforce.com';
    const client = getTransporter();

    const subject = `🔐 EdgeWForce Security: Password Recovery`;
    const textContent = `Hello ${recipientName},\n\nYou requested a password reset for your EdgeWForce account.\nYour recovery code is: ${resetToken}\n\nThis code will expire in 60 minutes.\n\n— EdgeWForce Security Team`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 18px; letter-spacing: 1px;">
            EDGEWFORCE
          </div>
        </div>
        <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-bottom: 8px; text-align: center;">Password Reset Request</h2>
        <p style="color: #52525b; font-size: 14px; line-height: 1.5; text-align: center;">
          Hello <strong>${recipientName}</strong>, use the verification code below to securely reset your password.
        </p>
        <div style="background: #fff7ed; border: 2px dashed #f97316; border-radius: 10px; padding: 18px; margin: 24px 0; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your Recovery Code</div>
          <div style="font-size: 32px; font-weight: 900; font-family: monospace; color: #c2410c; letter-spacing: 6px;">${resetToken}</div>
          <div style="font-size: 11px; color: #71717a; margin-top: 6px;">Valid for 60 minutes</div>
        </div>
        <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
          If you did not request this password reset, please disregard this email or report it to your IT Administrator.
        </p>
        <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 20px 0;" />
        <div style="text-align: center; font-size: 11px; color: #a1a1aa;">
          EdgeWForce Enterprise Workforce Management &copy; ${new Date().getFullYear()}
        </div>
      </div>
    `;

    return this.dispatchMail(recipientEmail, subject, textContent, htmlContent, fromAddress);
  },

  /**
   * Sends proactive task reminder email.
   */
  async sendTaskReminderEmail(recipientEmail, task, recipientName = 'Team Member', reminderLevel = 'pre_deadline') {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@edgewforce.com';
    const clientName = task.client_name ? `for ${task.client_name}` : '';
    const projectName = task.project_name ? `(${task.project_name})` : '';
    const dueTime = task.due_at || task.due_date ? new Date(task.due_at || task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon';

    const isDueNow = reminderLevel === 'deadline';
    const subject = isDueNow
      ? `⏰ [TASK DUE NOW] ${task.title} ${clientName}`
      : `🔔 [TASK REMINDER] ${task.title} ${clientName} - Due ${dueTime}`;

    const textContent = `Hello ${recipientName},\n\nThis is a reminder for your assigned task:\n\nTask: ${task.title}\nClient: ${task.client_name || 'N/A'}\nProject: ${task.project_name || 'N/A'}\nPriority: ${task.priority || 'Normal'}\nDeadline: ${dueTime}\n\nPlease complete this task, verify delivery if applicable, and mark it done on EdgeWForce.\n\n— EdgeWForce Task Intelligence`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="background-color: #f97316; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 14px;">EDGEWFORCE</span>
          <span style="background-color: ${isDueNow ? '#ef4444' : '#f97316'}; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${isDueNow ? 'DUE NOW' : 'REMINDER'}</span>
        </div>
        <h2 style="color: #18181b; font-size: 18px; font-weight: 700; margin-bottom: 8px;">${task.title}</h2>
        <p style="color: #52525b; font-size: 13px; line-height: 1.5;">
          Hello <strong>${recipientName}</strong>, this is an automated reminder for your deliverable:
        </p>
        <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; font-size: 13px; color: #3f3f46;">
            <tr><td style="padding: 4px 0; color: #71717a;">Client:</td><td style="font-weight: 700; color: #18181b;">${task.client_name || 'Internal Operations'}</td></tr>
            <tr><td style="padding: 4px 0; color: #71717a;">Project:</td><td style="font-weight: 700; color: #18181b;">${task.project_name || 'General Directive'}</td></tr>
            <tr><td style="padding: 4px 0; color: #71717a;">Deadline:</td><td style="font-weight: 700; color: #ea580c;">${dueTime}</td></tr>
            <tr><td style="padding: 4px 0; color: #71717a;">Priority:</td><td style="font-weight: 700;">${(task.priority || 'Normal').toUpperCase()}</td></tr>
          </table>
          ${task.description ? `<p style="margin-top: 10px; font-size: 12px; color: #52525b; border-top: 1px dashed #e4e4e7; pt: 8px;"><strong>Instructions:</strong> ${task.description}</p>` : ''}
        </div>
        <p style="color: #71717a; font-size: 12px;">Please log in to your EdgeWForce workspace to complete this task and attach evidence.</p>
      </div>
    `;

    return this.dispatchMail(recipientEmail, subject, textContent, htmlContent, fromAddress);
  },

  /**
   * Sends overdue escalation email to supervisor / management.
   */
  async sendEscalationEmail(supervisorEmail, task, employeeName, minutesOverdue = 15) {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@edgewforce.com';
    const subject = `🚨 [ESCALATION] Task Overdue by ${minutesOverdue}m: ${task.title} (${employeeName})`;

    const textContent = `ESCALATION NOTICE\n\nThe following directive is overdue by ${minutesOverdue} minutes:\n\nTask: ${task.title}\nAssigned Staff: ${employeeName}\nClient: ${task.client_name || 'N/A'}\nProject: ${task.project_name || 'N/A'}\nPriority: ${task.priority || 'Normal'}\n\nPlease review on your supervisor dashboard.\n\n— EdgeWForce Escalation Engine`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background-color: #ffffff; border-radius: 12px; border: 2px solid #ef4444;">
        <div style="background-color: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; font-weight: 800; font-size: 13px; text-transform: uppercase; margin-bottom: 12px;">
          ⚠️ Supervisor Escalation Notice
        </div>
        <h3 style="color: #18181b; font-size: 18px; margin-bottom: 8px;">${task.title}</h3>
        <p style="color: #52525b; font-size: 13px;">
          Assigned to <strong>${employeeName}</strong>. This task is currently <strong>${minutesOverdue} minutes overdue</strong> without verified completion.
        </p>
        <div style="background: #fafafa; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 12px;">
          <div><strong>Client:</strong> ${task.client_name || 'N/A'}</div>
          <div><strong>Project:</strong> ${task.project_name || 'N/A'}</div>
          <div><strong>Priority:</strong> ${(task.priority || 'Normal').toUpperCase()}</div>
        </div>
      </div>
    `;

    return this.dispatchMail(supervisorEmail, subject, textContent, htmlContent, fromAddress);
  },

  /**
   * Sends 10-minute inactivity telemetry alert email to IT & HR.
   */
  async sendIdleAlertEmail(recipientEmail, session, employeeName, department = 'Operations') {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@edgewforce.com';
    const subject = `⚠️ [WORKSTATION TELEMETRY] 10m Inactivity Alert: ${employeeName} (${department})`;

    const textContent = `WORKSTATION INACTIVITY ALERT\n\nEmployee: ${employeeName}\nDepartment: ${department}\nIdle Duration: ${Math.round((session.duration_seconds || 600) / 60)} minutes\nDetected At: ${new Date(session.detected_at || Date.now()).toLocaleTimeString()}\nStatus: Awaiting employee explanation\n\n— EdgeWForce Workstation Telemetry`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 10px; border: 1px solid #e4e4e7;">
        <div style="background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 12px; margin-bottom: 12px;">
          Workstation Inactivity Alert (10m+)
        </div>
        <h4 style="margin: 0 0 8px 0; color: #18181b;">${employeeName} — ${department}</h4>
        <p style="color: #52525b; font-size: 12px; line-height: 1.5;">
          The system detected no active user interaction on the EdgeWForce portal for over 10 minutes.
        </p>
        <div style="background: #fafafa; padding: 10px; border-radius: 6px; font-size: 11px; margin: 12px 0;">
          <div><strong>Detected:</strong> ${new Date(session.detected_at || Date.now()).toLocaleTimeString()}</div>
          <div><strong>Window State:</strong> ${session.workstation_snapshot?.window_state || 'Active Tab Inactive'}</div>
          <div><strong>Status:</strong> Awaiting employee explanation</div>
        </div>
      </div>
    `;

    return this.dispatchMail(recipientEmail, subject, textContent, htmlContent, fromAddress);
  },

  /**
   * Internal email dispatcher helper.
   */
  async dispatchMail(to, subject, text, html, from) {
    const client = getTransporter();
    if (client) {
      try {
        const info = await client.sendMail({
          from: `"EdgeWForce System" <${from}>`,
          to,
          subject,
          text,
          html
        });
        logger.info(`Email delivered to ${to} (${subject}). MsgId: ${info.messageId}`);
        return { delivered: true, messageId: info.messageId };
      } catch (err) {
        logger.error(`Failed to send email to ${to}: ${err.message}`);
        return { delivered: false, error: err.message };
      }
    } else {
      logger.info(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
      return { delivered: false, simulated: true };
    }
  }
};
