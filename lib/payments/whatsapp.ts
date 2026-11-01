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

/** What the owner needs from a custom cake request to write back about it. */
export interface CakeRequest {
  customer_name: string;
  flavor?: string | null;
  weight?: string | null;
  decoration?: string | null;
  message_on_cake?: string | null;
  requested_date?: string | null;
  quote_cents?: number | null;
}

/**
 * The owner's reply to a custom cake request, as WhatsApp text.
 *
 * Saving a quote in Admin → Custom Cakes reaches nobody: the site sends no
 * email and customers have no page for their request (client question,
 * 2026-11-01: "I replied but it didn't go to her"). The admin opens this in
 * WhatsApp instead, already filled in, and the conversation carries on there.
 * With a quote it asks them to confirm; without one it opens the chat for
 * questions.
 */
export function cakeRequestReply(r: CakeRequest, formatDate: (d: string) => string): string {
  const first = r.customer_name.trim().split(/\s+/)[0] || "there";
  const details = [
    r.flavor?.trim() && `• Flavour: ${r.flavor.trim()}`,
    r.weight?.trim() && `• Size: ${r.weight.trim()}`,
    r.decoration?.trim() && `• Design: ${r.decoration.trim()}`,
    r.message_on_cake?.trim() && `• Message: "${r.message_on_cake.trim()}"`,
    r.requested_date && `• For: ${formatDate(r.requested_date)}`,
  ].filter(Boolean) as string[];
  const lines = [`Hi ${first}! This is Savor by Dee, about your custom cake request 🎂`];
  if (details.length) lines.push("", ...details);
  lines.push("");
  if (r.quote_cents != null) {
    lines.push(
      `We can make this for *${formatPrice(r.quote_cents)}*.`,
      "Would you like to go ahead? Reply here to confirm and we'll send the payment details."
    );
  } else {
    lines.push("Thank you for your request! Just a few questions before we quote:");
  }
  return lines.join("\n");
}

/**
 * A new custom cake request, as the customer's WhatsApp message to the shop.
 *
 * The form saves the request and alerts the admin as before; the customer
 * then sends this too, so it reaches Dee's phone in full and the conversation
 * starts in WhatsApp, the way an order's payment message does (client,
 * 2026-11-01). The reference photo is private on the site, so they are asked
 * to attach it here.
 */
export function cakeRequestMessage(
  r: CakeRequest & { customer_phone?: string | null; description?: string | null; has_photo?: boolean },
  formatDate: (d: string) => string
): string {
  const lines = ["Hi Savor by Dee! I've sent a custom cake request on your website 🎂", ""];
  const add = (label: string, value?: string | null) => {
    if (value?.trim()) lines.push(`*${label}:* ${value.trim()}`);
  };
  add("Name", r.customer_name);
  add("Phone", r.customer_phone);
  add("Flavour", r.flavor);
  add("Size", r.weight);
  add("Design", r.decoration);
  add("Message on cake", r.message_on_cake && `"${r.message_on_cake.trim()}"`);
  add("For", r.requested_date && formatDate(r.requested_date));
  add("Details", r.description);
  if (r.has_photo) lines.push("", "I'll attach my reference photo here.");
  return lines.join("\n");
}
