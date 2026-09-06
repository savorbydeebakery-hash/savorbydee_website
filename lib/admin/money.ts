/**
 * Rupees at the keyboard, paise in the database.
 *
 * Every price column on this site is stored in paise, and the admin form used
 * to put that unit in front of the client: a box labelled "Base Price (paise)"
 * holding 90000. Typing the number you mean — 900 for a nine-hundred-rupee cake
 * — priced it at ₹9. There is no warning and the storefront renders the wrong
 * price immediately.
 *
 * These convert at the edge of the form so the rest of the code keeps working
 * in paise.
 */

/** Paise to a rupee string for an input box. Whole rupees stay whole. */
export function paiseToRupeeInput(paise: number | null | undefined): string {
  if (paise == null || !Number.isFinite(paise)) return "";
  const rupees = paise / 100;
  // 90000 -> "900", not "900.00". 9050 -> "90.5".
  return Number.isInteger(rupees) ? String(rupees) : String(Number(rupees.toFixed(2)));
}

/**
 * A typed rupee amount back to paise.
 *
 * Returns null for anything unusable so the caller can leave a field alone
 * rather than writing a zero. Rounds because ₹90.555 is not a price anyone can
 * take in cash, and because floating point would otherwise store 9055.499999.
 */
export function rupeeInputToPaise(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/[₹,\s]/g, "");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
