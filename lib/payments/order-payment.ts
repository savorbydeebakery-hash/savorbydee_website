import { buildUpiUri, isValidVpa, transactionNote, cleanPayeeName } from "@/lib/payments/upi";
import { waNumber } from "@/lib/payments/whatsapp";

/**
 * What a customer's order page is allowed to know, and how to pay for it.
 *
 * Used by both order GET routes. They read the row with the service role, so
 * `select("*")` returns staff-only columns too; this is the filter.
 */

/** Columns that are staff business, or plumbing, and never go to a customer. */
const INTERNAL_COLUMNS = [
  "payment_note",
  "payment_verified_by",
  "acknowledged_by",
  "staff_email_sent_at",
  "email_status",
  "razorpay_order_id",
  "razorpay_payment_id",
  "razorpay_signature",
  "customer_id",
  "stock_restored_at",
] as const;

export function publicOrder<T extends Record<string, unknown>>(order: T): Omit<T, (typeof INTERNAL_COLUMNS)[number]> {
  const copy: Record<string, unknown> = { ...order };
  for (const column of INTERNAL_COLUMNS) delete copy[column];
  return copy as Omit<T, (typeof INTERNAL_COLUMNS)[number]>;
}

export interface PaymentSettingsRow {
  upi_id?: string | null;
  upi_payee_name?: string | null;
  bakery_name?: string | null;
  payment_whatsapp_number?: string | null;
  whatsapp_number?: string | null;
  contact_phone?: string | null;
  payment_window_minutes?: number | null;
  free_delivery_threshold_cents?: number | null;
}

export const PAYMENT_SETTINGS_COLUMNS =
  "upi_id, upi_payee_name, bakery_name, payment_whatsapp_number, whatsapp_number, contact_phone, payment_window_minutes, free_delivery_threshold_cents";

export const DEFAULT_PAYMENT_WINDOW_MINUTES = 60;

export interface OrderPayment {
  amountCents: number;
  /** Null when no valid UPI ID is set: the page offers WhatsApp instead. */
  upi: { vpa: string; payeeName: string; note: string; uri: string } | null;
  /** Digits with country code, ready for wa.me. Null hides the button. */
  whatsapp: string | null;
  /** A number to ring for anyone not on WhatsApp. */
  phone: string | null;
  dueAt: string | null;
  windowMinutes: number;
  /** For the "bakes only" reminder next to the QR on delivery orders. */
  freeDeliveryOverCents: number | null;
}

export function buildOrderPayment(
  order: { human_id: string; total_cents: number; payment_due_at?: string | null },
  settings: PaymentSettingsRow | null | undefined
): OrderPayment {
  const s = settings ?? {};
  const vpa = s.upi_id?.trim();
  const payeeName = cleanPayeeName(s.upi_payee_name?.trim() || s.bakery_name?.trim() || "Savor by Dee");
  const note = transactionNote(order.human_id);

  return {
    amountCents: order.total_cents,
    upi: isValidVpa(vpa)
      ? {
          vpa,
          payeeName,
          note,
          uri: buildUpiUri({ vpa, payeeName, amountCents: order.total_cents, note }),
        }
      : null,
    whatsapp: waNumber(s.payment_whatsapp_number) ?? waNumber(s.whatsapp_number),
    phone: s.contact_phone?.trim() || null,
    dueAt: order.payment_due_at ?? null,
    windowMinutes: s.payment_window_minutes ?? DEFAULT_PAYMENT_WINDOW_MINUTES,
    freeDeliveryOverCents: s.free_delivery_threshold_cents ?? null,
  };
}
