import { describe, it, expect } from "vitest";
import {
  calculateUnitPrice,
  calculateLineTotal,
  calculateCartTotal,
  countTotalItems,
  formatPrice,
  isSameCartItem,
} from "./math";
import type { CartItem, MenuItemForCart } from "./types";

// --- Test fixtures ---

const flatItem: MenuItemForCart = {
  id: "item-1",
  name: "Chocolate Truffle Cake",
  base_price_cents: 80000, // ₹800
  price_model: "flat",
  price_options: [],
  addons: [
    { name: "Lotus Biscoff", price: 5000, is_active: true },
    { name: "Extra Chocolate", price: 3000, is_active: true },
  ],
  variants: [
    { label: "Classic", price_delta: 0 },
    { label: "Belgian Chocolate", price_delta: 10000 },
  ],
  decoration_tiers: [
    { label: "Basic", price_delta: 0 },
    { label: "Premium", price_delta: 5000 },
  ],
  size_options: [],
  min_order_qty: 1,
  is_sold_out: false,
  requires_custom_notice: false,
};

const weightTierItem: MenuItemForCart = {
  id: "item-2",
  name: "Red Velvet Cake",
  base_price_cents: 0,
  price_model: "weight_tiers",
  price_options: [
    { label: "½kg", price: 60000 },
    { label: "1kg", price: 110000 },
    { label: "2kg", price: 210000 },
  ],
  addons: [],
  variants: [],
  decoration_tiers: [],
  size_options: [],
  min_order_qty: 1,
  is_sold_out: false,
  requires_custom_notice: false,
};

const baseHalfKgItem: MenuItemForCart = {
  id: "item-3",
  name: "Custom Design Cake",
  base_price_cents: 90000, // ₹900 for ½kg base
  price_model: "base_half_kg",
  price_options: [],
  addons: [{ name: "Edible Photo", price: 8000, is_active: true }],
  variants: [],
  decoration_tiers: [
    { label: "Basic", price_delta: 0 },
    { label: "Premium", price_delta: 15000 },
  ],
  size_options: [
    { label: "½kg", price_delta: 0 },
    { label: "1kg", price_delta: 70000 },
    { label: "2kg", price_delta: 160000 },
  ],
  min_order_qty: 1,
  is_sold_out: false,
  requires_custom_notice: true,
};

// --- calculateUnitPrice ---

describe("calculateUnitPrice", () => {
  it("returns base price for flat item with no selections", () => {
    expect(calculateUnitPrice(flatItem, {})).toBe(80000);
  });

  it("adds variant price delta", () => {
    expect(
      calculateUnitPrice(flatItem, { variant: "Belgian Chocolate" })
    ).toBe(90000); // 80000 + 10000
  });

  it("adds decoration tier price delta", () => {
    expect(
      calculateUnitPrice(flatItem, { decoration: "Premium" })
    ).toBe(85000); // 80000 + 5000
  });

  it("adds multiple addons", () => {
    expect(
      calculateUnitPrice(flatItem, {
        addons: ["Lotus Biscoff", "Extra Chocolate"],
      })
    ).toBe(88000); // 80000 + 5000 + 3000
  });

  it("combines variant + decoration + addons", () => {
    expect(
      calculateUnitPrice(flatItem, {
        variant: "Belgian Chocolate",
        decoration: "Premium",
        addons: ["Lotus Biscoff"],
      })
    ).toBe(100000); // 80000 + 10000 + 5000 + 5000
  });

  it("uses weight tier absolute price for weight_tiers model", () => {
    expect(
      calculateUnitPrice(weightTierItem, { weight: "1kg" })
    ).toBe(110000);
  });

  it("uses ½kg tier price", () => {
    expect(
      calculateUnitPrice(weightTierItem, { weight: "½kg" })
    ).toBe(60000);
  });

  it("adds size delta for base_half_kg model", () => {
    expect(
      calculateUnitPrice(baseHalfKgItem, { size: "1kg" })
    ).toBe(160000); // 90000 + 70000
  });

  it("adds decoration + addon on top of size for base_half_kg", () => {
    expect(
      calculateUnitPrice(baseHalfKgItem, {
        size: "1kg",
        decoration: "Premium",
        addons: ["Edible Photo"],
      })
    ).toBe(183000); // 90000 + 70000 + 15000 + 8000
  });

  it("returns 0 for weight_tiers with no weight selected", () => {
    expect(calculateUnitPrice(weightTierItem, {})).toBe(0);
  });

  it("ignores inactive addons (not filtered here, but price still added if found)", () => {
    const itemWithInactive: MenuItemForCart = {
      ...flatItem,
      addons: [{ name: "Inactive Addon", price: 9999, is_active: false }],
    };
    // The math function adds any addon found by name — filtering is UI's job
    expect(
      calculateUnitPrice(itemWithInactive, { addons: ["Inactive Addon"] })
    ).toBe(89999);
  });
});

// --- calculateLineTotal ---

describe("calculateLineTotal", () => {
  it("calculates price × quantity", () => {
    expect(calculateLineTotal(80000, 2)).toBe(160000);
  });

  it("returns 0 for quantity 0", () => {
    expect(calculateLineTotal(80000, 0)).toBe(0);
  });

  it("handles quantity 1", () => {
    expect(calculateLineTotal(50000, 1)).toBe(50000);
  });
});

// --- calculateCartTotal ---

describe("calculateCartTotal", () => {
  const items: CartItem[] = [
    { id: "a", menuItemId: "1", name: "A", unitPriceCents: 50000, quantity: 2, selections: {}, lineTotalCents: 100000 },
    { id: "b", menuItemId: "2", name: "B", unitPriceCents: 30000, quantity: 1, selections: {}, lineTotalCents: 30000 },
    { id: "c", menuItemId: "3", name: "C", unitPriceCents: 10000, quantity: 3, selections: {}, lineTotalCents: 30000 },
  ];

  it("sums all line totals", () => {
    expect(calculateCartTotal(items)).toBe(160000);
  });

  it("returns 0 for empty cart", () => {
    expect(calculateCartTotal([])).toBe(0);
  });
});

// --- countTotalItems ---

describe("countTotalItems", () => {
  it("sums quantities", () => {
    const items: CartItem[] = [
      { id: "a", menuItemId: "1", name: "A", unitPriceCents: 100, quantity: 3, selections: {}, lineTotalCents: 300 },
      { id: "b", menuItemId: "2", name: "B", unitPriceCents: 100, quantity: 2, selections: {}, lineTotalCents: 200 },
    ];
    expect(countTotalItems(items)).toBe(5);
  });

  it("returns 0 for empty cart", () => {
    expect(countTotalItems([])).toBe(0);
  });
});

// --- formatPrice ---

describe("formatPrice", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatPrice(80000)).toBe("₹800");
  });

  it("formats fractional rupees with 2 decimals", () => {
    expect(formatPrice(80550)).toBe("₹805.50");
  });

  it("formats 0", () => {
    expect(formatPrice(0)).toBe("₹0");
  });
});

// --- isSameCartItem ---

describe("isSameCartItem", () => {
  const item: CartItem = {
    id: "cart-1",
    menuItemId: "item-1",
    name: "Cake",
    unitPriceCents: 80000,
    quantity: 1,
    selections: { variant: "Classic", addons: ["A", "B"] },
    lineTotalCents: 80000,
  };

  it("matches same item with same selections", () => {
    expect(
      isSameCartItem(item, {
        menuItemId: "item-1",
        name: "Cake",
        unitPriceCents: 80000,
        quantity: 2,
        selections: { variant: "Classic", addons: ["B", "A"] },
        image_url: undefined,
        requiresCustomNotice: false,
      })
    ).toBe(true);
  });

  it("does not match different menu item", () => {
    expect(
      isSameCartItem(item, {
        menuItemId: "item-2",
        name: "Cake",
        unitPriceCents: 80000,
        quantity: 1,
        selections: {},
        image_url: undefined,
        requiresCustomNotice: false,
      })
    ).toBe(false);
  });

  it("does not match different variant", () => {
    expect(
      isSameCartItem(item, {
        menuItemId: "item-1",
        name: "Cake",
        unitPriceCents: 80000,
        quantity: 1,
        selections: { variant: "Belgian", addons: ["A", "B"] },
        image_url: undefined,
        requiresCustomNotice: false,
      })
    ).toBe(false);
  });

  it("does not match different addons", () => {
    expect(
      isSameCartItem(item, {
        menuItemId: "item-1",
        name: "Cake",
        unitPriceCents: 80000,
        quantity: 1,
        selections: { variant: "Classic", addons: ["A", "C"] },
        image_url: undefined,
        requiresCustomNotice: false,
      })
    ).toBe(false);
  });
});
