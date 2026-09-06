import { describe, it, expect } from "vitest";
import { paiseToRupeeInput, rupeeInputToPaise } from "./money";

describe("paiseToRupeeInput", () => {
  it("shows a whole-rupee price without decimals", () => {
    // A ₹900 cake. The old form put "90000" in front of the client.
    expect(paiseToRupeeInput(90000)).toBe("900");
    expect(paiseToRupeeInput(0)).toBe("0");
  });

  it("keeps the paise when there are any", () => {
    expect(paiseToRupeeInput(9050)).toBe("90.5");
    expect(paiseToRupeeInput(9055)).toBe("90.55");
  });

  it("is empty for an unset price rather than showing 0", () => {
    expect(paiseToRupeeInput(null)).toBe("");
    expect(paiseToRupeeInput(undefined)).toBe("");
    expect(paiseToRupeeInput(Number.NaN)).toBe("");
  });
});

describe("rupeeInputToPaise", () => {
  it("reads what a person types as rupees", () => {
    // The bug this exists to stop: typing 900 for a ₹900 cake used to store
    // 900 paise and price it at ₹9.
    expect(rupeeInputToPaise("900")).toBe(90000);
    expect(rupeeInputToPaise("90.5")).toBe(9050);
  });

  it("tolerates the currency symbol, commas and spaces", () => {
    expect(rupeeInputToPaise("₹1,200")).toBe(120000);
    expect(rupeeInputToPaise(" 1200 ")).toBe(120000);
  });

  it("rounds rather than storing a fraction of a paisa", () => {
    // 90.555 * 100 is 9055.499999999998 in floating point.
    expect(rupeeInputToPaise("90.555")).toBe(9056);
    expect(rupeeInputToPaise("0.014")).toBe(1);
  });

  it("returns null for anything unusable, so a caller can leave the field alone", () => {
    // Distinct from 0: a blank box must not be read as "free".
    expect(rupeeInputToPaise("")).toBeNull();
    expect(rupeeInputToPaise("   ")).toBeNull();
    expect(rupeeInputToPaise("abc")).toBeNull();
    expect(rupeeInputToPaise(null)).toBeNull();
    expect(rupeeInputToPaise(undefined)).toBeNull();
  });

  it("round-trips a stored price back to itself", () => {
    for (const paise of [0, 5000, 90000, 181000, 360000]) {
      expect(rupeeInputToPaise(paiseToRupeeInput(paise))).toBe(paise);
    }
  });
});
