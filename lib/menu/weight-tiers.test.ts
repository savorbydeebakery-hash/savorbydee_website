import { describe, it, expect } from "vitest";
import { withDerivedWeights, readMultipliers } from "./weight-tiers";
import type { MenuItemForCart } from "@/lib/cart/types";

const SPONGE = [
  { label: "½ kg", multiplier: 1 },
  { label: "1 kg", multiplier: 2 },
  { label: "2 kg", multiplier: 4 },
];

const cake = (o: Partial<MenuItemForCart> = {}): MenuItemForCart =>
  ({
    id: "c1",
    name: "Vanilla Mascarpone",
    base_price_cents: 90000,
    price_model: "flat",
    price_options: [],
    addons: [],
    variants: [],
    decoration_tiers: [],
    size_options: [],
    min_order_qty: 1,
    is_sold_out: false,
    requires_custom_notice: false,
    category_id: "cat",
    daily_menu: false,
    categories: { weight_multipliers: SPONGE },
    ...o,
  }) as unknown as MenuItemForCart;

describe("withDerivedWeights", () => {
  it("doubles the half-kilo price for each step up", () => {
    const out = withDerivedWeights(cake());
    expect(out.price_model).toBe("weight_tiers");
    expect(out.price_options).toEqual([
      { label: "½ kg", price: 90000 },
      { label: "1 kg", price: 180000 },
      { label: "2 kg", price: 360000 },
    ]);
  });

  it("tracks a price change instead of going stale", () => {
    // The whole point of multipliers over stored prices.
    const out = withDerivedWeights(cake({ base_price_cents: 95000 }));
    expect(out.price_options.map((o) => o.price)).toEqual([95000, 190000, 380000]);
  });

  it("leaves daily-menu items alone", () => {
    // Blueberry Cake 500 Gms is in the same category but baked at a fixed
    // size — "2 kg" of a 250 g bento is nonsense.
    const out = withDerivedWeights(cake({ daily_menu: true, name: "Chocolate Bento 250 Gms" }));
    expect(out.price_model).toBe("flat");
    expect(out.price_options).toEqual([]);
  });

  it("never overwrites prices the client typed", () => {
    // Cheesecakes do not all double: Chocolate & Raspberry is 1000/1900.
    const explicit = [
      { label: "½ kg", price: 100000 },
      { label: "1 kg", price: 190000 },
    ];
    const out = withDerivedWeights(cake({ price_options: explicit, price_model: "weight_tiers" }));
    expect(out.price_options).toEqual(explicit);
  });

  it("does nothing for a category with no multipliers", () => {
    const out = withDerivedWeights(cake({ categories: null }));
    expect(out.price_model).toBe("flat");
  });

  it("rounds to whole rupees", () => {
    // An odd base must not produce a fractional-paise price.
    const out = withDerivedWeights(cake({ base_price_cents: 33333 }));
    for (const o of out.price_options) expect((o.price ?? 0) % 100).toBe(0);
  });
});

describe("readMultipliers", () => {
  it("accepts the object and array shapes PostgREST returns", () => {
    expect(readMultipliers({ weight_multipliers: SPONGE })).toHaveLength(3);
    expect(readMultipliers([{ weight_multipliers: SPONGE }])).toHaveLength(3);
  });

  it("is null for anything unusable", () => {
    expect(readMultipliers(null)).toBeNull();
    expect(readMultipliers({})).toBeNull();
    expect(readMultipliers({ weight_multipliers: [] })).toBeNull();
    expect(readMultipliers({ weight_multipliers: "nope" })).toBeNull();
  });

  it("drops malformed entries rather than trusting them", () => {
    const mixed = [{ label: "1 kg", multiplier: 2 }, { label: "bad" }, { multiplier: 0 }];
    expect(readMultipliers({ weight_multipliers: mixed })).toEqual([
      { label: "1 kg", multiplier: 2 },
    ]);
  });
});
