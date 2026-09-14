import { describe, it, expect } from "vitest";
import { describeSelections } from "./line-summary";

describe("describeSelections", () => {
  it("reads a sponge cake line the way the kitchen would say it", () => {
    expect(
      describeSelections({ weight: "1 kg", decoration: "Basic", addons: ["Candles"] })
    ).toBe("1 kg · Basic decoration · Candles");
  });

  it("includes size and flavour when present", () => {
    expect(describeSelections({ size: "6 inch", variant: "Coffee" })).toBe("6 inch · Coffee");
  });

  it("is empty for a plain item with nothing chosen", () => {
    // Jane's Korean Buns: {"addons":[]}. Nothing to say, so say nothing.
    expect(describeSelections({ addons: [] })).toBe("");
    expect(describeSelections({})).toBe("");
  });

  it("survives rows written by older checkouts", () => {
    expect(describeSelections(null)).toBe("");
    expect(describeSelections(undefined)).toBe("");
    expect(describeSelections("1 kg")).toBe("");
    expect(describeSelections(["1 kg"])).toBe("");
    expect(describeSelections({ weight: 2, addons: "Candles" })).toBe("");
  });

  it("skips blank values rather than printing empty separators", () => {
    expect(describeSelections({ weight: "  ", decoration: "", addons: ["", "Candles"] })).toBe(
      "Candles"
    );
  });
});
