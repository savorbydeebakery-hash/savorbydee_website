import { describe, it, expect } from "vitest";
import {
  getRequiredNoticeHours,
  getEarliestValidSlot,
  validateCart,
  validateGuestInfo,
  validateDeliveryAddress,
  countItems,
  hasCustomNoticeItems,
  DEFAULT_NOTICE_RULES,
} from "./validation";
import type { CartItem } from "./types";

// --- Fixtures ---

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "cart-1",
  menuItemId: "item-1",
  name: "Test Item",
  unitPriceCents: 50000,
  quantity: 1,
  selections: {},
  lineTotalCents: 50000,
  ...overrides,
});

const weeklyHours = {
  monday: { open: true, from: "09:00", to: "18:00" },
  tuesday: { open: true, from: "09:00", to: "18:00" },
  wednesday: { open: true, from: "09:00", to: "18:00" },
  thursday: { open: true, from: "09:00", to: "18:00" },
  friday: { open: true, from: "09:00", to: "18:00" },
  saturday: { open: true, from: "09:00", to: "18:00" },
  sunday: { open: false, from: "09:00", to: "18:00" },
};

// --- getRequiredNoticeHours ---

describe("getRequiredNoticeHours", () => {
  it("returns global notice (12h) for small cart", () => {
    expect(getRequiredNoticeHours([makeItem()], DEFAULT_NOTICE_RULES)).toBe(12);
  });

  it("returns bulk notice (24h) when qty >= bulkThreshold (10)", () => {
    const items = [makeItem({ quantity: 10 })];
    expect(getRequiredNoticeHours(items, DEFAULT_NOTICE_RULES)).toBe(24);
  });

  it("returns custom notice (120h = 5 days) when item requires custom notice", () => {
    const items = [makeItem({ requiresCustomNotice: true })];
    expect(getRequiredNoticeHours(items, DEFAULT_NOTICE_RULES)).toBe(120);
  });

  it("stacks by MAX: bulk + custom → 120h", () => {
    const items = [makeItem({ quantity: 15, requiresCustomNotice: true })];
    expect(getRequiredNoticeHours(items, DEFAULT_NOTICE_RULES)).toBe(120);
  });

  it("returns global minimum even for empty cart", () => {
    expect(getRequiredNoticeHours([], DEFAULT_NOTICE_RULES)).toBe(12);
  });
});

// --- getEarliestValidSlot ---

describe("getEarliestValidSlot", () => {
  it("rolls to next opening when notice lands after closing", () => {
    // Wednesday 10am + 12h = 10pm → outside hours → next day 9am (Thursday)
    const from = new Date("2026-08-19T10:00:00"); // Wednesday
    const slot = getEarliestValidSlot(12, weeklyHours, [], from);
    expect(slot).not.toBeNull();
    expect(slot!.getDay()).toBe(4); // Thursday
    expect(slot!.getHours()).toBe(9);
  });

  it("skips closed days (Sunday)", () => {
    // Saturday 5pm + 12h = Sunday 5am → Sunday closed → Monday 9am
    const from = new Date("2026-08-22T17:00:00"); // Saturday
    const slot = getEarliestValidSlot(12, weeklyHours, [], from);
    expect(slot).not.toBeNull();
    expect(slot!.getDay()).toBe(1); // Monday
    expect(slot!.getHours()).toBe(9);
  });

  it("skips holidays", () => {
    // Wednesday 6am + 12h = Wednesday 6pm = exactly closing time (invalid)
    // → Thursday, but Thursday is a holiday → Friday 9am
    const from = new Date("2026-08-19T06:00:00"); // Wednesday 6am
    const holidays = ["2026-08-20"]; // Thursday
    const slot = getEarliestValidSlot(12, weeklyHours, holidays, from);
    expect(slot).not.toBeNull();
    expect(slot!.getDay()).toBe(5); // Friday
    expect(slot!.getHours()).toBe(9);
  });

  it("returns null if no slot found in 30 iterations", () => {
    // All days closed
    const allClosed: typeof weeklyHours = {
      monday: { open: false, from: "09:00", to: "18:00" },
      tuesday: { open: false, from: "09:00", to: "18:00" },
      wednesday: { open: false, from: "09:00", to: "18:00" },
      thursday: { open: false, from: "09:00", to: "18:00" },
      friday: { open: false, from: "09:00", to: "18:00" },
      saturday: { open: false, from: "09:00", to: "18:00" },
      sunday: { open: false, from: "09:00", to: "18:00" },
    };
    const slot = getEarliestValidSlot(12, allClosed, []);
    expect(slot).toBeNull();
  });

  it("adjusts to opening time if candidate is before open", () => {
    // Wednesday 2am + 12h = Wednesday 2pm → within hours
    // But let's test: Wednesday 8am + 1h = 9am = opening time
    const from = new Date("2026-08-19T08:00:00"); // Wednesday 8am
    const slot = getEarliestValidSlot(1, weeklyHours, [], from);
    expect(slot).not.toBeNull();
    expect(slot!.getHours()).toBe(9); // adjusted to opening
  });
});

// --- validateCart ---

describe("validateCart", () => {
  it("passes for valid cart with items", () => {
    const result = validateCart([makeItem()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails for empty cart", () => {
    const result = validateCart([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Cart is empty");
  });

  it("fails for item with quantity < 1", () => {
    const result = validateCart([makeItem({ quantity: 0 })]);
    expect(result.valid).toBe(false);
  });
});

// --- validateGuestInfo ---

describe("validateGuestInfo", () => {
  it("passes for valid info", () => {
    const result = validateGuestInfo({
      name: "John Doe",
      email: "john@example.com",
      phone: "+919836537447",
    });
    expect(result.valid).toBe(true);
  });

  it("fails for short name", () => {
    const result = validateGuestInfo({
      name: "J",
      email: "john@example.com",
      phone: "+919836537447",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Name is required");
  });

  it("fails for invalid email", () => {
    const result = validateGuestInfo({
      name: "John",
      email: "not-an-email",
      phone: "+919836537447",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Valid email is required");
  });

  it("fails for invalid phone", () => {
    const result = validateGuestInfo({
      name: "John",
      email: "john@example.com",
      phone: "123",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Valid phone number is required");
  });
});

// --- validateDeliveryAddress ---

describe("validateDeliveryAddress", () => {
  it("passes for valid address", () => {
    const result = validateDeliveryAddress({
      address: "123 Main Street, Apartment 4B, Kolkata 700001",
    });
    expect(result.valid).toBe(true);
  });

  it("fails for short address", () => {
    const result = validateDeliveryAddress({
      address: "Short",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("at least 10 characters");
  });
});

// --- countItems ---

describe("countItems", () => {
  it("sums quantities", () => {
    expect(countItems([makeItem({ quantity: 3 }), makeItem({ quantity: 2 })])).toBe(5);
  });

  it("returns 0 for empty", () => {
    expect(countItems([])).toBe(0);
  });
});

// --- hasCustomNoticeItems ---

describe("hasCustomNoticeItems", () => {
  it("returns true when any item requires custom notice", () => {
    expect(
      hasCustomNoticeItems([
        makeItem(),
        makeItem({ requiresCustomNotice: true }),
      ])
    ).toBe(true);
  });

  it("returns false when no items require custom notice", () => {
    expect(hasCustomNoticeItems([makeItem(), makeItem()])).toBe(false);
  });
});
