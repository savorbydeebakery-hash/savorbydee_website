import { describe, it, expect } from "vitest";
import { filterMenuItems } from "./menu-filter";

const items = [
  { name: "Chocochunks 100gms", description: null, category_id: "cookies", daily_menu: true },
  { name: "Chocodip Cookies 100gms", description: null, category_id: "cookies", daily_menu: true },
  { name: "Vanilla Mascarpone", description: "A light vanilla sponge", category_id: "sponge", daily_menu: false },
  { name: "Mystery Loaf", description: null, category_id: null, daily_menu: false },
];

const all = { query: "", category: "all", menu: "all" as const };
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe("filterMenuItems", () => {
  it("returns everything with no filters", () => {
    expect(filterMenuItems(items, all)).toHaveLength(4);
  });

  it("matches a search ignoring case", () => {
    expect(names(filterMenuItems(items, { ...all, query: "CHOCOCHUNKS" }))).toEqual([
      "Chocochunks 100gms",
    ]);
  });

  it("needs every word, in any order", () => {
    expect(names(filterMenuItems(items, { ...all, query: "cookies choco" }))).toEqual([
      "Chocodip Cookies 100gms",
    ]);
  });

  it("searches the description too", () => {
    expect(names(filterMenuItems(items, { ...all, query: "sponge" }))).toEqual([
      "Vanilla Mascarpone",
    ]);
  });

  it("narrows to one menu", () => {
    expect(filterMenuItems(items, { ...all, menu: "daily" })).toHaveLength(2);
    expect(names(filterMenuItems(items, { ...all, menu: "preorder" }))).toEqual([
      "Vanilla Mascarpone",
      "Mystery Loaf",
    ]);
  });

  it("narrows to one category, or to items with none", () => {
    expect(filterMenuItems(items, { ...all, category: "cookies" })).toHaveLength(2);
    expect(names(filterMenuItems(items, { ...all, category: "none" }))).toEqual(["Mystery Loaf"]);
  });

  it("combines search, category and menu", () => {
    expect(
      names(filterMenuItems(items, { query: "choco", category: "cookies", menu: "daily" }))
    ).toEqual(["Chocochunks 100gms", "Chocodip Cookies 100gms"]);
    expect(filterMenuItems(items, { query: "choco", category: "sponge", menu: "all" })).toEqual([]);
  });

  it("treats a query of only spaces as no query", () => {
    expect(filterMenuItems(items, { ...all, query: "   " })).toHaveLength(4);
  });
});
