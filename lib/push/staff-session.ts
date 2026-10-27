import { createClient } from "@/lib/supabase/server";

/** The signed-in user, if they are staff or admin; otherwise null. */
export async function getStaffUser(): Promise<{ id: string; role: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role;
  return role === "staff" || role === "admin" ? { id: user.id, role } : null;
}
