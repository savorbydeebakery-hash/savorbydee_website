/**
 * Cart math utilities — pure functions for calculating line totals and cart totals.
 * No side effects, no React, no localStorage. Fully unit-testable.
 */
import type { CartItem, CartItemSelection, MenuItemForCart } from "./types";

/**
 * Calculate the unit price for a menu item given the user's selections.
 * Handles all price models: flat, weight_tiers, base_half_kg.
 * Adds variant price deltas, decoration price deltas, and addon prices.
 */
export function calculateUnitPrice(
  item: MenuItemForCart,
  selections: CartItemSelection
): number {
  let price = item.base_price_cents;

  // Price model handling
  if (item.price_model === "weight_tiers" && selections.weight) {
    const tier = item.price_options.find((t) => t.label === selections.weight);
    if (tier?.price != null) {
      price = tier.price; // weight tiers set absolute price, not delta
    }
  } else if (item.price_model === "base_half_kg" && selections.size) {
    const sizeOpt = item.size_options.find((s) => s.label === selections.size);
    if (sizeOpt?.price_delta) {
      price += sizeOpt.price_delta;
    }
  } else if (item.price_model === "flat" && selections.size) {
    const sizeOpt = item.size_options.find((s) => s.label === selections.size);
    if (sizeOpt?.price_delta) {
      price += sizeOpt.price_delta;
    }
  }

  // Variant price delta
  if (selections.variant) {
    const variant = item.variants.find((v) => v.label === selections.variant);
    if (variant?.price_delta) {
      price += variant.price_delta;
    }
  }

  // Decoration tier price delta
  if (selections.decoration) {
    const deco = item.decoration_tiers.find((d) => d.label === selections.decoration);
    if (deco?.price_delta) {
      price += deco.price_delta;
    }
  }

  // Addons
  if (selections.addons && selections.addons.length > 0) {
    for (const addonName of selections.addons) {
      const addon = item.addons.find((a) => a.name === addonName);
      if (addon) {
        price += addon.price;
      }
    }
  }

  return Math.max(0, price);
}

/**
 * Calculate line total = unit price × quantity.
 */
export function calculateLineTotal(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

/**
 * Calculate cart total from all items.
 */
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotalCents, 0);
}

/**
 * Count total quantity of items in cart.
 */
export function countTotalItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Format cents to display string: ₹123.00 or ₹123
 */
export function formatPrice(cents: number): string {
  const rupees = cents / 100;
  return `₹${rupees % 1 === 0 ? rupees.toFixed(0) : rupees.toFixed(2)}`;
}

/**
 * Generate a unique cart line ID.
 */
export function generateCartLineId(): string {
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Check if two cart items are identical (same menu item + same selections).
 * Used to merge items instead of adding duplicates.
 */
export function isSameCartItem(a: CartItem, b: Omit<CartItem, "id" | "lineTotalCents">): boolean {
  if (a.menuItemId !== b.menuItemId) return false;
  if (a.selections.size !== b.selections.size) return false;
  if (a.selections.variant !== b.selections.variant) return false;
  if (a.selections.decoration !== b.selections.decoration) return false;
  if (a.selections.weight !== b.selections.weight) return false;
  const aAddons = [...(a.selections.addons ?? [])].sort().join(",");
  const bAddons = [...(b.selections.addons ?? [])].sort().join(",");
  return aAddons === bAddons;
}
