import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAckWatchdog } from "@/lib/email/send";
import { formatIstSlot } from "@/lib/time/ist";

/**
 * T4.3: 30s ack watchdog — Cloudflare Cron Trigger.
 * Runs every minute (cron: every 1 minute). Checks for orders that:
 *   1. Were created > 30 seconds ago
 *   2. Have NOT been acknowledged (acknowledged_at IS NULL)
 *   3. Have NOT already had a watchdog email sent (staff_email_sent_at check)
 *
 * For each unacknowledged order, sends a fallback email to staff.
 * Also cleans up processed_webhooks entries older than 30 days.
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
  const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000).toISOString();

  try {
    // Find unacknowledged orders older than 30s
    // that haven't had a watchdog email sent yet
    const { data: unackedOrders, error } = await supabase
      .from("orders")
      .select("*")
      .is("acknowledged_at", null)
      .lt("created_at", thirtySecondsAgo)
      .is("staff_email_sent_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[cron/ack-watchdog] Query error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    if (unackedOrders && unackedOrders.length > 0) {
      for (const order of unackedOrders) {
        try {
          const minutesUnacknowledged = Math.floor(
            (now.getTime() - new Date(order.created_at).getTime()) / 60000
          );

          await sendAckWatchdog({
            humanId: order.human_id,
            customerName: order.guest_name ?? "Unknown",
            customerPhone: order.guest_phone ?? "Unknown",
            total: `₹${(order.total_cents / 100).toFixed(0)}`,
            requestedSlot: `${formatIstSlot(order.requested_slot)} IST`,
            minutesUnacknowledged: Math.max(1, minutesUnacknowledged),
            adminUrl: "/admin/orders",
          });

          // Mark email as sent so we don't spam
          await supabase
            .from("orders")
            .update({ staff_email_sent_at: now.toISOString() })
            .eq("id", order.id);

          emailsSent++;
        } catch (emailError) {
          console.error(
            `[cron/ack-watchdog] Email failed for ${order.human_id}:`,
            emailError
          );
          emailsFailed++;
        }
      }
    }

    // Cleanup: delete processed_webhooks older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("processed_webhooks")
      .delete()
      .lt("processed_at", thirtyDaysAgo);

    return NextResponse.json({
      ok: true,
      checked: unackedOrders?.length ?? 0,
      emailsSent,
      emailsFailed,
      cleanup: "processed_webhooks >30d deleted",
    });
  } catch (error) {
    console.error("[cron/ack-watchdog] Unexpected error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
