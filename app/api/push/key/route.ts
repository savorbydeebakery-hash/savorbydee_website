import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/push/key: the public half of the push signing key (not secret). */
export async function GET() {
  const { data } = await createAdminClient()
    .from("push_config")
    .select("vapid_public_key")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Push alerts are not set up yet" }, { status: 503 });
  return NextResponse.json({ publicKey: data.vapid_public_key });
}
