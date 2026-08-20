/**
 * One-time seed script: creates admin + staff accounts and assigns roles.
 *
 * Usage (requires .dev.vars with SEED_* values):
 *   npx tsx scripts/seed-admin.ts
 *
 * Uses the service-role key to create users and set profile roles.
 */
import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const staffEmail = process.env.SEED_STAFF_EMAIL;
  const staffPassword = process.env.SEED_STAFF_PASSWORD;

  if (!adminEmail || !adminPassword || !staffEmail || !staffPassword) {
    console.error(
      "Missing SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_STAFF_EMAIL / SEED_STAFF_PASSWORD in .dev.vars"
    );
    process.exit(1);
  }

  // Create admin
  const { data: admin, error: adminErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: "SAVOR Admin" },
  });
  if (adminErr && !adminErr.message.includes("already registered")) {
    console.error("Admin create error:", adminErr.message);
    process.exit(1);
  }
  const adminId = admin?.user?.id;
  if (adminId) {
    await supabase
      .from("profiles")
      .update({ role: "admin", full_name: "SAVOR Admin" })
      .eq("id", adminId);
    console.log(`✅ Admin ready: ${adminEmail}`);
  }

  // Create staff
  const { data: staff, error: staffErr } = await supabase.auth.admin.createUser({
    email: staffEmail,
    password: staffPassword,
    email_confirm: true,
    user_metadata: { full_name: "SAVOR Staff" },
  });
  if (staffErr && !staffErr.message.includes("already registered")) {
    console.error("Staff create error:", staffErr.message);
    process.exit(1);
  }
  const staffId = staff?.user?.id;
  if (staffId) {
    await supabase
      .from("profiles")
      .update({ role: "staff", full_name: "SAVOR Staff" })
      .eq("id", staffId);
    console.log(`✅ Staff ready: ${staffEmail}`);
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});