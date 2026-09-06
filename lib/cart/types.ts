/**
 * Cart type definitions for SAVOR Bakery.
 */

export interface CategoryOverrides {
  notice_hours?: number | null;
  bulk_threshold?: number | null;
}

/** Flattens the object-or-array embed into the one row it always is. */
export function categoryOverrides(
  value: CategoryOverrides | CategoryOverrides[] | null | undefined
): CategoryOverrides | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export interface CartItemSelection {
  size?: string;
  variant?: string;
  addons?: string[];
  decoration?: string;
  weight?: string;
}

export interface CartItem {
  id: string; // unique cart line ID (not menu item ID)
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  selections: CartItemSelection;
  lineTotalCents: number;
  image_url?: string;
  requiresCustomNotice?: boolean;
  /**
   * Which menu this line came from. Daily bakes and preorder items carry
   * different notice windows and cannot share an order, so the cart has to
   * know without re-reading the catalogue.
   */
  dailyMenu?: boolean;
  /** Item override, else category override. NULL/undefined means inherit. */
  noticeHours?: number | null;
  bulkThreshold?: number | null;
}

export interface Cart {
  items: CartItem[];
  totalCents: number;
  totalItems: number;
}

export interface PriceOption {
  label: string;
  price?: number; // in cents (weight_tiers price_options)
  price_delta?: number; // in cents (variants/decoration_tiers/size_options)
  /**
   * Some rows were seeded with `name` where the rest of the schema uses
   * `label`. See optionLabel below; migration 00035 normalises them.
   */
  name?: string;
}

/**
 * The text on an option, whichever key it was stored under.
 *
 * The `variants` column was seeded with `{name, price_delta}` while every
 * reader looks for `label` — so Pannacotta Cup's six flavours, and the choices
 * on three other items, rendered as blank buttons, and the selection could
 * never be matched back for pricing. Migration 00035 renames the key in place;
 * this keeps a straggler, or a cart saved in someone's browser before it ran,
 * from rendering as nothing.
 */
export function optionLabel(option: PriceOption | Addon | null | undefined): string {
  if (!option) return "";
  const withLabel = option as PriceOption;
  return withLabel.label ?? option.name ?? "";
}

export interface Addon {
  name: string;
  price: number; // in cents
  is_active?: boolean;
}

export interface MenuItemForCart {
  id: string;
  name: string;
  description?: string;
  base_price_cents: number;
  price_model: "flat" | "weight_tiers" | "base_half_kg";
  price_options: PriceOption[];
  addons: Addon[];
  variants: PriceOption[];
  decoration_tiers: PriceOption[];
  size_options: PriceOption[];
  min_order_qty: number;
  /** Units available. null = not tracked (no counter shown), 0 = out of stock. */
  stock_count?: number | null;
  /** Per-item overrides. Null means fall through to the category, then the site. */
  notice_hours?: number | null;
  bulk_threshold?: number | null;
  /**
   * Joined from the item's category, for the middle step of that fallthrough.
   *
   * Typed as object OR array: PostgREST returns a single object for a
   * many-to-one embed, but the generated types infer an array. Rather than
   * cast the difference away, both shapes are accepted and normalised by
   * categoryOverrides() below.
   */
  categories?: CategoryOverrides | CategoryOverrides[] | null;
  is_sold_out: boolean;
  requires_custom_notice: boolean;
  image_url?: string;
  category_id: string;
  dietary_tags?: string[];
  daily_menu: boolean;
  is_special?: boolean;
  is_chefs_choice?: boolean;
  is_bestseller?: boolean;
}
