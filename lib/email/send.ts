import { render } from "@react-email/render";
import { getResend, EMAIL_FROM, STAFF_NOTIFY_EMAIL } from "./client";
import OrderConfirmationEmail, {
  type OrderConfirmationEmailProps,
} from "./templates/order-confirmation";
import StaffNotificationEmail, {
  type StaffNotificationEmailProps,
} from "./templates/staff-notification";
import CustomCakeInquiryEmail, {
  type CustomCakeInquiryEmailProps,
} from "./templates/custom-cake-inquiry";
import AckWatchdogEmail, {
  type AckWatchdogEmailProps,
} from "./templates/ack-watchdog";

/**
 * Send order confirmation email to the customer.
 */
export async function sendOrderConfirmation(
  to: string,
  props: OrderConfirmationEmailProps
) {
  const resend = getResend();
  const html = await render(OrderConfirmationEmail(props));
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `SAVOR order ${props.humanId} confirmed! 🎂`,
    html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data?.id;
}

/**
 * Send new-order notification to staff (triggers the 30s alarm).
 */
export async function sendStaffNotification(
  props: StaffNotificationEmailProps
) {
  const resend = getResend();
  const html = await render(StaffNotificationEmail(props));
  const staffEmail = STAFF_NOTIFY_EMAIL;
  if (!staffEmail) {
    throw new Error("STAFF_NOTIFY_EMAIL is not set");
  }
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: staffEmail,
    subject: `🔔 New order ${props.humanId} — action required`,
    html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data?.id;
}

/**
 * Send custom cake inquiry notification to staff.
 */
export async function sendCustomCakeInquiry(
  props: CustomCakeInquiryEmailProps
) {
  const resend = getResend();
  const html = await render(CustomCakeInquiryEmail(props));
  const staffEmail = STAFF_NOTIFY_EMAIL;
  if (!staffEmail) {
    throw new Error("STAFF_NOTIFY_EMAIL is not set");
  }
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: staffEmail,
    subject: `🎂 New custom cake inquiry from ${props.customerName}`,
    html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data?.id;
}

/**
 * Send ack-watchdog fallback email to staff (order not acknowledged in time).
 */
export async function sendAckWatchdog(props: AckWatchdogEmailProps) {
  const resend = getResend();
  const html = await render(AckWatchdogEmail(props));
  const staffEmail = STAFF_NOTIFY_EMAIL;
  if (!staffEmail) {
    throw new Error("STAFF_NOTIFY_EMAIL is not set");
  }
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: staffEmail,
    subject: `🚨 UNACKNOWLEDGED order ${props.humanId} — ${props.minutesUnacknowledged} min`,
    html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data?.id;
}