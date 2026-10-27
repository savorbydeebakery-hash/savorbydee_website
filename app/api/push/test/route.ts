import { NextResponse } from "next/server";
import { notifyStaff } from "@/lib/push/send";
import { getStaffUser } from "@/lib/push/staff-session";

/** POST /api/push/test: send a test alert to the caller's own devices only. */
export async function POST() {
  const user = await getStaffUser();
  if (!user) return NextResponse.json({ error: "Staff only" }, { status: 401 });
  const result = await notifyStaff({
    kind: "test",
    title: "🔔 Test alert",
    body: "Order alerts are working on this device.",
    forUser: user.id,
  });
  return NextResponse.json(result);
}
