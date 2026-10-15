# EdgeWForce feature guide

## Work together

Open **Projects & team chat** in the sidebar. Every existing role can use it; only invited project members can see a project.

| Feature | How it works |
| --- | --- |
| Shared projects | Create a project, describe its goal, choose a colour and add active colleagues from your company. |
| Project roles | Owners manage the project; owners can appoint leads. Leads can add members and create channels. |
| Team channels | Create separate channels for workstreams. Messages synchronize automatically while the page is open. |
| Threads | Reply to a message without interrupting the main conversation. |
| Mentions | Select a teammate using the composer’s mention menu. They receive a private inbox notice. |
| Message history | Load earlier messages. Search the messages loaded in the current channel. Drafts stay in the current browser tab when switching channels. |
| Shared task board | Assign one task to multiple project members. Move it through To do, In progress, In review and Done. |
| Task scheduling | Set a start, due time, reminder and priority. All scheduling inputs display Africa/Lagos time. |
| Recurring work | Daily and weekly tasks create their next occurrence when completed. Missed intervals are skipped; simultaneous completion requests cannot create duplicate occurrences. |
| Scheduled reminders | Supabase runs the project reminder function every minute, including when the app is closed. Delivery is recorded once per recipient and task. |
| Inbox and notification bell | Task assignments, mentions and reminders appear in the teamspace inbox and the main notification centre. Read state belongs to the recipient. |
| Activity | Task status changes show who changed the work and when. |

The collaboration additions have automated service tests, PostgreSQL transaction/permission tests and browser verification with two independent test users. The UI reports failed saves; collaboration writes are never queued as false successes while offline. Messages are plain text and are not end-to-end encrypted.

## Staff and operations

The existing modules remain available:

- HR staff directory, CSV/Excel import with preview and downloadable first-login credentials, profile editing and account status management.
- Office/work location creation, primary replacement, secondary offices, temporary assignments and assignment history.
- GPS clock-in/out using authoritative Lagos time: morning 06:00–12:00, midday 12:00–16:30 and clock-out 16:30–midnight. A real employee profile and permitted workplace are required. Supervisors can review exceptions.
- Daily schedule planning, supervisor review and HR roster oversight.
- Existing individual tasks, acknowledgement, completion and delivery stages.
- Leave requests and approvals, staff profiles, birthdays, announcements, objectives and key results.
- Inventory and warehouse records, stock movements and low-stock alerts.
- Customer/store directories, field visits, store requests and geofence checks.
- Sales catalogues, orders, collections, settlements and delivery records.
- Executive/HR/supervisor views, organization structure, reporting, audit logs and role-based access.

Automated tests cover these core service workflows. Hosted verification is recorded separately in `RELEASE_VERIFICATION.md`; an empty dashboard is not evidence that every provider integration has been configured.

## Integrations that need separate configuration

Email/WhatsApp delivery, browser push, online payment processing, external AI and biometric verification require their provider configuration and end-to-end acceptance checks. The features are retained, and no claim is made that an unconfigured provider has delivered a message, charged a payment or verified a face. Existing individual-task background email/WhatsApp delivery uses the worker; the new Supabase schedule handles project in-app reminders.

Passwords are never committed to source. A separate administrator is explicitly provisioned using `server/scripts/createAdministrator.js`; existing administrator accounts are not reset or replaced.

## Staff activity and HR review

- Authenticated active staff profiles report app interaction counts every 30 seconds. No typed text, screenshots, camera, device applications or operating-system activity are collected.
- After 600 seconds without observed interaction, the server records one flag per inactivity period. A Supabase job checks every minute, including when browsers are suspended or closed. The notification bell refreshes every 30 seconds.
- Recent heartbeats distinguish app inactivity from an unconfirmed lost connection. Activity in any signed-in tab counts, and returning closes the open period without deleting its history.
- HR/HR_MANAGER users in the same company receive an in-app notice, even without an employee profile. Administrators receive fallback notices if no active HR account exists.
- HR Overview has an activity review queue with explanations, resumed activity, Lagos timestamps, acknowledgement and history. Staff can explain their own events and continue working; review access is limited to authorized company managers.
- Monitoring starts with a signed-in active staff profile and stops on explicit sign-out. It is not limited to clocked-in hours. Closing the browser without signing out can produce a connection-gap flag. A flag is context for human review, not proof that someone stopped working.
