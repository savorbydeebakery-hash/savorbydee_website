import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/push/send";
import { E2E_FIXTURE_NAMES } from "@/lib/orders/ack-reminder";
import { getOpenState } from "@/lib/shop/open-state";
import { readOverrides } from "@/lib/shop/hours-override";
import type { WeeklyHours } from "@/lib/cart/validation";
import {
  STAFF_ALERTS_CHANNEL,
  CUSTOM_CAKE_EVENT,
  type CustomCakeAlertPayload,
} from "@/lib/alarm/staff-alerts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A request older than this no longer rings the alarm. */
const FRESH_MS = 10 * 60_000;

/**
 * POST /api/custom-cake/notify  { id }
 *
 * Called by the custom cake form right after it saves a request, to sound the
 * new-request alarm on the admin Orders page (where staff keep the panel
 * open). Custom cake requests are admin-only, so staff are told only that one
 * arrived and pass it on to the owner.
 *
 * The id has to name a request saved in the last few minutes, so this cannot
 * be used to ring the alarm at will. The broadcast carries no customer
 * details — see lib/alarm/staff-alerts.ts.
 */
export async function POST(request: NextRequest) {
  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    // fall through to the 400
  }
  if (typeof id !== "string" || !UUID.test(id)) {
    return NextResponse.json({ error: "A request id is required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { data: inquiry } = await createAdminClient()
    .from("custom_cake_inquiries")
    .select("created_at, customer_name")
    .eq("id", id)
    .maybeSingle();
  if (!inquiry) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (Date.now() - Date.parse(inquiry.created_at) > FRESH_MS) {
    return NextResponse.json({ error: "Request is too old to announce" }, { status: 409 });
  }
  // The E2E spec's enquiry: every deploy files one, and it must not buzz
  // staff phones. scripts/purge-e2e-rows.mjs removes the row afterwards.
  if (E2E_FIXTURE_NAMES.includes(inquiry.customer_name)) {
    return NextResponse.json({ ok: true, skipped: "test" }, { status: 202 });
  }
  // Not at 2 am: while closed the request waits, and the opening alert
  // (app/api/cron/ack-watchdog) counts it in when the shop opens.
  const { data: s } = await createAdminClient()
    .from("site_settings")
    .select("weekly_hours, holidays, hours_overrides")
    .eq("id", 1)
    .maybeSingle();
  const open = getOpenState(
    (s?.weekly_hours as WeeklyHours | null) ?? null,
    (s?.holidays as string[] | null) ?? [],
    undefined,
    new Date(),
    readOverrides(s?.hours_overrides)
  );
  if (!open.isOpen) {
    return NextResponse.json({ ok: true, skipped: "closed" }, { status: 202 });
  }

  // Staff phones first, including locked ones (lib/push), so a broadcast
  // failure below can't skip it. Same rule: no customer details.
  await notifyStaff({
    kind: "custom_cake",
    title: "🎂 New custom cake request",
    body: "A customer has asked for a custom cake. Please tell the owner.",
  });

  const payload: CustomCakeAlertPayload = { at: inquiry.created_at };
  try {
    // Realtime's HTTP broadcast endpoint: no socket needed on a Worker.
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: STAFF_ALERTS_CHANNEL, event: CUSTOM_CAKE_EVENT, payload }],
      }),
    });
    if (!res.ok) {
      console.error("[api/custom-cake/notify] broadcast failed:", res.status);
      return NextResponse.json({ error: "Could not alert staff" }, { status: 502 });
    }
  } catch (e) {
    console.error("[api/custom-cake/notify] broadcast threw:", e);
    return NextResponse.json({ error: "Could not alert staff" }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
