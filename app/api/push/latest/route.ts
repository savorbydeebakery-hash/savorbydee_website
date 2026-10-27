import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffUser } from "@/lib/push/staff-session";

/**
 * GET /api/push/latest: what the push that just arrived was about.
 *
 * Called by the service worker (public/staff-sw.js) when a push wakes it,
 * with the staff member's own sign-in. Pushes carry no data, so this is where
 * the notification's words come from. 204 when there is nothing recent; the
 * worker then shows a generic "open Orders" notification.
 */
export async function GET() {
  const user = await getStaffUser();
  if (!user) return new NextResponse(null, { status: 204 });

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await createAdminClient()
    .from("staff_alerts")
    .select("id, kind, title, body, url, for_user")
    .gte("created_at", since)
    .or(`for_user.is.null,for_user.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(1);
  const alert = data?.[0];
  if (!alert) return new NextResponse(null, { status: 204 });
  return NextResponse.json(
    { id: alert.id, kind: alert.kind, title: alert.title, body: alert.body, url: alert.url },
    { headers: { "Cache-Control": "no-store" } }
  );
}
