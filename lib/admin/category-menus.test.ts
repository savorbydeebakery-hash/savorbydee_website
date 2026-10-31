import { describe, it, expect } from "vitest";
import { categoryContents, inView } from "./category-menus";

const items = [
  { id: "1", name: "Lamingtons", category_id: "desserts", daily_menu: true },
  { id: "2", name: "Cheesecake", category_id: "desserts", daily_menu: false },
  { id: "3", name: "Brownie", category_id: "desserts", daily_menu: true },
  { id: "4", name: "Shortbread", category_id: "cookies", daily_menu: true },
  { id: "5", name: "Tea Cake", category_id: "tea", daily_menu: false },
  { id: "6", name: "Orphan", category_id: null, daily_menu: true },
  { id: "7", name: "Gone", category_id: "deleted-category", daily_menu: false },
];

describe("categoryContents", () => {
  const c = categoryContents(["desserts", "cookies", "tea", "empty"], items);

  it("says which menu each category is on", () => {
    expect(c.desserts.menu).toBe("both");
    expect(c.cookies.menu).toBe("daily");
    expect(c.tea.menu).toBe("preorder");
    expect(c.empty.menu).toBe("empty");
  });

  it("lists each menu's items by name", () => {
    expect(c.desserts.daily.map((i) => i.name)).toEqual(["Brownie", "Lamingtons"]);
    expect(c.desserts.preorder.map((i) => i.name)).toEqual(["Cheesecake"]);
  });

  it("ignores items with no category or a deleted one", () => {
    expect(Object.keys(c)).toEqual(["desserts", "cookies", "tea", "empty"]);
  });
});

describe("inView", () => {
  const c = categoryContents(["desserts", "cookies", "tea", "empty"], items);
  it("filters by tab; empty categories only under All", () => {
    expect(["desserts", "cookies", "tea", "empty"].filter((id) => inView(c[id], "daily"))).toEqual(["desserts", "cookies"]);
    expect(["desserts", "cookies", "tea", "empty"].filter((id) => inView(c[id], "preorder"))).toEqual(["desserts", "tea"]);
    expect(["desserts", "cookies", "tea", "empty"].filter((id) => inView(c[id], "all"))).toHaveLength(4);
  });
});
