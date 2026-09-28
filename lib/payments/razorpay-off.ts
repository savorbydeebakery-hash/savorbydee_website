import { NextResponse } from "next/server";

/**
 * Razorpay is switched off; payments are manual UPI (docs/manual-payments.md).
 *
 * The Razorpay routes are kept so the integration can come back, but each one
 * refuses at the top while this is true. Left open they were a way to change
 * an order behind staff's back: create-order sets payment_status to "pending"
 * — which now means "the customer says they have paid" — and overwrites the
 * column the checkout's idempotency key is stored in, all for anyone who
 * knows an order's id.
 */
export const RAZORPAY_DISABLED = true;

export function razorpayDisabled() {
  return NextResponse.json(
    { error: "Card payments are not available. Please pay by UPI from your order page." },
    { status: 410 }
  );
}
