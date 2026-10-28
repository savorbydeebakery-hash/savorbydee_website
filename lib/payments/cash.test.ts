import { describe, it, expect } from "vitest";
import { cashAtPickupAllowed, readCashSetting } from "./cash";
import { getRequiredNoticeHours, formatNotice, DEFAULT_NOTICE_RULES } from "@/lib/cart/validation";
import type { CartItem } from "@/lib/cart/types";

describe("cash at pickup", () => {
  it("never for delivery, whatever the setting", () => {
    for (const s of ["daily", "all"] as const) expect(cashAtPickupAllowed(s, "delivery", false).allowed).toBe(false);
  });
  it("Today's Menu pickups by default; preorders only when set to 'all'", () => {
    expect(cashAtPickupAllowed("daily", "pickup", false).allowed).toBe(true);
    expect(cashAtPickupAllowed("daily", "pickup", true).allowed).toBe(false);
    expect(cashAtPickupAllowed("all", "pickup", true).allowed).toBe(true);
  });
  it("off means UPI only", () => {
    expect(cashAtPickupAllowed("off", "pickup", false).allowed).toBe(false);
  });
  it("an unknown or missing setting is the safe default", () => {
    expect(readCashSetting(undefined)).toBe("daily");
    expect(readCashSetting("nonsense")).toBe("daily");
  });
});

describe("Today's Menu timing", () => {
  const daily = [{ id: "1", menuItemId: "m", name: "Bun", unitPriceCents: 4000, quantity: 1, selections: {}, lineTotalCents: 4000, dailyMenu: true }] as unknown as CartItem[];
  const preorder = [{ ...daily[0], dailyMenu: false }] as unknown as CartItem[];
  it("pickup from 10 minutes, delivery from 2 hours", () => {
    expect(getRequiredNoticeHours(daily, DEFAULT_NOTICE_RULES, "pickup") * 60).toBeCloseTo(10);
    expect(getRequiredNoticeHours(daily, DEFAULT_NOTICE_RULES, "delivery")).toBe(2);
  });
  it("preorders are unchanged either way", () => {
    expect(getRequiredNoticeHours(preorder, DEFAULT_NOTICE_RULES, "pickup")).toBe(24);
  });
  it("reads well for customers", () => {
    expect(formatNotice(10 / 60)).toBe("10 minutes");
    expect(formatNotice(2)).toBe("2 hours");
    expect(formatNotice(1.5)).toBe("1 hour 30 minutes");
    expect(formatNotice(120)).toBe("5 days");
  });
});
