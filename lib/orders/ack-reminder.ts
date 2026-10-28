/**
 * When an order gets the "still not acknowledged" reminder email.
 *
 * Checked once a minute by app/api/cron/ack-watchdog. One reminder per order,
 * five minutes after it was placed, if nobody has tapped Acknowledge and it is
 * still pending. Orders over an hour old are left alone, so switching the
 * reminder on (or a long outage) never mails a backlog.
 *
 * No extra column records that the reminder went. The order API stamps
 * staff_email_sent_at seconds after the order is created, when it sends the
 * new-order email; the reminder re-stamps it. So a stamp well after creation
 * means "already reminded".
 */

export const ACK_REMINDER_AFTER_MS = 5 * 60_000;
export const ACK_REMINDER_MAX_AGE_MS = 60 * 60_000;

/** The new-order email lands within seconds; anything later is a reminder. */
const NEW_ORDER_EMAIL_GRACE_MS = 2 * 60_000;

/**
 * Names the E2E specs order under. Mirrors the list in
 * supabase/migrations/00038_purge_e2e_rows.sql: the daily test run places
 * these at 11:00 and deletes them minutes later, and staff should not be
 * emailed about them in between.
 */
export const E2E_FIXTURE_NAMES = [
  "E2E Test Customer",
  "Alarm Test",
  "Rule Probe",
  "Probe Check",
  "Price Probe",
  "Razorpay Test",
  // The custom cake enquiry spec (an enquiry, not an order).
  "Cake Inquiry Test",
];

export interface AckReminderCandidate {
  status: string;
  acknowledged_at: string | null;
  created_at: string;
  staff_email_sent_at: string | null;
  guest_name: string | null;
}

export function needsAckReminder(order: AckReminderCandidate, now: number): boolean {
  if (order.status !== "pending" || order.acknowledged_at) return false;
  if (order.guest_name && E2E_FIXTURE_NAMES.includes(order.guest_name)) return false;

  const created = Date.parse(order.created_at);
  if (!Number.isFinite(created)) return false;
  const age = now - created;
  if (age < ACK_REMINDER_AFTER_MS || age > ACK_REMINDER_MAX_AGE_MS) return false;

  const sent = order.staff_email_sent_at ? Date.parse(order.staff_email_sent_at) : NaN;
  if (Number.isFinite(sent) && sent - created > NEW_ORDER_EMAIL_GRACE_MS) return false;

  return true;
}
