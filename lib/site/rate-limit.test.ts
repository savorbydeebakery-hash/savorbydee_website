import { describe, it, expect } from "vitest";
import { limitFor } from "./rate-limit";

const req = (path: string, method = "GET") => new Request(`https://savorbydee.in${path}`, { method });

describe("what counts against a rate limit", () => {
  it("anything sent to the site's APIs", () => {
    for (const path of ["/api/orders", "/api/orders/SBD-1/payment", "/api/custom-cake/notify", "/api/push/subscribe", "/api/account/delete"]) {
      expect(limitFor(req(path, "POST")), path).toBe("WRITE_LIMIT");
    }
  });

  it("looking up orders", () => {
    expect(limitFor(req("/api/orders?human_id=SBD-1&phone=1"))).toBe("LOOKUP_LIMIT");
  });

  it("not reading pages, an open order, or the payment provider's webhooks", () => {
    expect(limitFor(req("/"))).toBeNull();
    expect(limitFor(req("/menu"))).toBeNull();
    // The order page checks on its order repeatedly while it waits for payment.
    expect(limitFor(req("/api/orders/SBD-1?phone=1"))).toBeNull();
    expect(limitFor(req("/api/push/key"))).toBeNull();
    expect(limitFor(req("/api/webhooks/razorpay", "POST"))).toBeNull();
  });
});
