/**
 * What a customer chose on an order line, as a sentence staff can bake from.
 *
 * order_items.selections is stored as the cart's JSON — `{weight, size,
 * variant, decoration, addons}` — which is exact but unreadable on a busy
 * morning. "1 kg · Basic decoration · Candles" is what the kitchen needs.
 *
 * Defensive about shape because the column is jsonb written by every version
 * of the checkout that has ever shipped: older rows may be missing keys, have
 * an empty addons array, or hold something that is not an object at all.
 */
export interface LineSelections {
  weight?: string | null;
  size?: string | null;
  variant?: string | null;
  decoration?: string | null;
  addons?: unknown;
}

export function describeSelections(raw: unknown): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const s = raw as LineSelections;
  const parts: string[] = [];

  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  if (text(s.weight)) parts.push(text(s.weight));
  if (text(s.size)) parts.push(text(s.size));
  if (text(s.variant)) parts.push(text(s.variant));
  // "Basic decoration" rather than a bare "Basic", which means nothing on its
  // own in a list of weights and flavours.
  if (text(s.decoration)) parts.push(`${text(s.decoration)} decoration`);

  if (Array.isArray(s.addons)) {
    for (const addon of s.addons) {
      if (text(addon)) parts.push(text(addon));
    }
  }

  return parts.join(" · ");
}
