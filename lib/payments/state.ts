/**
 * Where an order's payment stands, as ONE answer shared by the customer's
 * order page and the admin panel.
 *
 * Two columns feed it — `status` (the order) and `payment_status` (the money)
 * — plus the payment deadline. Reading them separately in each screen is how
 * a cancelled order ends up showing "Pay now", or a paid one "Overdue".
 *
 * payment_status meanings with manual UPI:
 *   unpaid    nothing reported yet
 *   pending   the customer says they have paid; staff have not checked yet
 *   paid      staff saw the money arrive (see migration 00045)
 *   failed    staff looked and could not find the payment
 *   refunded  money sent back
 */

export type PaymentStage =
  | "cancelled"
  | "refunded"
  | "paid"
  | "checking"
  | "not_found"
  | "awaiting"
  | "overdue";

export interface PaymentStageInput {
  status: string;
  payment_status: string;
  payment_due_at?: string | null;
}

export function paymentStage(order: PaymentStageInput, now: number = Date.now()): PaymentStage {
  // Cancelled wins over everything: a cancelled order must never invite a
  // payment, whatever the money column says.
  if (order.status === "cancelled") return "cancelled";

  switch (order.payment_status) {
    case "refunded":
      return "refunded";
    case "paid":
      return "paid";
    case "pending":
      return "checking";
    case "failed":
      return "not_found";
  }

  // unpaid, or anything unexpected. An order with no deadline (placed before
  // the window existed) is never overdue — there is nothing to be late for.
  const due = order.payment_due_at ? Date.parse(order.payment_due_at) : NaN;
  if (Number.isFinite(due) && now > due) return "overdue";
  return "awaiting";
}

/** The customer can still be asked to pay. */
export function acceptsPayment(stage: PaymentStage): boolean {
  return stage === "awaiting" || stage === "overdue" || stage === "not_found";
}

/** The page should keep checking for a change made by staff. */
export function isWaitingOnBakery(stage: PaymentStage): boolean {
  return stage === "awaiting" || stage === "checking" || stage === "overdue" || stage === "not_found";
}

type BadgeColor = "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral";

/** Wording for customers, wherever their order is listed. */
export const CUSTOMER_PAYMENT_LABEL: Record<PaymentStage, { text: string; color: BadgeColor }> = {
  awaiting: { text: "Awaiting payment", color: "yellow" },
  overdue: { text: "Not paid", color: "pink" },
  checking: { text: "Checking payment", color: "sky" },
  not_found: { text: "Payment not found", color: "pink" },
  paid: { text: "Paid", color: "mint" },
  refunded: { text: "Refunded", color: "neutral" },
  cancelled: { text: "Cancelled", color: "neutral" },
};

/**
 * The order's own progress, in the customer's words. The raw column
 * ("pending", "in_progress") meant nothing to a customer, and "pending" next
 * to "unpaid" read as two problems when it is one.
 */
export const CUSTOMER_ORDER_STATUS: Record<string, { text: string; color: BadgeColor }> = {
  pending: { text: "Received", color: "yellow" },
  confirmed: { text: "Confirmed", color: "sky" },
  paid: { text: "Confirmed", color: "sky" },
  in_progress: { text: "Being baked", color: "lavender" },
  ready: { text: "Ready", color: "peach" },
  fulfilled: { text: "Completed", color: "mint" },
  cancelled: { text: "Cancelled", color: "neutral" },
};

/** Wording for staff. Says what to DO, not just what the column holds. */
export const ADMIN_PAYMENT_BADGE: Record<PaymentStage, { label: string; color: BadgeColor }> = {
  awaiting: { label: "Awaiting payment", color: "yellow" },
  overdue: { label: "Unpaid · overdue", color: "pink" },
  checking: { label: "Says paid · check bank", color: "sky" },
  not_found: { label: "Payment not found", color: "pink" },
  paid: { label: "Paid", color: "mint" },
  refunded: { label: "Refunded", color: "neutral" },
  cancelled: { label: "Cancelled", color: "neutral" },
};

/**
 * Admin label for a cancelled order depends on the money too: a cancelled
 * order that was paid needs refunding, which is an action, not an archive.
 */
export function adminPaymentBadge(order: PaymentStageInput, now: number = Date.now()) {
  const stage = paymentStage(order, now);
  if (stage === "cancelled" && order.payment_status === "paid") {
    return { label: "Cancelled · refund due", color: "pink" as BadgeColor, stage };
  }
  if (stage === "cancelled" && order.payment_status === "refunded") {
    return { label: "Cancelled · refunded", color: "neutral" as BadgeColor, stage };
  }
  return { ...ADMIN_PAYMENT_BADGE[stage], stage };
}

/**
 * Difference between what arrived and what the order costs, for staff.
 * Positive = customer paid too much, negative = too little, 0 = exact.
 */
export function paymentDifferenceCents(totalCents: number, receivedCents: number | null | undefined): number | null {
  if (receivedCents == null) return null;
  return receivedCents - totalCents;
}
