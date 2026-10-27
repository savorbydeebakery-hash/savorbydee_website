import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAckWatchdog } from "@/lib/email/send";
import { notifyStaff } from "@/lib/push/send";
import { formatIstSlot } from "@/lib/time/ist";
import {
  needsAckReminder,
  ACK_REMINDER_AFTER_MS,
  ACK_REMINDER_MAX_AGE_MS,
} from "@/lib/orders/ack-reminder";

/**
 * Unacknowledged-order reminder. Called once a minute by the Worker's cron
 * handler (cloudflare-worker.mjs).
 *
 * Emails staff once about an order that is still pending and unacknowledged
 * five minutes after it was placed — the rule is in lib/orders/ack-reminder.ts.
 *
 * History (2026-10-24): this never ran, because the built worker had no cron
 * handler. And had it run, it would have found nothing: it only looked at
 * orders with no staff_email_sent_at, which the order API stamps on every
 * order the moment the new-order email goes.
 *
 * Also clears processed_webhooks older than 30 days, once an hour.
 *
 * Security: protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedSecret = request.headers.get("x-cron-secret");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  try {
    // Narrowed in SQL to the window the rule can match; the rule itself
    // (including "not already reminded") is applied below.
    const { data: candidates, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .is("acknowledged_at", null)
      .lte("created_at", new Date(now.getTime() - ACK_REMINDER_AFTER_MS).toISOString())
      .gte("created_at", new Date(now.getTime() - ACK_REMINDER_MAX_AGE_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[cron/ack-watchdog] Query error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const unackedOrders = (candidates ?? []).filter((o) => needsAckReminder(o, now.getTime()));
    let emailsSent = 0;
    let emailsFailed = 0;

    if (unackedOrders && unackedOrders.length > 0) {
      for (const order of unackedOrders) {
        const minutesUnacknowledged = Math.floor(
          (now.getTime() - new Date(order.created_at).getTime()) / 60000
        );

        // Push and email are tried independently, and the order is stamped
        // either way: one reminder attempt per order. Stamping only on a sent
        // email (which has never been deliverable) would have pushed every
        // minute for an hour.
        await notifyStaff({
          kind: "reminder",
          title: `⏰ ${order.human_id} still not acknowledged`,
          body: `${order.guest_name ?? "A customer"} ordered ${Math.max(1, minutesUnacknowledged)} min ago. Open Orders and press Acknowledge.`,
        });

        try {
          await sendAckWatchdog({
            humanId: order.human_id,
            customerName: order.guest_name ?? "Unknown",
            customerPhone: order.guest_phone ?? "Unknown",
            total: `₹${(order.total_cents / 100).toFixed(0)}`,
            requestedSlot: `${formatIstSlot(order.requested_slot)} IST`,
            minutesUnacknowledged: Math.max(1, minutesUnacknowledged),
            adminUrl: "/admin/orders",
          });

          emailsSent++;
        } catch (emailError) {
          console.error(
            `[cron/ack-watchdog] Email failed for ${order.human_id}:`,
            emailError
          );
          emailsFailed++;
        }

        // Re-stamped so the next run sees the reminder went (see the rule).
        await supabase
          .from("orders")
          .update({ staff_email_sent_at: now.toISOString() })
          .eq("id", order.id);
      }
    }

    // Cleanup: delete processed_webhooks older than 30 days. Hourly is
    // plenty, and keeps the every-minute run to one query when idle.
    if (now.getUTCMinutes() === 0) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("processed_webhooks")
        .delete()
        .lt("processed_at", thirtyDaysAgo);
    }

    return NextResponse.json({
      ok: true,
      checked: candidates?.length ?? 0,
      reminded: unackedOrders.length,
      emailsSent,
      emailsFailed,
    });
  } catch (error) {
    console.error("[cron/ack-watchdog] Unexpected error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
