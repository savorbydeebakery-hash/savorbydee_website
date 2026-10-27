import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffUser } from "@/lib/push/staff-session";

interface Body {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  label?: string;
  endpoint?: string;
}

const isPushEndpoint = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * POST /api/push/subscribe: this device wants order alerts.
 * Upserted by endpoint, so a phone handed to another staff member moves to
 * them rather than alerting both.
 */
export async function POST(request: NextRequest) {
  const user = await getStaffUser();
  if (!user) return NextResponse.json({ error: "Staff only" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const sub = body.subscription;
  if (!isPushEndpoint(sub?.endpoint) || !sub?.keys?.p256dh || !sub.keys.auth) {
    return NextResponse.json({ error: "Not a push subscription" }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        device_label: (body.label ?? "").slice(0, 120) || null,
        failures: 0,
      },
      { onConflict: "endpoint" }
    );
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe: stop alerts on this device. */
export async function DELETE(request: NextRequest) {
  const user = await getStaffUser();
  if (!user) return NextResponse.json({ error: "Staff only" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Body;
  if (!isPushEndpoint(body.endpoint)) return NextResponse.json({ error: "No endpoint" }, { status: 400 });
  await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
