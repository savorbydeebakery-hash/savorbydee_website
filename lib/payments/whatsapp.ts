import { formatPrice } from "@/lib/cart/math";

/**
 * WhatsApp links for payment proof.
 *
 * wa.me needs the number as digits with the country code and nothing else —
 * "+91 98...", "098..." and "98..." all fail or open the wrong chat. Settings
 * have been typed by hand, so this accepts any of those shapes and returns
 * one, or null when there is nothing usable (the caller then hides the button
 * rather than render a dead link).
 */
export function waNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function waLink(number: string, text?: string): string {
  return text ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/${number}`;
}

/**
 * The message the customer sends with their screenshot. Pre-filled so staff
 * always get the order number, even from a customer who would otherwise send
 * a bare picture — the order number is what they search the admin for.
 *
 * WhatsApp cannot attach a file through a link, so the message itself asks
 * for the screenshot; a customer who forgets is reminded by the text they are
 * about to send.
 */
export function paymentProofMessage({
  humanId,
  amountCents,
  name,
  reference,
}: {
  humanId: string;
  amountCents: number;
  name?: string | null;
  reference?: string | null;
}): string {
  const lines = [
    `Hi Savor by Dee! I've paid for order ${humanId}.`,
    `Amount: ${formatPrice(amountCents)}`,
  ];
  if (name?.trim()) lines.push(`Name: ${name.trim()}`);
  if (reference?.trim()) lines.push(`UPI transaction ID: ${reference.trim()}`);
  lines.push("", "My payment screenshot is attached.");
  return lines.join("\n");
}

/** For orders that cannot be paid on the page — overdue, or no UPI ID set. */
export function orderQuestionMessage(humanId: string): string {
  return `Hi Savor by Dee! I have a question about payment for order ${humanId}.`;
}
