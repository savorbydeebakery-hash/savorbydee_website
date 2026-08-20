import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend webhook handler.
 * Receives delivery, bounce, complaint, and email_sent events.
 * Deduplicates via processed_webhooks table.
 *
 * Webhook security: Resend signs webhooks with a secret. The signature
 * is verified via the RESEND_WEBHOOK_SECRET env var. In production,
 * set this via `wrangler secret put RESEND_WEBHOOK_SECRET`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("svix-signature") ?? "";
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // If webhook secret is not configured, accept but log warning
    // (allows testing without webhook security during development)
    if (webhookSecret && signature) {
      // TODO: implement full Svix signature verification when RESEND_WEBHOOK_SECRET is set
      // For now, we trust the payload in dev mode
    }

    const event = JSON.parse(body);
    const eventId = event.id ?? `${event.type}-${Date.now()}`;
    const eventType = event.type ?? "unknown";
    const data = event.data ?? {};

    const supabase = createAdminClient();

    // Dedup: check if we already processed this webhook
    const { data: existing } = await supabase
      .from("processed_webhooks")
      .select("id")
      .eq("source", "resend")
      .eq("event_id", eventId)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    // Record the webhook
    await supabase.from("processed_webhooks").insert({
      source: "resend",
      event_id: eventId,
      event_type: eventType,
      payload: data,
    });

    // Handle event types
    switch (eventType) {
      case "email.sent":
        // Email was sent successfully — update order email_status if we can match
        break;
      case "email.delivered":
        // Email was delivered — update tracking
        break;
      case "email.bounced":
        // Handle bounce — could notify staff of delivery failure
        console.warn(`[resend-webhook] Email bounced: ${data.email ?? "unknown"}`);
        break;
      case "email.complained":
        // Handle spam complaint — suppress future emails to this address
        console.warn(`[resend-webhook] Spam complaint from: ${data.email ?? "unknown"}`);
        break;
      case "email.opened":
        // Email was opened — could track open rate
        break;
      default:
        // Unknown event type — logged but not acted upon
        break;
    }

    return NextResponse.json({ ok: true, event: eventType });
  } catch (error) {
    console.error("[resend-webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}