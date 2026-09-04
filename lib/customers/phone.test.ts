import { describe, it, expect } from "vitest";
import { normalizePhone, samePhone, isValidPhone, formatPhone } from "./phone";

describe("normalizePhone", () => {
  it("collapses the forms already in the live orders table", () => {
    // These two are one customer, stored two ways.
    expect(normalizePhone("9836537447")).toBe("9836537447");
    expect(normalizePhone("+91 98365 37447")).toBe("9836537447");
  });

  it("strips every separator and prefix people actually type", () => {
    for (const raw of [
      "+919836537447",
      "0091 9836537447",
      "09836537447",
      "98365-37447",
      "(98365) 37447",
      " 9836537447 ",
    ]) {
      expect(normalizePhone(raw)).toBe("9836537447");
    }
  });

  it("leaves a short number alone rather than padding or guessing", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });

  it("is empty for nothing usable", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
    expect(normalizePhone("----------")).toBe("");
  });
});

describe("samePhone", () => {
  it("matches the same customer across formats", () => {
    expect(samePhone("+91 98365 37447", "9836537447")).toBe(true);
    expect(samePhone("09836537447", "+919836537447")).toBe(true);
  });

  it("does not match different customers", () => {
    // One digit apart — both are real numbers in the live table.
    expect(samePhone("9836537447", "9836534447")).toBe(false);
  });

  it("never matches when either side is blank", () => {
    // Two orders with no phone are not the same person, and a lookup with no
    // phone must not match an order that also has none.
    expect(samePhone("", "")).toBe(false);
    expect(samePhone(null, null)).toBe(false);
    expect(samePhone("9836537447", "")).toBe(false);
    expect(samePhone("", "9836537447")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts ten digits however they are written", () => {
    expect(isValidPhone("9836537447")).toBe(true);
    expect(isValidPhone("+91 98365 37447")).toBe(true);
  });

  it("rejects what the old validator let through", () => {
    // The previous rule was /^[+]?[\d\s-]{10,15}$/, which passed on
    // punctuation alone.
    expect(isValidPhone("----------")).toBe(false);
    expect(isValidPhone("   -  -   ")).toBe(false);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("groups a valid number for reading", () => {
    expect(formatPhone("+919836537447")).toBe("98365 37447");
  });

  it("hands back the original when it cannot be parsed", () => {
    expect(formatPhone("12345")).toBe("12345");
    expect(formatPhone(null)).toBe("");
  });
});
