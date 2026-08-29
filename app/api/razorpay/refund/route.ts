import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * T6.4: Refund/cancellation flow.
 * Creates a Razorpay refund for a paid order and updates status.
 *
 * POST /api/razorpay/refund
 * Body: { orderId: string (SAVOR order UUID), reason?: string }
 *
 * Only staff/admin can initiate refunds (checked via auth).
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, reason } = (await request.json()) as {
      orderId: string;
      reason?: string;
    };

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch order
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, human_id, total_cents, payment_status, razorpay_payment_id, razorpay_order_id")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status !== "paid") {
      return NextResponse.json({ error: "Order is not paid, cannot refund" }, { status: 400 });
    }

    if (!order.razorpay_payment_id) {
      return NextResponse.json({ error: "No Razorpay payment ID found" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    // Create refund via Razorpay API
    const auth = btoa(`${keyId}:${keySecret}`);
    const refundResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: order.total_cents,
          notes: {
            savor_order_id: order.id,
            savor_human_id: order.human_id,
            reason: reason ?? "Customer cancellation",
          },
        }),
      }
    );

    if (!refundResponse.ok) {
      const errData = await refundResponse.json();
      console.error("[razorpay/refund] API error:", errData);
      return NextResponse.json(
        { error: "Refund failed", details: errData },
        { status: 502 }
      );
    }

    const refund = (await refundResponse.json()) as {
      id: string;
      amount: number;
    };

    // Update order status
    await supabase
      .from("orders")
      .update({
        payment_status: "refunded",
        status: "cancelled",
        notes: reason ? `Refund reason: ${reason}` : null,
      })
      .eq("id", order.id);

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      amount: refund.amount,
      status: "refunded",
    });
  } catch (error) {
    console.error("[razorpay/refund] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
