/**
 * UPI transaction IDs as typed by a customer or copied from a banking app.
 *
 * The standard UTR is 12 digits, but apps label and format it differently —
 * PhonePe shows a longer alphanumeric "Transaction ID", some apps group the
 * digits with spaces, and people paste with a trailing full stop. Normalised
 * to upper-case letters and digits so the same transaction always produces
 * the same string: the database refuses a second verified order with the
 * same reference (migration 00045), and that only works if "1234 5678 9012"
 * and "123456789012" are recognised as one.
 *
 * Returns null for anything that cannot be a transaction ID, which callers
 * treat as "not given" rather than an error — the field is optional for the
 * customer.
 */
export function normalizePaymentReference(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-.:/#]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,35}$/.test(cleaned)) return null;
  return cleaned;
}
