import { describe, it, expect } from "vitest";
import {
  toOptionDrafts,
  fromOptionDrafts,
  toAddonDrafts,
  fromAddonDrafts,
  toMultiplierDrafts,
  fromMultiplierDrafts,
} from "./option-rows";
import { paiseToRupeeInput } from "./money";

describe("price option rows", () => {
  it("round-trips the live decoration tiers unchanged", () => {
    // Exactly what migration 00034 wrote for the sponge cakes.
    const stored = [
      { label: "Basic", price_delta: 0 },
      { label: "Custom", price_delta: 0 },
    ];
    const drafts = toOptionDrafts(stored, "price_delta", paiseToRupeeInput);
    expect(drafts).toEqual([
      { label: "Basic", amount: "0" },
      { label: "Custom", amount: "0" },
    ]);
    expect(fromOptionDrafts(drafts, "price_delta")).toEqual(stored);
  });

  it("round-trips weight tiers, which carry a price and not a delta", () => {
    const stored = [
      { label: "1 kg", price: 180000 },
      { label: "2 kg", price: 360000 },
    ];
    const drafts = toOptionDrafts(stored, "price", paiseToRupeeInput);
    expect(drafts.map((d) => d.amount)).toEqual(["1800", "3600"]);
    expect(fromOptionDrafts(drafts, "price")).toEqual(stored);
  });

  it("drops a row with no label", () => {
    // The storefront matches a selection by label, so a blank one is an option
    // nobody can pick. Clicking "Add row" and changing your mind should not
    // leave one behind.
    const rows = [
      { label: "Basic", amount: "0" },
      { label: "   ", amount: "150" },
      { label: "", amount: "" },
    ];
    expect(fromOptionDrafts(rows, "price_delta")).toEqual([{ label: "Basic", price_delta: 0 }]);
  });

  it("trims the label, so 'Basic ' and 'Basic' are not two options", () => {
    expect(fromOptionDrafts([{ label: "  Basic  ", amount: "0" }], "price_delta")).toEqual([
      { label: "Basic", price_delta: 0 },
    ]);
  });

  it("treats a blank amount as zero, which is a real value here", () => {
    // For a delta, zero means "no change"; for a price it means free. Both are
    // deliberate, unlike a blank notice-hours box which means inherit.
    expect(fromOptionDrafts([{ label: "Basic", amount: "" }], "price_delta")).toEqual([
      { label: "Basic", price_delta: 0 },
    ]);
  });

  it("reads a variant seeded under 'name' rather than losing it", () => {
    // Pannacotta Cup's six flavours are stored as {name, price_delta}. Reading
    // o.label directly gave a blank row, and a blank row is dropped on save —
    // so opening the item and pressing Save would have deleted its flavours.
    const stored = [
      { name: "Vanilla", price_delta: 0 },
      { name: "Blueberry", price_delta: 0 },
    ] as unknown as Parameters<typeof toOptionDrafts>[0];
    const drafts = toOptionDrafts(stored, "price_delta", paiseToRupeeInput);
    expect(drafts.map((d) => d.label)).toEqual(["Vanilla", "Blueberry"]);
    // Saved back under the key everything else uses.
    expect(fromOptionDrafts(drafts, "price_delta")).toEqual([
      { label: "Vanilla", price_delta: 0 },
      { label: "Blueberry", price_delta: 0 },
    ]);
  });

  it("is an empty list, never null, when there is nothing", () => {
    expect(toOptionDrafts(null, "price", paiseToRupeeInput)).toEqual([]);
    expect(toOptionDrafts(undefined, "price", paiseToRupeeInput)).toEqual([]);
    expect(fromOptionDrafts([], "price")).toEqual([]);
  });
});

describe("addon rows", () => {
  it("round-trips name, price and the active flag", () => {
    const stored = [{ name: "Candles", price: 5000, is_active: true }];
    const drafts = toAddonDrafts(stored, paiseToRupeeInput);
    expect(drafts).toEqual([{ label: "Candles", amount: "50", isActive: true }]);
    expect(fromAddonDrafts(drafts)).toEqual(stored);
  });

  it("reads a missing is_active as on, matching the storefront", () => {
    // Older rows were written without the key. calculateUnitPrice treats
    // anything but an explicit false as active, so the form must agree.
    const drafts = toAddonDrafts([{ name: "Candles", price: 5000 }], paiseToRupeeInput);
    expect(drafts[0].isActive).toBe(true);
    expect(fromAddonDrafts(drafts)[0].is_active).toBe(true);
  });

  it("keeps an add-on switched off", () => {
    const drafts = toAddonDrafts(
      [{ name: "Candles", price: 5000, is_active: false }],
      paiseToRupeeInput
    );
    expect(drafts[0].isActive).toBe(false);
    expect(fromAddonDrafts(drafts)[0].is_active).toBe(false);
  });
});

describe("weight multiplier rows", () => {
  it("round-trips the sponge cake ladder", () => {
    const stored = [
      { label: "½ kg", multiplier: 1 },
      { label: "1 kg", multiplier: 2 },
      { label: "2 kg", multiplier: 4 },
    ];
    const drafts = toMultiplierDrafts(stored);
    expect(drafts.map((d) => d.multiplier)).toEqual(["1", "2", "4"]);
    expect(fromMultiplierDrafts(drafts)).toEqual(stored);
  });

  it("drops a multiplier of zero or less, which would price a cake at nothing", () => {
    const rows = [
      { label: "1 kg", multiplier: "2" },
      { label: "Free kg", multiplier: "0" },
      { label: "Refund kg", multiplier: "-1" },
      { label: "Typo kg", multiplier: "abc" },
    ];
    expect(fromMultiplierDrafts(rows)).toEqual([{ label: "1 kg", multiplier: 2 }]);
  });

  it("gives back null, not an empty array, when the client clears it", () => {
    // readMultipliers treats null as "this category prices each weight
    // explicitly". An empty array reads the same but records something else.
    expect(fromMultiplierDrafts([])).toBeNull();
    expect(fromMultiplierDrafts([{ label: "", multiplier: "2" }])).toBeNull();
  });

  it("survives a column that is null or the wrong shape", () => {
    expect(toMultiplierDrafts(null)).toEqual([]);
    expect(toMultiplierDrafts("not json")).toEqual([]);
    expect(toMultiplierDrafts([1, 2, 3])).toEqual([]);
  });

  it("accepts a fractional multiplier", () => {
    expect(fromMultiplierDrafts([{ label: "¼ kg", multiplier: "0.5" }])).toEqual([
      { label: "¼ kg", multiplier: 0.5 },
    ]);
  });
});
