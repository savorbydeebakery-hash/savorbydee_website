import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { samePhone } from "@/lib/customers/phone";
import { normalizePaymentReference } from "@/lib/payments/reference";
import { publicOrder } from "@/lib/payments/order-payment";

/**
 * POST /api/orders/[humanId]/payment  { phone, reference? }
 *
 * The customer says they have paid. Called when they tap "Send screenshot on
 * WhatsApp", so staff see "Says paid · check bank" in the admin list even if
 * the WhatsApp message never gets sent.
 *
 * What this can do, deliberately, is very little: move an unpaid order to
 * payment_status "pending" (awaiting staff) and record the UPI transaction ID
 * the customer typed. It can never mark an order paid — only staff can, after
 * seeing the money arrive — and it will not touch an order that is already
 * paid, refunded or cancelled.
 *
 * Same identity check as the order GET: the phone number on the order.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ humanId: string }> }
) {
  try {
    const { humanId } = await params;
    const body = (await request.json().catch(() => null)) as {
      phone?: string;
      reference?: string;
    } | null;

    if (!body?.phone) {
      return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("human_id", humanId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!samePhone(order.guest_phone, body.phone)) {
      return NextResponse.json(
        { error: "That order number and phone number do not match." },
        { status: 403 }
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        {
          error:
            "This order has been cancelled. If you have paid for it, message us on WhatsApp and we will refund you.",
        },
        { status: 409 }
      );
    }

    // Already settled: nothing to record, and nothing to overwrite.
    if (order.payment_status === "paid" || order.payment_status === "refunded") {
      return NextResponse.json({ order: publicOrder(order), unchanged: true });
    }

    // Optional. A malformed value is dropped rather than refused — the
    // screenshot is the proof, and a typo here must not stop the claim.
    const reference = normalizePaymentReference(body.reference);

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "pending",
        // First claim wins; tapping twice does not move the time.
        payment_claimed_at: order.payment_claimed_at ?? new Date().toISOString(),
        ...(reference ? { payment_reference: reference } : {}),
      })
      .eq("id", order.id)
      // Guard against a race with staff: if they marked it paid a moment
      // ago, this matches nothing instead of pulling it back to pending.
      .in("payment_status", ["unpaid", "pending", "failed"])
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error("[api/orders/payment] update error:", updateError);
      return NextResponse.json({ error: "Could not record your payment. Please message us on WhatsApp." }, { status: 500 });
    }

    return NextResponse.json({ order: publicOrder(updated ?? order), unchanged: !updated });
  } catch (error) {
    console.error("[api/orders/payment] unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
