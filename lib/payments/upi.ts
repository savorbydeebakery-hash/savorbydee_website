/**
 * UPI payment links — the `upi://pay` URI every Indian UPI app understands,
 * whether it arrives as a QR code or as a tapped link.
 *
 * The amount and the order number travel inside the link, so the customer's
 * app opens with both already filled in. That is the whole point: a static
 * shop QR asks the customer to type the amount, and a typed amount is the
 * single most likely thing to be wrong.
 *
 * Built on the SERVER from the stored order total (see order-payment.ts), not
 * from the basket in the browser, so the amount asked for is the amount the
 * order says — the same figure staff check the payment against.
 *
 * Parameters used, per NPCI's UPI linking specification:
 *   pa  payee address (the UPI ID)          required
 *   pn  payee name, shown to the customer   required by most apps
 *   am  amount in rupees, 2 decimal places  fixes the amount
 *   cu  currency, always INR
 *   tn  transaction note — lands in both parties' statements, which is how
 *       staff match a payment to an order when no screenshot arrives
 */

/**
 * user@handle. Handles are letters then letters/digits ("okaxis", "ybl",
 * "paytm", "oksbi"); the user part allows the dots, hyphens and underscores
 * banks hand out. Deliberately permissive — the point is to catch a phone
 * number or a URL pasted into the UPI ID box, not to police bank formats.
 */
const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isValidVpa(value: string | null | undefined): value is string {
  return !!value && VPA_PATTERN.test(value.trim());
}

/** "125000" paise -> "1250.00". UPI apps reject amounts without two decimals. */
export function upiAmount(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

/**
 * What appears in the customer's and the bakery's UPI history. Short, because
 * some apps truncate the note at around 50 characters.
 */
export function transactionNote(humanId: string): string {
  return `Savor ${humanId}`;
}

/**
 * Payee names go into a URI and are shown on screen by the app. Anything
 * outside plain letters, digits, spaces and a little punctuation is dropped:
 * several apps refuse a link whose pn contains an emoji or an ampersand.
 */
export function cleanPayeeName(name: string): string {
  return name.replace(/[^A-Za-z0-9 .'-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50);
}

export function buildUpiUri({
  vpa,
  payeeName,
  amountCents,
  note,
}: {
  vpa: string;
  payeeName: string;
  amountCents: number;
  note: string;
}): string {
  // Built by hand rather than with URLSearchParams: that encodes spaces as
  // "+", which some UPI apps show literally ("Savor+by+Dee").
  const params: [string, string][] = [
    ["pa", vpa.trim()],
    ["pn", cleanPayeeName(payeeName) || "Savor by Dee"],
    ["am", upiAmount(amountCents)],
    ["cu", "INR"],
    ["tn", note],
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
