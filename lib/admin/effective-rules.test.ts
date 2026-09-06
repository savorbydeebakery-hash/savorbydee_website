import { describe, it, expect } from "vitest";
import { resolveNotice, resolveBulk } from "./effective-rules";

const base = {
  dailyMenu: false,
  globalNoticeHours: 2,
  preorderNoticeHours: 24,
  customCakeNoticeDays: 5,
};

describe("resolveNotice", () => {
  it("falls back to the menu default when nothing is set", () => {
    expect(resolveNotice({ ...base, dailyMenu: true })).toMatchObject({ value: 2, source: "menu" });
    expect(resolveNotice({ ...base, dailyMenu: false })).toMatchObject({
      value: 24,
      source: "menu",
    });
  });

  it("names the menu it took the default from", () => {
    expect(resolveNotice({ ...base, dailyMenu: true }).explanation).toBe(
      "2 hours — the default for today's menu"
    );
    expect(resolveNotice({ ...base }).explanation).toBe(
      "24 hours — the default for the preorder menu"
    );
  });

  it("prefers the category over the menu default", () => {
    const r = resolveNotice({ ...base, categoryHours: 48, categoryName: "Cheesecakes" });
    expect(r).toMatchObject({ value: 48, source: "category" });
    expect(r.explanation).toBe("48 hours — inherited from Cheesecakes");
  });

  it("prefers the item over the category", () => {
    expect(
      resolveNotice({ ...base, itemHours: 6, categoryHours: 48, categoryName: "Cheesecakes" })
    ).toMatchObject({ value: 6, source: "item" });
  });

  it("treats a set 0 as a real value, not as inherit", () => {
    // This is the whole reason the columns are nullable. `?? ` not `||`.
    expect(resolveNotice({ ...base, itemHours: 0 })).toMatchObject({ value: 0, source: "item" });
    expect(resolveNotice({ ...base, categoryHours: 0 })).toMatchObject({
      value: 0,
      source: "category",
    });
  });

  it("says '1 hour', not '1 hours'", () => {
    expect(resolveNotice({ ...base, itemHours: 1 }).explanation).toBe(
      "1 hour — set on this item"
    );
  });

  it("lets a custom cake's window override a shorter one", () => {
    const r = resolveNotice({ ...base, itemHours: 6, requiresCustomNotice: true });
    expect(r).toMatchObject({ value: 120, source: "custom" });
    expect(r.explanation).toContain("up to 5 days");
  });

  it("leaves a longer explicit notice alone on a custom cake", () => {
    // Largest wins, so a two-week item is not pulled down to five days.
    expect(
      resolveNotice({ ...base, itemHours: 336, requiresCustomNotice: true })
    ).toMatchObject({ value: 336, source: "item" });
  });

  it("falls back to a generic phrase when the category has no name", () => {
    expect(resolveNotice({ ...base, categoryHours: 12, categoryName: "  " }).explanation).toBe(
      "12 hours — inherited from its category"
    );
  });
});

describe("resolveBulk", () => {
  it("falls back to the site default", () => {
    const r = resolveBulk({ siteThreshold: 12 });
    expect(r).toMatchObject({ value: 12, source: "site" });
    expect(r.explanation).toBe("more than 12 — the site default");
  });

  it("prefers the category, then the item", () => {
    expect(
      resolveBulk({ siteThreshold: 12, categoryThreshold: 6, categoryName: "Cupcakes" })
    ).toMatchObject({ value: 6, source: "category" });
    expect(
      resolveBulk({ siteThreshold: 12, categoryThreshold: 6, itemThreshold: 24 })
    ).toMatchObject({ value: 24, source: "item" });
  });
});
