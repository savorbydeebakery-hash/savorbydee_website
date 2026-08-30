import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hmacSha256Hex, timingSafeEqualHex } from "@/lib/crypto/timing-safe";

/**
 * T6.3: Razorpay webhook handler.
 * Receives payment.captured, payment.failed, refund.processed events.
 * Verifies signature, deduplicates via processed_webhooks table.
 *
 * POST /api/webhooks/razorpay
 * Headers: X-Razorpay-Signature
 * Body: raw JSON (must verify against raw body)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // FAIL CLOSED. This used to skip verification entirely when the secret was
    // missing, logging "accepting in dev mode" and carrying on. That is a hole,
    // not a convenience: the handler below flips an order to payment_status
    // 'paid' on payment.captured, so an unsigned request with a known
    // razorpay_order_id marks an unpaid order as paid. A missing secret in
    // production is a deployment fault, and the only safe response to it is to
    // reject every webhook until it is set.
    if (!webhookSecret) {
      console.error(
        "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set — rejecting. " +
          "Set it with `wrangler secret put RAZORPAY_WEBHOOK_SECRET`."
      );
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // HMAC-SHA256 over the RAW body — re-serialising parsed JSON would change
    // key order and whitespace and never match.
    const expectedSig = await hmacSha256Hex(webhookSecret, rawBody);

    // Constant-time: `!==` short-circuits on the first wrong character, which
    // leaks how much of a guessed signature was correct.
    if (!timingSafeEqualHex(expectedSig, signature)) {
      console.error("[razorpay-webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id ?? `${event.event}-${Date.now()}`;
    const eventType = event.event ?? "unknown";
    const payload = event.payload ?? {};

    const supabase = createAdminClient();

    // Dedup check
    const { data: existing } = await supabase
      .from("processed_webhooks")
      .select("id")
      .eq("source", "razorpay")
      .eq("event_id", eventId)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    // Record webhook
    await supabase.from("processed_webhooks").insert({
      source: "razorpay",
      event_id: eventId,
      event_type: eventType,
      payload,
    });

    // Extract order info from payload
    const paymentEntity = payload.payment?.entity ?? {};
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    // Find SAVOR order by razorpay_order_id
    if (razorpayOrderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, human_id, payment_status, status")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (order) {
        switch (eventType) {
          case "payment.captured":
            await supabase
              .from("orders")
              .update({
                payment_status: "paid",
                razorpay_payment_id: razorpayPaymentId,
                status: order.status === "pending" ? "paid" : order.status,
              })
              .eq("id", order.id);
            break;

          case "payment.failed":
            await supabase
              .from("orders")
              .update({ payment_status: "failed" })
              .eq("id", order.id);
            break;

          case "refund.processed":
            await supabase
              .from("orders")
              .update({
                payment_status: "refunded",
                status: "cancelled",
              })
              .eq("id", order.id);
            break;

          default:
            // Unknown event — logged but not acted upon
            break;
        }
      }
    }

    return NextResponse.json({ ok: true, event: eventType });
  } catch (error) {
    console.error("[razorpay-webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
