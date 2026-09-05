import type { MenuItemForCart } from "@/lib/cart/types";

/**
 * Cake weights derived from the half-kilo price.
 *
 * The client's rule is that a kilo is twice the half and two kilos twice the
 * kilo. Holding that as multipliers on the category, rather than as prices on
 * each cake, means the relationship survives a price edit: changing a cake to
 * ₹950 makes its kilo ₹1900 on its own. The previous arrangement stored
 * deltas per item, and those had drifted badly — +₹100 for double the cake.
 *
 * Cheesecakes deliberately carry no multipliers. Their weights are prices the
 * client set individually and do not all double (Chocolate & Raspberry is
 * ₹1000 / ₹1900), so deriving them would replace a real number with an
 * arithmetic one.
 */
export interface WeightMultiplier {
  label: string;
  multiplier: number;
}

/** Reads the category embed, which PostgREST returns as an object or array. */
export function readMultipliers(value: unknown): WeightMultiplier[] | null {
  const row = Array.isArray(value) ? value[0] : value;
  const raw = (row as { weight_multipliers?: unknown } | null | undefined)?.weight_multipliers;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const parsed = raw.filter(
    (m): m is WeightMultiplier =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as WeightMultiplier).label === "string" &&
      typeof (m as WeightMultiplier).multiplier === "number" &&
      (m as WeightMultiplier).multiplier > 0
  );
  return parsed.length > 0 ? parsed : null;
}

/**
 * Give an item its derived weight options, if its category defines any.
 *
 * Skipped in three cases, each deliberate:
 *
 *   - Daily-menu items. Blueberry Cake 500 Gms and the bento cakes sit in the
 *     same category but are baked at a fixed size; offering "2 kg" of a 250 g
 *     bento would be nonsense.
 *   - Items that already carry explicit price_options. A real price the client
 *     typed always beats a computed one.
 *   - Categories with no multipliers, which is every category but one.
 */
export function withDerivedWeights<T extends MenuItemForCart>(item: T): T {
  if (item.daily_menu) return item;
  if (Array.isArray(item.price_options) && item.price_options.length > 0) return item;

  const multipliers = readMultipliers(item.categories);
  if (!multipliers) return item;

  return {
    ...item,
    price_model: "weight_tiers",
    price_options: multipliers.map((m) => ({
      label: m.label,
      // Rounded to whole rupees. A fractional paise price would render as
      // ₹1799.995 and be impossible to take in cash.
      price: Math.round((item.base_price_cents * m.multiplier) / 100) * 100,
    })),
  };
}

/** Convenience for a whole query result. */
export function applyDerivedWeights<T extends MenuItemForCart>(items: T[] | null | undefined): T[] {
  return (items ?? []).map(withDerivedWeights);
}
