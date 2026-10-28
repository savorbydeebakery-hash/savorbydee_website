/**
 * Paying cash when collecting, instead of UPI (client request, 2026-10-28).
 *
 * For when UPI isn't working for a customer (Google Pay down, a bank refusing
 * the payment). Pickups only: a delivery can be refused at the door after the
 * trip, so deliveries are always paid by UPI before they set off.
 *
 * site_settings.cash_at_pickup (migration 00053) decides how far it goes:
 *   off    UPI only
 *   daily  Today's Menu pickups only (default) — those bakes are already
 *          made, so a customer who doesn't come costs little; a cake baked
 *          specially for a preorder would be wasted
 *   all    any pickup
 *
 * The order API enforces this; checkout only offers what it will accept.
 */

export type CashAtPickup = "off" | "daily" | "all";

/** Unknown or missing (before the migration) means the default. */
export function readCashSetting(value: unknown): CashAtPickup {
  return value === "off" || value === "all" || value === "daily" ? value : "daily";
}

/** How long after the pickup time an unpaid cash order is held. */
export const CASH_HOLD_MINUTES = 30;

export interface CashCheck {
  allowed: boolean;
  /** Why not, in the customer's words, when it isn't allowed. */
  reason: string | null;
}

export function cashAtPickupAllowed(
  setting: CashAtPickup,
  fulfillment: "pickup" | "delivery",
  hasPreorderItems: boolean
): CashCheck {
  if (setting === "off") {
    return { allowed: false, reason: "We're taking UPI payments only at the moment." };
  }
  if (fulfillment === "delivery") {
    return { allowed: false, reason: "Deliveries are paid by UPI before we set off. Choose pickup to pay cash." };
  }
  if (setting === "daily" && hasPreorderItems) {
    return {
      allowed: false,
      reason: "Cash at pickup is for Today's Menu. Preorder items are made specially for you, so they're paid by UPI first.",
    };
  }
  return { allowed: true, reason: null };
}
