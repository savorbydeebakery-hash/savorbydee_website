import { describe, it, expect } from "vitest";
import { categorySlug, resolveCategoryParam } from "./category-slug";

const cats = [
  { id: "c1", name: "Frosted Sponge Cakes" },
  { id: "c2", name: "Cupcakes, Muffins & Brownies" },
  { id: "c3", name: "Tea Cakes" },
];

describe("categorySlug", () => {
  it("turns a category name into a readable URL part", () => {
    expect(categorySlug("Frosted Sponge Cakes")).toBe("frosted-sponge-cakes");
    expect(categorySlug("Cupcakes, Muffins & Brownies")).toBe("cupcakes-muffins-and-brownies");
  });
});

describe("resolveCategoryParam", () => {
  it("finds a category by its slug", () => {
    expect(resolveCategoryParam("frosted-sponge-cakes", cats)).toBe("c1");
  });

  it("finds a category by its id", () => {
    expect(resolveCategoryParam("c3", cats)).toBe("c3");
  });

  it("ignores case and stray spaces", () => {
    expect(resolveCategoryParam("  Frosted-Sponge-Cakes ", cats)).toBe("c1");
  });

  it("falls back to the whole menu for anything unknown", () => {
    // A stale link should still show something to buy, not an empty page.
    expect(resolveCategoryParam("wedding-cakes", cats)).toBe("all");
    expect(resolveCategoryParam("", cats)).toBe("all");
    expect(resolveCategoryParam(null, cats)).toBe("all");
    expect(resolveCategoryParam(undefined, cats)).toBe("all");
  });
});
