/**
 * Remove the orders and enquiries the E2E suite just created.
 *
 * Run after the daily suite. Three specs place a real order and one files a
 * real enquiry — that is what makes them worth running — but on a daily
 * schedule they would otherwise pile up in the bakery's own order board for
 * ever.
 *
 * Signs in as the admin the suite already uses rather than carrying the
 * service-role key. That key can read and write every customer's details, and
 * putting it in a repository secret to delete a handful of test rows would be
 * far more authority than the job needs. The narrow rule lives in SQL instead:
 * see supabase/migrations/00038_purge_e2e_rows.sql, which will only touch rows
 * that are named as fixtures, unpaid, and less than two days old.
 *
 * Never fails the build. A run that tested fine but could not tidy up is a
 * housekeeping problem, not a broken site, and turning the suite red for it
 * would teach everyone to ignore a red suite.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

const missing = [
  ["NEXT_PUBLIC_SUPABASE_URL", url],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
  ["ADMIN_EMAIL", email],
  ["ADMIN_PASSWORD", password],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.log(`Skipping cleanup — not configured: ${missing.join(", ")}`);
  process.exit(0);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) {
  console.log(`Skipping cleanup — could not sign in: ${signInError.message}`);
  process.exit(0);
}

const { data, error } = await supabase.rpc("purge_e2e_rows");

if (error) {
  // A missing function means the migration has not been applied to this
  // environment yet, which is worth saying plainly rather than as a stack.
  console.log(`Cleanup did not run: ${error.message}`);
  process.exit(0);
}

const orders = data?.orders ?? 0;
const inquiries = data?.inquiries ?? 0;
console.log(`Cleanup removed ${orders} order(s) and ${inquiries} enquiry(ies).`);

await supabase.auth.signOut();
