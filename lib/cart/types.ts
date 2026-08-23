/**
 * Cart type definitions for SAVOR Bakery.
 */

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
  is_sold_out: boolean;
  requires_custom_notice: boolean;
  image_url?: string;
  category_id: string;
  dietary_tags?: string[];
}
