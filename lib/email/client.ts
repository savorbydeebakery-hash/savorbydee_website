import { Resend } from "resend";

/**
 * Server-only Resend client.
 * Requires RESEND_API_KEY env var (set via `wrangler secret put` in prod,
 * or .dev.vars locally).
 */
export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

export const EMAIL_FROM = "SAVOR Bakery <orders@savorbakery.in>";
export const STAFF_NOTIFY_EMAIL = process.env.STAFF_NOTIFY_EMAIL ?? "";