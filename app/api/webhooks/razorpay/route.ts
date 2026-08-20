import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    if (!webhookSecret) {
      console.warn("[razorpay-webhook] No webhook secret configured — accepting in dev mode");
    } else {
      // Verify signature: HMAC-SHA256(rawBody, webhook_secret)
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const bodyData = encoder.encode(rawBody);

      const crypto = globalThis.crypto ?? (await import("node:crypto")).webcrypto;
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, bodyData);
      const expectedSig = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (expectedSig !== signature) {
        console.error("[razorpay-webhook] Signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
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
