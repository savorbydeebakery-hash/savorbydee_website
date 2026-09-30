import { formatPrice } from "@/lib/cart/math";
import { describeSelections } from "@/lib/orders/line-summary";
import { formatIstSlot } from "@/lib/time/ist";

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

/** Everything about an order that is worth putting in a message. */
export interface MessageOrder {
  human_id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  fulfillment?: string | null;
  requested_slot?: string | null;
  delivery_address?: string | null;
  delivery_landmark?: string | null;
  notes?: string | null;
  order_items?: {
    name: string;
    quantity: number;
    line_total_cents: number;
    selections?: unknown;
  }[];
}

/**
 * The whole order, as WhatsApp text (*bold* is WhatsApp's own markup).
 *
 * The client asked for everything, not just the order number: the message is
 * what she reads on her phone, often away from the admin panel, and it should
 * be enough on its own to check the payment against the order and start
 * planning the bake. Fields the order does not have are left out rather than
 * printed empty.
 */
export function orderSummaryLines(
  order: MessageOrder,
  amountCents: number,
  { freeDeliveryOverCents = null }: { freeDeliveryOverCents?: number | null } = {}
): string[] {
  const lines = [`*Order:* ${order.human_id}`, `*Total:* ${formatPrice(amountCents)}`];

  const items = order.order_items ?? [];
  if (items.length > 0) {
    lines.push("", "*Items*");
    for (const item of items) {
      const options = describeSelections(item.selections);
      lines.push(
        `• ${item.quantity}× ${item.name}${options ? ` (${options})` : ""} — ${formatPrice(item.line_total_cents)}`
      );
    }
  }

  lines.push("");
  if (order.guest_name?.trim()) lines.push(`*Name:* ${order.guest_name.trim()}`);
  if (order.guest_phone?.trim()) lines.push(`*Phone:* ${order.guest_phone.trim()}`);

  const isDelivery = order.fulfillment === "delivery";
  const when = order.requested_slot ? `${formatIstSlot(order.requested_slot)} IST` : null;
  lines.push(`*${isDelivery ? "Delivery" : "Pickup"}:* ${when ?? "time not set"}`);

  if (isDelivery) {
    if (order.delivery_address?.trim()) {
      const landmark = order.delivery_landmark?.trim();
      lines.push(`*Address:* ${order.delivery_address.trim()}${landmark ? ` (near ${landmark})` : ""}`);
    }
    // Same rule as the checkout and the Shipping policy: free over the
    // threshold, otherwise quoted by staff and paid in cash.
    const free = freeDeliveryOverCents != null && amountCents >= freeDeliveryOverCents;
    lines.push(
      `*Delivery charge:* ${free ? "Free" : "to be confirmed — paid in cash on arrival"}`
    );
  }

  if (order.notes?.trim()) lines.push(`*Notes:* ${order.notes.trim()}`);
  return lines;
}

/**
 * The message the customer sends with their screenshot. Pre-filled so staff
 * always get the full order, even from a customer who would otherwise send a
 * bare picture.
 *
 * WhatsApp cannot attach a file through a link, so the message itself asks
 * for the screenshot; a customer who forgets is reminded by the text they are
 * about to send.
 */
export function paymentProofMessage({
  order,
  amountCents,
  reference,
  freeDeliveryOverCents = null,
}: {
  order: MessageOrder;
  amountCents: number;
  reference?: string | null;
  freeDeliveryOverCents?: number | null;
}): string {
  const lines = [
    "Hi Savor by Dee! I've paid for my order.",
    "",
    ...orderSummaryLines(order, amountCents, { freeDeliveryOverCents }),
  ];
  if (reference?.trim()) lines.push(`*UPI transaction ID:* ${reference.trim()}`);
  lines.push("", "My payment screenshot is attached.");
  return lines.join("\n");
}

/** For orders that cannot be paid on the page — overdue, or no UPI ID set. */
export function orderQuestionMessage(
  order: MessageOrder,
  amountCents: number,
  { freeDeliveryOverCents = null }: { freeDeliveryOverCents?: number | null } = {}
): string {
  return [
    "Hi Savor by Dee! I have a question about paying for my order.",
    "",
    ...orderSummaryLines(order, amountCents, { freeDeliveryOverCents }),
  ].join("\n");
}
