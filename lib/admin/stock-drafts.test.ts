import { describe, it, expect } from "vitest";
import { parseStockInput, planStockSave } from "./stock-drafts";

describe("parseStockInput", () => {
  it("reads whole numbers", () => {
    expect(parseStockInput("12")).toBe(12);
    expect(parseStockInput(" 0 ")).toBe(0);
  });

  it("is null for a blank box", () => {
    expect(parseStockInput("")).toBeNull();
    expect(parseStockInput("   ")).toBeNull();
    expect(parseStockInput(undefined)).toBeNull();
  });

  it("refuses anything that is not a count", () => {
    // You cannot bake half a bun, or minus three.
    for (const bad of ["-3", "2.5", "12a", "twelve", "1e3"]) {
      expect(Number.isNaN(parseStockInput(bad)), bad).toBe(true);
    }
  });
});

describe("planStockSave", () => {
  const items = [
    { id: "a", name: "Chocochunks", stock_count: 8 },
    { id: "b", name: "Cashew Cookies", stock_count: 8 },
    { id: "c", name: "Korean Buns", stock_count: 12 },
  ];

  it("sends only the counts that changed", () => {
    expect(planStockSave(items, { a: "20", b: "8", c: "12" })).toEqual({
      lines: [{ id: "a", stock: 20 }],
      invalid: [],
    });
  });

  it("leaves a cleared box alone rather than untracking the item", () => {
    // NULL stock means unlimited on the storefront. A stray backspace must not
    // let customers order something that was never baked.
    expect(planStockSave(items, { a: "", b: "   " })).toEqual({ lines: [], invalid: [] });
  });

  it("can set an item to zero, which is sold out and not blank", () => {
    expect(planStockSave(items, { c: "0" }).lines).toEqual([{ id: "c", stock: 0 }]);
  });

  it("names every item with an unusable number and sends none of those", () => {
    expect(planStockSave(items, { a: "-1", b: "ten", c: "15" })).toEqual({
      lines: [{ id: "c", stock: 15 }],
      invalid: ["Chocochunks", "Cashew Cookies"],
    });
  });

  it("gives a first count to an item that was untracked", () => {
    const untracked = [{ id: "u", name: "New Bake", stock_count: null }];
    expect(planStockSave(untracked, { u: "6" }).lines).toEqual([{ id: "u", stock: 6 }]);
  });

  it("does nothing when nothing was typed", () => {
    expect(planStockSave(items, {})).toEqual({ lines: [], invalid: [] });
  });
});
