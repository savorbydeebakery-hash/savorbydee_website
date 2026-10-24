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

/**
 * Who emails come from. Was hard-coded to orders@savorbakery.in — a domain
 * that does not exist — so Resend refused every message and no staff email
 * (new order, custom cake, unacknowledged reminder) was ever delivered
 * (found 2026-10-24). Now a setting: once savorbydee.in is verified in Resend,
 * set EMAIL_FROM to e.g. "Savor by Dee <orders@savorbydee.in>".
 *
 * Until then the default is Resend's shared test sender, which delivers only
 * to the email address that owns the Resend account.
 */
export const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "Savor by Dee <onboarding@resend.dev>";
export const STAFF_NOTIFY_EMAIL = process.env.STAFF_NOTIFY_EMAIL ?? "";