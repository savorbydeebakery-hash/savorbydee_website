import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * T6.1: Razorpay create-order API (Edge function, test mode).
 * Creates a Razorpay order for a given SAVOR order.
 *
 * POST /api/razorpay/create-order
 * Body: { orderId: string (SAVOR order UUID) }
 * Returns: { razorpayOrderId, amount, currency, keyId }
 *
 * Uses Razorpay REST API with Basic Auth (key_id:key_secret).
 * Test mode keys start with rzp_test_.
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = (await request.json()) as { orderId: string };

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch the SAVOR order
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, human_id, total_cents, payment_status, status")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Order is cancelled" }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys not configured" },
        { status: 500 }
      );
    }

    // Create Razorpay order via REST API
    const auth = btoa(`${keyId}:${keySecret}`);
    const razorpayResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: order.total_cents, // Razorpay expects paise
          currency: "INR",
          receipt: order.human_id,
          notes: {
            savor_order_id: order.id,
            savor_human_id: order.human_id,
          },
        }),
      }
    );

    if (!razorpayResponse.ok) {
      const errData = await razorpayResponse.json();
      console.error("[razorpay/create-order] API error:", errData);
      return NextResponse.json(
        { error: "Failed to create Razorpay order", details: errData },
        { status: 502 }
      );
    }

    const razorpayOrder = (await razorpayResponse.json()) as {
      id: string;
      amount: number;
      currency: string;
    };

    // Save razorpay_order_id to the SAVOR order
    await supabase
      .from("orders")
      .update({
        razorpay_order_id: razorpayOrder.id,
        payment_status: "pending",
        payment_method: "razorpay",
      })
      .eq("id", order.id);

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId,
      savorHumanId: order.human_id,
    });
  } catch (error) {
    console.error("[razorpay/create-order] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
