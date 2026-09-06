import { describe, it, expect } from "vitest";
import { repriceCart, postedTotalIsShort } from "./server-pricing";
import type { CartItem, MenuItemForCart } from "./types";

const item = (over: Partial<MenuItemForCart> = {}): MenuItemForCart =>
  ({
    id: "cake-1",
    name: "Vanilla Mascarpone",
    base_price_cents: 90000,
    price_model: "flat",
    price_options: [],
    addons: [],
    variants: [],
    decoration_tiers: [],
    size_options: [],
    min_order_qty: 1,
    daily_menu: false,
    ...over,
  }) as MenuItemForCart;

const line = (over: Partial<CartItem> = {}): CartItem =>
  ({
    id: "line-1",
    menuItemId: "cake-1",
    name: "Vanilla Mascarpone",
    unitPriceCents: 90000,
    quantity: 1,
    selections: {},
    lineTotalCents: 90000,
    ...over,
  }) as CartItem;

describe("repriceCart", () => {
  it("ignores the price the browser sent and uses the catalogue", () => {
    // The whole point. A ₹900 cake posted as ₹1.
    const result = repriceCart(
      [line({ unitPriceCents: 100, lineTotalCents: 100 })],
      [item()]
    );
    expect(result.errors).toEqual([]);
    expect(result.lines[0].unitPriceCents).toBe(90000);
    expect(result.totalCents).toBe(90000);
  });

  it("takes the name from the catalogue too", () => {
    // order_items.name came from the body, so an order could carry a product
    // that does not exist.
    const result = repriceCart([line({ name: "Free Cake" })], [item()]);
    expect(result.lines[0].name).toBe("Vanilla Mascarpone");
  });

  it("multiplies by quantity", () => {
    const result = repriceCart([line({ quantity: 3 })], [item()]);
    expect(result.lines[0].lineTotalCents).toBe(270000);
    expect(result.totalCents).toBe(270000);
  });

  it("refuses a line whose item is not on the menu", () => {
    // Dropping it silently would accept an order for a product that does not
    // exist and quietly bill for whatever else was in the basket.
    const result = repriceCart([line({ menuItemId: "ghost" })], [item()]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("no longer on the menu");
    expect(result.lines).toEqual([]);
  });

  it("refuses a line with no menu item id at all", () => {
    const result = repriceCart([line({ menuItemId: "" })], [item()]);
    expect(result.errors).toHaveLength(1);
  });

  it("prices a derived weight tier, not the half-kilo base", () => {
    // Sponge cake weights come from the category's multipliers and are not
    // stored on the item. Without applyDerivedWeights the "2 kg" selection
    // matches no tier and the server itself would charge ₹900 for ₹3,600 of
    // cake — the bug would have survived the fix.
    const sponge = item({
      categories: {
        weight_multipliers: [
          { label: "½ kg", multiplier: 1 },
          { label: "1 kg", multiplier: 2 },
          { label: "2 kg", multiplier: 4 },
        ],
      },
    } as Partial<MenuItemForCart>);

    const result = repriceCart(
      [line({ selections: { weight: "2 kg" }, unitPriceCents: 90000 })],
      [sponge]
    );
    expect(result.errors).toEqual([]);
    expect(result.lines[0].unitPriceCents).toBe(360000);
  });

  it("adds decoration, variant and add-on prices", () => {
    const decorated = item({
      decoration_tiers: [{ label: "Gold leaf", price_delta: 25000 }],
      addons: [{ name: "Candles", price: 5000, is_active: true }],
    });
    const result = repriceCart(
      [line({ selections: { decoration: "Gold leaf", addons: ["Candles"] } })],
      [decorated]
    );
    expect(result.lines[0].unitPriceCents).toBe(120000);
  });

  it("ignores a selection that does not exist on the item", () => {
    // A posted selection is untrusted text. An unknown decoration must not
    // subtract anything or throw; it simply does not apply.
    const result = repriceCart(
      [line({ selections: { decoration: "Free of charge please" } })],
      [item()]
    );
    expect(result.lines[0].unitPriceCents).toBe(90000);
  });

  it("enforces the minimum order quantity", () => {
    const sixes = item({ name: "Mini Cupcakes", min_order_qty: 6 });
    const result = repriceCart([line({ quantity: 2 })], [sixes]);
    expect(result.errors[0]).toContain("sold in 6s");
    expect(result.lines).toEqual([]);
  });

  it("refuses a nonsense quantity rather than pricing it", () => {
    for (const quantity of [0, -5, 1.5, Number.NaN]) {
      const result = repriceCart([line({ quantity })], [item()]);
      // 1.5 floors to 1 and is allowed; the rest are refused.
      if (quantity === 1.5) {
        expect(result.lines[0].quantity).toBe(1);
      } else {
        expect(result.errors.length, `quantity ${quantity}`).toBe(1);
      }
    }
  });

  it("sums several lines", () => {
    const second = item({ id: "cake-2", name: "Funfetti", base_price_cents: 81000 });
    const result = repriceCart(
      [line(), line({ id: "line-2", menuItemId: "cake-2", quantity: 2 })],
      [item(), second]
    );
    expect(result.totalCents).toBe(90000 + 81000 * 2);
  });

  it("is zero and empty for an empty cart", () => {
    expect(repriceCart([], [item()])).toEqual({ lines: [], totalCents: 0, errors: [] });
  });
});

describe("postedTotalIsShort", () => {
  it("catches a total lower than the truth", () => {
    expect(postedTotalIsShort(100, 90000)).toBe(true);
  });

  it("allows a total that is too high, so a price cut never blocks a sale", () => {
    // The server's cheaper figure is used instead. Refusing here would be a
    // checkout outage dressed up as a safety check.
    expect(postedTotalIsShort(120000, 90000)).toBe(false);
  });

  it("absorbs rounding within a rupee", () => {
    expect(postedTotalIsShort(89950, 90000)).toBe(false);
    expect(postedTotalIsShort(89899, 90000)).toBe(true);
  });

  it("does not fire when the browser sent no total", () => {
    // The server's figure is authoritative either way; a missing total is not
    // itself a reason to refuse.
    expect(postedTotalIsShort(null, 90000)).toBe(false);
    expect(postedTotalIsShort(undefined, 90000)).toBe(false);
    expect(postedTotalIsShort(Number.NaN, 90000)).toBe(false);
  });
});
