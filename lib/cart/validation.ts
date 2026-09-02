/**
 * Cart validation utilities — pure functions for validating cart state,
 * notice windows, bulk thresholds, and slot availability.
 * No side effects. Fully unit-testable.
 */
import type { CartItem } from "./types";
import {
  IST_OFFSET,
  istDateKey,
  istDayName,
  istMinutesOfDay,
  parseClockMinutes,
} from "@/lib/time/ist";

export interface SiteNoticeRules {
  globalNoticeHours: number; // default 2
  /**
   * Per-ITEM quantity above which an order counts as bulk. 12 means 13 or more
   * of any single item triggers the bulk window; a cart of many different
   * items does not, however large it is.
   */
  bulkThreshold: number; // default 12
  bulkNoticeHours: number; // default 24
  customCakeNoticeDays: number; // default 5
}

export interface DayHours {
  open: boolean;
  from: string; // "09:00"
  to: string; // "18:00"
}

export type WeeklyHours = Record<string, DayHours>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  earliestSlot: Date | null;
  noticeHours: number;
}

/**
 * Fallback only. site_settings is the source of truth and the checkout now
 * loads it — these values are what applies for the moment before that request
 * resolves, and in tests.
 */
/**
 * Ceiling on a single line. The client's rule is "preorder can be anything
 * from qty 1 to 1000" — there is no stock limit on a made-to-order item, but
 * an unbounded number box invites a typo that reads as a real order.
 */
export const MAX_LINE_QUANTITY = 1000;

export const DEFAULT_NOTICE_RULES: SiteNoticeRules = {
  globalNoticeHours: 2,
  bulkThreshold: 12,
  bulkNoticeHours: 24,
  customCakeNoticeDays: 5,
};

/**
 * Count total items in cart (sum of quantities).
 */
export function countItems(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Check if any item requires custom notice (custom cakes).
 */
export function hasCustomNoticeItems(items: CartItem[]): boolean {
  return items.some((item) => item.requiresCustomNotice);
}

/**
 * Determine the required notice window for the cart.
 * Rules STACK BY MAX:
 *   - Global: the site's standard notice (minimum for all orders)
 *   - Bulk: if ANY ONE item exceeds bulkThreshold -> bulkNoticeHours
 *   - Custom: if any item requires custom notice -> customCakeNoticeDays
 * The effective notice is the MAX of all applicable windows.
 *
 * The bulk test is PER ITEM, and strictly greater than the threshold: the
 * client's rule is "more than 12 of each item", so 12 is fine and 13 is bulk.
 * It used to sum every line in the cart and compare that to the threshold,
 * which made a mixed basket of ten different single items count as a bulk
 * order — thirteen of one cake is a baking problem, one each of thirteen
 * things is just a normal order.
 */
export function getRequiredNoticeHours(
  items: CartItem[],
  rules: SiteNoticeRules = DEFAULT_NOTICE_RULES
): number {
  const notices: number[] = [rules.globalNoticeHours];

  const largestLine = items.reduce((max, item) => Math.max(max, item.quantity), 0);
  if (largestLine > rules.bulkThreshold) {
    notices.push(rules.bulkNoticeHours);
  }

  if (hasCustomNoticeItems(items)) {
    notices.push(rules.customCakeNoticeDays * 24);
  }

  return Math.max(...notices);
}

/** An instant for a given IST calendar day at a given minute-of-day. */
function istInstantAt(dateKey: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:00${IST_OFFSET}`);
}

/** The IST calendar day after `dateKey`. Noon avoids any boundary edge. */
function nextIstDateKey(dateKey: string): string {
  return istDateKey(new Date(`${dateKey}T12:00:00${IST_OFFSET}`).getTime() + 86_400_000);
}

/** A day the bakery is open, with its window parsed. Null when it is not. */
function openWindow(
  slot: Date,
  weeklyHours: WeeklyHours | null | undefined,
  holidaySet: Set<string>
): { openMinutes: number; closeMinutes: number } | null {
  if (holidaySet.has(istDateKey(slot))) return null;

  const dayHours = weeklyHours?.[istDayName(slot)];
  if (!dayHours || !dayHours.open) return null;

  const openMinutes = parseClockMinutes(dayHours.from);
  const closeMinutes = parseClockMinutes(dayHours.to);
  if (Number.isNaN(openMinutes) || Number.isNaN(closeMinutes)) return null;
  if (closeMinutes <= openMinutes) return null;

  return { openMinutes, closeMinutes };
}

/**
 * The earliest slot that satisfies the notice window AND falls inside opening
 * hours, skipping closed days and holidays.
 *
 * Everything here is reasoned about in IST. It used to mix `getDay()` and
 * `getHours()` (the *runtime's* zone — UTC on Workers) with a UTC
 * `toISOString()` date string for the holiday lookup, so on the server the
 * weekday and the holiday date could disagree with each other and both
 * disagree with the bakery.
 *
 * The old version also snapped every roll-over to a hardcoded 9am, which is
 * wrong for any day that opens at another time. Rolling to the next midnight
 * and letting the "before opening" branch snap it to that day's own `from`
 * handles it without the constant.
 */
export function getEarliestValidSlot(
  requiredNoticeHours: number,
  weeklyHours: WeeklyHours,
  holidays: string[] = [],
  fromTime: Date = new Date()
): Date | null {
  const holidaySet = new Set(holidays);
  let candidate = new Date(fromTime.getTime() + requiredNoticeHours * 3_600_000);

  // 30 days is the search horizon; a bakery closed for a month has a problem
  // this function cannot solve.
  for (let i = 0; i < 40; i++) {
    const window = openWindow(candidate, weeklyHours, holidaySet);

    if (!window) {
      candidate = istInstantAt(nextIstDateKey(istDateKey(candidate)), 0);
      continue;
    }

    const candidateMinutes = istMinutesOfDay(candidate);

    if (candidateMinutes < window.openMinutes) {
      return istInstantAt(istDateKey(candidate), window.openMinutes);
    }

    if (candidateMinutes >= window.closeMinutes) {
      candidate = istInstantAt(nextIstDateKey(istDateKey(candidate)), 0);
      continue;
    }

    return candidate;
  }

  return null;
}

/**
 * Is this slot one the bakery is actually open for?
 *
 * `weekly_hours` and `holidays` have been editable in Admin -> Settings since
 * the panel was built, and nothing read either of them: Sunday is set closed
 * in the live settings and a customer could still book a Sunday slot. This is
 * the check that makes those two settings mean something.
 *
 * Unconfigured or malformed hours return valid. A broken setting should not
 * refuse every order on the site; the failure mode has to be "accepts too
 * much", not "accepts nothing".
 */
export function validateSlotAgainstHours(
  slot: Date,
  weeklyHours: WeeklyHours | null | undefined,
  holidays: string[] = []
): { valid: boolean; error: string | null } {
  if (!weeklyHours || Object.keys(weeklyHours).length === 0) {
    return { valid: true, error: null };
  }

  const holidaySet = new Set(holidays);

  if (holidaySet.has(istDateKey(slot))) {
    return { valid: false, error: "We are closed that day. Please choose another date." };
  }

  const dayName = istDayName(slot);
  const dayHours = weeklyHours[dayName];

  // A weekday absent from the settings object is unconfigured, not closed.
  if (!dayHours) return { valid: true, error: null };

  const label = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  if (!dayHours.open) {
    return { valid: false, error: `We are closed on ${label}s. Please choose another day.` };
  }

  const openMinutes = parseClockMinutes(dayHours.from);
  const closeMinutes = parseClockMinutes(dayHours.to);
  if (Number.isNaN(openMinutes) || Number.isNaN(closeMinutes)) {
    return { valid: true, error: null };
  }

  const slotMinutes = istMinutesOfDay(slot);
  if (slotMinutes < openMinutes || slotMinutes >= closeMinutes) {
    return {
      valid: false,
      error: `On ${label}s we take slots between ${dayHours.from} and ${dayHours.to} IST.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate the full cart for checkout readiness.
 */
export function validateCart(
  items: CartItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push("Cart is empty");
  }

  for (const item of items) {
    if (item.quantity < 1) {
      errors.push(`${item.name}: invalid quantity`);
    }
    if (item.unitPriceCents < 0) {
      errors.push(`${item.name}: invalid price`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate guest contact info for checkout.
 */
export function validateGuestInfo(info: {
  name: string;
  email: string;
  phone: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!info.name || info.name.trim().length < 2) {
    errors.push("Name is required");
  }

  if (!info.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) {
    errors.push("Valid email is required");
  }

  if (!info.phone || !/^[+]?[\d\s-]{10,15}$/.test(info.phone)) {
    errors.push("Valid phone number is required");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate delivery address.
 */
export function validateDeliveryAddress(address: {
  address: string;
  landmark?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!address.address || address.address.trim().length < 10) {
    errors.push("Full delivery address is required (at least 10 characters)");
  }

  return { valid: errors.length === 0, errors };
}
