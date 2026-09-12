/**
 * Whether this order pays for delivery.
 *
 * The checkout says something about the delivery charge in three places — when
 * Delivery is picked, above the address, and beside the total on the confirm
 * step — and the shipping policy says it a fourth time. Each was written
 * separately, and they drifted: an order over the threshold was told "this
 * order qualifies for free delivery", then "delivery is charged separately",
 * then "your delivery charge depends on the distance, payable in cash on
 * arrival". Three answers to one question, two of them wrong.
 *
 * One decision, so they cannot disagree again.
 */
export type DeliveryCharge =
  /** Over the threshold. Nothing more to pay. */
  | "free"
  /** Under it, or no threshold configured. Staff quote it from the address. */
  | "quoted";

export function deliveryChargeFor(
  totalCents: number,
  freeOverCents: number | null | undefined
): DeliveryCharge {
  // A threshold that is not set is not a threshold of zero. Treating a missing
  // setting as "everything is free" would promise free delivery on a ₹40 bun.
  if (freeOverCents == null || !Number.isFinite(freeOverCents)) return "quoted";
  return totalCents >= freeOverCents ? "free" : "quoted";
}
