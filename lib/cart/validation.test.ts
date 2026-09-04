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
  validateSlotAgainstHours,
  validateDeliveryWindow,
  canAddToCart,
  cartMenuKind,
  cartIsMixed,
} from "./validation";
import type { CartItem } from "./types";
import { istInputToInstant, istDayName, instantToIstInput } from "@/lib/time/ist";

/** A wall clock the bakery would recognise, as a real instant. */
const ist = (wallClock: string): Date => istInputToInstant(wallClock)!;

/** The IST clock time of a slot, for assertions. */
const istClock = (d: Date): string => instantToIstInput(d).slice(11);

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
    expect(getRequiredNoticeHours([makeItem()], DEFAULT_NOTICE_RULES)).toBe(2);
  });

  it("returns bulk notice (24h) when one item exceeds the threshold (12)", () => {
    expect(getRequiredNoticeHours([makeItem({ quantity: 13 })], DEFAULT_NOTICE_RULES)).toBe(24);
  });

  it("treats exactly the threshold as NOT bulk — the rule is *more than* 12", () => {
    expect(getRequiredNoticeHours([makeItem({ quantity: 12 })], DEFAULT_NOTICE_RULES)).toBe(2);
  });

  it("does not call a mixed basket bulk just because it is large", () => {
    // Thirteen different single items is a normal order; thirteen of one cake
    // is a baking problem. The old rule summed the cart and got this wrong.
    const basket = Array.from({ length: 13 }, (_, i) =>
      makeItem({ id: `cart-${i}`, quantity: 1 })
    );
    expect(getRequiredNoticeHours(basket, DEFAULT_NOTICE_RULES)).toBe(2);
  });

  it("triggers on the largest single line, not the total", () => {
    const basket = [makeItem({ id: "a", quantity: 2 }), makeItem({ id: "b", quantity: 13 })];
    expect(getRequiredNoticeHours(basket, DEFAULT_NOTICE_RULES)).toBe(24);
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
    expect(getRequiredNoticeHours([], DEFAULT_NOTICE_RULES)).toBe(2);
  });
});

// --- getEarliestValidSlot ---
//
// Every instant here is built from an IST wall clock and asserted back in IST,
// so these pass identically on a laptop in Shillong and on a UTC CI runner.
// They used to be written in the runtime's local zone, which made them
// self-consistent but silent about the bug they were meant to guard.

describe("getEarliestValidSlot", () => {
  it("rolls to next opening when notice lands after closing", () => {
    // Wednesday 10:00 + 12h = 22:00 IST, past the 18:00 close -> Thursday 09:00.
    const slot = getEarliestValidSlot(12, weeklyHours, [], ist("2026-08-19T10:00"));
    expect(slot).not.toBeNull();
    expect(istDayName(slot!)).toBe("thursday");
    expect(istClock(slot!)).toBe("09:00");
  });

  it("skips closed days (Sunday)", () => {
    // Saturday 17:00 + 12h = Sunday 05:00 -> Sunday closed -> Monday 09:00.
    const slot = getEarliestValidSlot(12, weeklyHours, [], ist("2026-08-22T17:00"));
    expect(slot).not.toBeNull();
    expect(istDayName(slot!)).toBe("monday");
    expect(istClock(slot!)).toBe("09:00");
  });

  it("skips holidays", () => {
    // Wednesday 06:00 + 12h = 18:00, exactly the close (invalid) -> Thursday,
    // which is a holiday -> Friday 09:00.
    const slot = getEarliestValidSlot(12, weeklyHours, ["2026-08-20"], ist("2026-08-19T06:00"));
    expect(slot).not.toBeNull();
    expect(istDayName(slot!)).toBe("friday");
    expect(istClock(slot!)).toBe("09:00");
  });

  it("returns null if every day is closed", () => {
    const allClosed: typeof weeklyHours = {
      monday: { open: false, from: "09:00", to: "18:00" },
      tuesday: { open: false, from: "09:00", to: "18:00" },
      wednesday: { open: false, from: "09:00", to: "18:00" },
      thursday: { open: false, from: "09:00", to: "18:00" },
      friday: { open: false, from: "09:00", to: "18:00" },
      saturday: { open: false, from: "09:00", to: "18:00" },
      sunday: { open: false, from: "09:00", to: "18:00" },
    };
    expect(getEarliestValidSlot(12, allClosed, [])).toBeNull();
  });

  it("adjusts to opening time if the candidate is before open", () => {
    const slot = getEarliestValidSlot(1, weeklyHours, [], ist("2026-08-19T05:00"));
    expect(slot).not.toBeNull();
    expect(istClock(slot!)).toBe("09:00");
  });

  it("snaps to the day's own opening time, not a hardcoded 9am", () => {
    // The previous implementation reset every roll-over to 09:00 regardless of
    // what the day actually opened at.
    const lateOpening = { ...weeklyHours, thursday: { open: true, from: "11:30", to: "18:00" } };
    const slot = getEarliestValidSlot(12, lateOpening, [], ist("2026-08-19T10:00"));
    expect(istDayName(slot!)).toBe("thursday");
    expect(istClock(slot!)).toBe("11:30");
  });

  it("returns the candidate unchanged when it already lands inside hours", () => {
    const slot = getEarliestValidSlot(2, weeklyHours, [], ist("2026-08-19T10:00"));
    expect(istClock(slot!)).toBe("12:00");
  });
});

// --- validateSlotAgainstHours ---

describe("validateSlotAgainstHours", () => {
  it("rejects a slot on a closed day", () => {
    // The live bug: Sunday is set closed and was bookable anyway.
    const result = validateSlotAgainstHours(ist("2026-08-23T10:00"), weeklyHours);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/closed on Sundays/i);
  });

  it("rejects a slot before opening", () => {
    const result = validateSlotAgainstHours(ist("2026-08-19T07:00"), weeklyHours);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/between 09:00 and 18:00/);
  });

  it("rejects a slot at or after closing", () => {
    expect(validateSlotAgainstHours(ist("2026-08-19T18:00"), weeklyHours).valid).toBe(false);
    expect(validateSlotAgainstHours(ist("2026-08-19T21:00"), weeklyHours).valid).toBe(false);
  });

  it("rejects a holiday", () => {
    const result = validateSlotAgainstHours(ist("2026-08-19T10:00"), weeklyHours, ["2026-08-19"]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/closed that day/i);
  });

  it("accepts a slot inside hours", () => {
    expect(validateSlotAgainstHours(ist("2026-08-19T09:00"), weeklyHours).valid).toBe(true);
    expect(validateSlotAgainstHours(ist("2026-08-19T17:59"), weeklyHours).valid).toBe(true);
  });

  it("judges the day in IST, not UTC", () => {
    // 2026-08-24T02:00 IST is Monday. Read as UTC it is still Sunday 20:30 on
    // the 23rd, which the old code would have called a closed day.
    expect(istDayName(ist("2026-08-24T02:00"))).toBe("monday");
    const result = validateSlotAgainstHours(ist("2026-08-24T09:30"), weeklyHours);
    expect(result.valid).toBe(true);
  });

  it("accepts anything when hours are unconfigured or malformed", () => {
    expect(validateSlotAgainstHours(ist("2026-08-23T10:00"), {}).valid).toBe(true);
    expect(validateSlotAgainstHours(ist("2026-08-23T10:00"), null).valid).toBe(true);
    const broken = { sunday: { open: true, from: "nope", to: "later" } };
    expect(validateSlotAgainstHours(ist("2026-08-23T10:00"), broken).valid).toBe(true);
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
  it("passes with just a name and a phone", () => {
    expect(validateGuestInfo({ name: "John Doe", phone: "+919836537447" }).valid).toBe(true);
  });

  it("fails for a short name", () => {
    const r = validateGuestInfo({ name: "J", phone: "+919836537447" });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Name is required");
  });

  it("fails for a phone that is not ten digits", () => {
    const r = validateGuestInfo({ name: "John", phone: "123" });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("A 10-digit mobile number is required");
  });

  it("rejects punctuation the old validator accepted", () => {
    // /^[+]?[\d\s-]{10,15}$/ passed this: ten characters, zero digits.
    expect(validateGuestInfo({ name: "John", phone: "----------" }).valid).toBe(false);
  });

  it("accepts a number however it is written", () => {
    for (const phone of ["9836537447", "+91 98365 37447", "098365-37447"]) {
      expect(validateGuestInfo({ name: "John", phone }).valid).toBe(true);
    }
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

// --- validateDeliveryWindow ---

describe("validateDeliveryWindow", () => {
  // The shop trades 09:00-21:00; delivery runs 10:00-20:00.
  it("rejects a delivery slot before the delivery window opens", () => {
    const r = validateDeliveryWindow(ist("2026-09-02T09:30"), "10:00", "20:00");
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/between 10:00 and 20:00/);
  });

  it("rejects a delivery slot after the delivery window closes", () => {
    expect(validateDeliveryWindow(ist("2026-09-02T20:30"), "10:00", "20:00").valid).toBe(false);
  });

  it("accepts the boundaries themselves", () => {
    expect(validateDeliveryWindow(ist("2026-09-02T10:00"), "10:00", "20:00").valid).toBe(true);
    expect(validateDeliveryWindow(ist("2026-09-02T20:00"), "10:00", "20:00").valid).toBe(true);
  });

  it("accepts a slot inside the window", () => {
    expect(validateDeliveryWindow(ist("2026-09-02T14:00"), "10:00", "20:00").valid).toBe(true);
  });

  it("is narrower than the shop's own hours, which stay valid for collection", () => {
    // 09:30 is inside weekly_hours but outside the delivery window.
    expect(validateSlotAgainstHours(ist("2026-09-02T09:30"), weeklyHours).valid).toBe(true);
    expect(validateDeliveryWindow(ist("2026-09-02T09:30"), "10:00", "20:00").valid).toBe(false);
  });

  it("accepts anything when the window is unset or malformed", () => {
    expect(validateDeliveryWindow(ist("2026-09-02T06:00"), null, null).valid).toBe(true);
    expect(validateDeliveryWindow(ist("2026-09-02T06:00"), "nope", "later").valid).toBe(true);
    expect(validateDeliveryWindow(ist("2026-09-02T06:00"), "20:00", "10:00").valid).toBe(true);
  });
});

// --- notice resolution: item -> category -> menu default ---

describe("getRequiredNoticeHours across the two menus", () => {
  const daily = (o: Partial<CartItem> = {}) => makeItem({ dailyMenu: true, ...o });
  const preorder = (o: Partial<CartItem> = {}) => makeItem({ dailyMenu: false, ...o });

  it("uses the daily default for a daily line", () => {
    expect(getRequiredNoticeHours([daily()], DEFAULT_NOTICE_RULES)).toBe(2);
  });

  it("uses the preorder default for a preorder line", () => {
    expect(getRequiredNoticeHours([preorder()], DEFAULT_NOTICE_RULES)).toBe(24);
  });

  it("treats a line saved before dailyMenu existed as daily", () => {
    // An older basket in localStorage has no dailyMenu. Reading that as
    // preorder would silently push a 2-hour order out to 24.
    expect(getRequiredNoticeHours([makeItem()], DEFAULT_NOTICE_RULES)).toBe(2);
  });

  it("lets a per-line override beat the menu default, in both directions", () => {
    expect(getRequiredNoticeHours([daily({ noticeHours: 48 })], DEFAULT_NOTICE_RULES)).toBe(48);
    expect(getRequiredNoticeHours([preorder({ noticeHours: 3 })], DEFAULT_NOTICE_RULES)).toBe(3);
  });

  it("treats an override of 0 as 'no notice', not as 'inherit'", () => {
    // ?? not ||, or a deliberate zero would fall through to the default.
    expect(getRequiredNoticeHours([preorder({ noticeHours: 0 })], DEFAULT_NOTICE_RULES)).toBe(0);
  });

  it("takes the largest window in the basket", () => {
    const basket = [daily(), preorder({ id: "b" })];
    expect(getRequiredNoticeHours(basket, DEFAULT_NOTICE_RULES)).toBe(24);
  });

  it("custom cake notice still wins over everything", () => {
    const basket = [preorder({ requiresCustomNotice: true })];
    expect(getRequiredNoticeHours(basket, DEFAULT_NOTICE_RULES)).toBe(120);
  });

  it("respects a per-line bulk threshold instead of the site one", () => {
    // Site threshold is 12; this line says 3, so 4 is already bulk.
    expect(
      getRequiredNoticeHours([daily({ quantity: 4, bulkThreshold: 3 })], DEFAULT_NOTICE_RULES)
    ).toBe(24);
    expect(
      getRequiredNoticeHours([daily({ quantity: 3, bulkThreshold: 3 })], DEFAULT_NOTICE_RULES)
    ).toBe(2);
  });
});

// --- no mixing ---

describe("canAddToCart", () => {
  const daily = (o: Partial<CartItem> = {}) => makeItem({ dailyMenu: true, ...o });
  const preorder = (o: Partial<CartItem> = {}) => makeItem({ dailyMenu: false, ...o });

  it("allows anything into an empty basket", () => {
    expect(canAddToCart([], { dailyMenu: false }).allowed).toBe(true);
    expect(canAddToCart([], { dailyMenu: true }).allowed).toBe(true);
  });

  it("allows another item from the same menu", () => {
    expect(canAddToCart([daily()], { dailyMenu: true }).allowed).toBe(true);
    expect(canAddToCart([preorder()], { dailyMenu: false }).allowed).toBe(true);
  });

  it("refuses the other menu, and names both", () => {
    const r = canAddToCart([daily()], { dailyMenu: false });
    expect(r.allowed).toBe(false);
    expect(r.error).toMatch(/Today's Menu/);
    expect(r.error).toMatch(/Preorder Menu/);
  });

  it("refuses in the other direction too", () => {
    expect(canAddToCart([preorder()], { dailyMenu: true }).allowed).toBe(false);
  });

  it("reports the kind of a basket, and null when empty", () => {
    expect(cartMenuKind([])).toBeNull();
    expect(cartMenuKind([daily()])).toBe("daily");
    expect(cartMenuKind([preorder()])).toBe("preorder");
  });

  it("detects a basket saved before the rule existed that holds both", () => {
    expect(cartIsMixed([daily(), preorder({ id: "b" })])).toBe(true);
    expect(cartIsMixed([daily(), daily({ id: "b" })])).toBe(false);
    expect(cartIsMixed([daily()])).toBe(false);
  });
});
