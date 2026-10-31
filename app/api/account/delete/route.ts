import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/account/delete
 *
 * A signed-in customer deletes their own account (client request,
 * 2026-10-31; promised in the Privacy policy, "Your rights").
 *
 * Deleting the auth user cascades to their profile (name, phone, email,
 * saved address). Orders keep their own guest name and phone as the record
 * of a sale; their customer_id link is set to null by the foreign key, so
 * they simply stop belonging to an account.
 *
 * Staff and admin accounts are refused here: losing the owner's sign-in to a
 * mis-tap would lock her out of her own shop. Those are removed in Admin.
 *
 * The user is taken from the session cookie, never from the request body, so
 * nobody can delete someone else's account.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  // Fail safe: if we can't tell whether this is the owner's account, don't
  // delete it.
  if (profileError) {
    console.error("[api/account/delete] role lookup failed:", profileError.message);
    return NextResponse.json(
      { error: "We couldn't delete your account just now. Please try again, or message us and we'll do it for you." },
      { status: 503 }
    );
  }
  if (profile?.role === "admin" || profile?.role === "staff") {
    return NextResponse.json(
      { error: "Staff and owner accounts can't be deleted from here. Ask the owner to remove it in Admin → Accounts." },
      { status: 403 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[api/account/delete] delete failed:", error.message);
    return NextResponse.json(
      { error: "We couldn't delete your account just now. Please try again, or message us and we'll do it for you." },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
