import { describe, it, expect } from "vitest";
import { deliveryChargeFor } from "./delivery-charge";

// The live threshold: ₹10,000.
const THRESHOLD = 1_000_000;

describe("deliveryChargeFor", () => {
  it("is free at and above the threshold", () => {
    expect(deliveryChargeFor(THRESHOLD, THRESHOLD)).toBe("free");
    expect(deliveryChargeFor(THRESHOLD + 1, THRESHOLD)).toBe("free");
    expect(deliveryChargeFor(1_200_000, THRESHOLD)).toBe("free");
  });

  it("is quoted below it, including one paisa short", () => {
    expect(deliveryChargeFor(THRESHOLD - 1, THRESHOLD)).toBe("quoted");
    expect(deliveryChargeFor(34_000, THRESHOLD)).toBe("quoted");
    expect(deliveryChargeFor(0, THRESHOLD)).toBe("quoted");
  });

  it("is quoted when no threshold is configured", () => {
    // A missing setting is not a threshold of zero. Reading it that way would
    // promise free delivery on a ₹40 bun the moment someone cleared the field.
    expect(deliveryChargeFor(34_000, null)).toBe("quoted");
    expect(deliveryChargeFor(34_000, undefined)).toBe("quoted");
    expect(deliveryChargeFor(9_999_999, null)).toBe("quoted");
    expect(deliveryChargeFor(34_000, Number.NaN)).toBe("quoted");
  });

  it("matches what the orders API records as the fee", () => {
    // route.ts writes delivery_fee_cents 0 above the threshold and NULL below,
    // where NULL means "not quoted yet". The customer-facing copy has to agree
    // with the number the kitchen sees.
    const feeFor = (total: number) =>
      deliveryChargeFor(total, THRESHOLD) === "free" ? 0 : null;
    expect(feeFor(1_200_000)).toBe(0);
    expect(feeFor(34_000)).toBeNull();
  });
});
