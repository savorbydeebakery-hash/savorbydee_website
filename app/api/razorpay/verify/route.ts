import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * T6.2 (part 2): Razorpay payment verification endpoint.
 * Verifies the payment signature returned by checkout.js.
 *
 * POST /api/razorpay/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, savor_order_id }
 */
export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      savor_order_id,
    } = (await request.json()) as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      savor_order_id: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !savor_order_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    // Verify signature: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySecret);
    const bodyData = encoder.encode(body);

    const crypto = globalThis.crypto ?? (await import("node:crypto")).webcrypto;
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, bodyData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      console.error("[razorpay/verify] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Signature verified — update order
    const supabase = createAdminClient();
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        razorpay_payment_id,
        razorpay_signature,
        status: "paid",
      })
      .eq("id", savor_order_id);

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (error) {
    console.error("[razorpay/verify] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
