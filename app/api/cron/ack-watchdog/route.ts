import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAckWatchdog } from "@/lib/email/send";
import { notifyStaff } from "@/lib/push/send";
import { dayWindow, readOverrides } from "@/lib/shop/hours-override";
import { stockReminderDue } from "@/lib/shop/stock-reminder";
import {
  openingAlertDue,
  openingAlertText,
  OPENING_ALERT_LOOKBACK_HOURS,
} from "@/lib/shop/opening-alert";
import { IST_OFFSET, istDateKey, istMinutesOfDay } from "@/lib/time/ist";
import type { WeeklyHours } from "@/lib/cart/validation";
import { formatIstSlot } from "@/lib/time/ist";
import {
  needsAckReminder,
  ACK_REMINDER_AFTER_MS,
  ACK_REMINDER_MAX_AGE_MS,
  E2E_FIXTURE_NAMES,
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

    // Today's real opening hours: for staying quiet while closed, and for the
    // stock and opening alerts further down.
    const todayKey = istDateKey(now);
    const nowMinutes = istMinutesOfDay(now);
    const { data: s } = await supabase
      .from("site_settings")
      .select("weekly_hours, holidays, hours_overrides")
      .eq("id", 1)
      .maybeSingle();
    const window = dayWindow(
      todayKey,
      (s?.weekly_hours as WeeklyHours | null) ?? null,
      new Set((s?.holidays as string[] | null) ?? []),
      readOverrides(s?.hours_overrides)
    );
    // undefined = no hours configured, treated as open (as everywhere else).
    const openNow = window === undefined || (!!window && nowMinutes >= window.open && nowMinutes < window.close);

    // No reminders while closed: a preorder placed at 2 am (migration 00054)
    // must not buzz phones at 2:05. The opening alert below covers it.
    const unackedOrders = openNow
      ? (candidates ?? []).filter((o) => needsAckReminder(o, now.getTime()))
      : [];
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

    // --- Morning stock reminder (migration 00052, lib/shop/stock-reminder) ---
    // Separate try: a problem here must not stop the order reminders above.
    let stockReminded = false;
    try {
      // Only look further inside the window when it could be due.
      if (window && nowMinutes >= window.open + 30 && nowMinutes < window.close) {
        const dayStart = new Date(`${todayKey}T00:00:00${IST_OFFSET}`).toISOString();
        const [{ data: checks, error: checksError }, { data: sent }] = await Promise.all([
          supabase.from("stock_checks").select("id").gte("saved_at", dayStart).limit(1),
          supabase.from("staff_alerts").select("id").eq("kind", "stock").gte("created_at", dayStart).limit(1),
        ]);
        if (
          !checksError &&
          stockReminderDue({
            window,
            nowMinutes,
            setToday: (checks?.length ?? 0) > 0,
            remindedToday: (sent?.length ?? 0) > 0,
          })
        ) {
          await notifyStaff({
            kind: "stock",
            title: "📋 Today's Stock isn't set yet",
            body: "Set today's counts so the website can't oversell. Tap to open Today's Stock.",
            url: "/admin/stock",
          });
          stockReminded = true;
        }
      }
    } catch (e) {
      console.error("[cron/ack-watchdog] stock reminder failed:", e);
    }

    // --- Opening alert (lib/shop/opening-alert) ---
    // One push for everything that came in while closed. Separate try, as above.
    let openingAlerted = false;
    try {
      if (window && nowMinutes >= window.open && nowMinutes < window.close) {
        const dayStart = new Date(`${todayKey}T00:00:00${IST_OFFSET}`).toISOString();
        const openedAt = new Date(new Date(dayStart).getTime() + window.open * 60_000);
        const since = new Date(openedAt.getTime() - OPENING_ALERT_LOOKBACK_HOURS * 3_600_000).toISOString();
        const [{ data: sent }, { data: waitingOrders }, { data: waitingRequests }] = await Promise.all([
          supabase.from("staff_alerts").select("id").eq("kind", "opening").gte("created_at", dayStart).limit(1),
          supabase
            .from("orders")
            .select("guest_name")
            .eq("status", "pending")
            .is("acknowledged_at", null)
            .gte("created_at", since)
            .lt("created_at", openedAt.toISOString()),
          supabase
            .from("custom_cake_inquiries")
            .select("customer_name")
            .eq("status", "submitted")
            .gte("created_at", since)
            .lt("created_at", openedAt.toISOString()),
        ]);
        const real = <T extends Record<string, unknown>>(rows: T[] | null, key: keyof T) =>
          (rows ?? []).filter((r) => !E2E_FIXTURE_NAMES.includes(String(r[key] ?? ""))).length;
        const orders = real(waitingOrders, "guest_name");
        const requests = real(waitingRequests, "customer_name");
        if (openingAlertDue({ window, nowMinutes, sentToday: (sent?.length ?? 0) > 0, waiting: orders + requests })) {
          await notifyStaff({ kind: "opening", ...openingAlertText(orders, requests), url: "/admin/orders" });
          openingAlerted = true;
        }
      }
    } catch (e) {
      console.error("[cron/ack-watchdog] opening alert failed:", e);
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
      stockReminded,
      openingAlerted,
      emailsSent,
      emailsFailed,
    });
  } catch (error) {
    console.error("[cron/ack-watchdog] Unexpected error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
