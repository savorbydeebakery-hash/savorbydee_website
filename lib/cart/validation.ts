/**
 * Cart validation utilities — pure functions for validating cart state,
 * notice windows, bulk thresholds, and slot availability.
 * No side effects. Fully unit-testable.
 */
import type { CartItem } from "./types";

export interface SiteNoticeRules {
  globalNoticeHours: number; // default 12
  bulkThreshold: number; // default 10
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

export const DEFAULT_NOTICE_RULES: SiteNoticeRules = {
  globalNoticeHours: 12,
  bulkThreshold: 10,
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
 *   - Global: 12h (minimum for all orders)
 *   - Bulk: if total qty >= bulkThreshold → 24h
 *   - Custom: if any item requires custom notice → 5 days (120h)
 * The effective notice is the MAX of all applicable windows.
 */
export function getRequiredNoticeHours(
  items: CartItem[],
  rules: SiteNoticeRules = DEFAULT_NOTICE_RULES
): number {
  const notices: number[] = [rules.globalNoticeHours];

  const totalQty = countItems(items);
  if (totalQty >= rules.bulkThreshold) {
    notices.push(rules.bulkNoticeHours);
  }

  if (hasCustomNoticeItems(items)) {
    notices.push(rules.customCakeNoticeDays * 24);
  }

  return Math.max(...notices);
}

/**
 * 6-step getEarliestValidSlot algorithm:
 * 1. Start from now + required notice hours
 * 2. If the time falls outside operating hours, move to next open day
 * 3. If the time falls on a holiday, skip to next day
 * 4. If the slot is within operating hours, return it
 * 5. If the day is closed, skip to next day
 * 6. Repeat until a valid slot is found (max 30 iterations to prevent infinite loop)
 */
export function getEarliestValidSlot(
  requiredNoticeHours: number,
  weeklyHours: WeeklyHours,
  holidays: string[] = [],
  fromTime: Date = new Date()
): Date | null {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const holidaySet = new Set(holidays);

  // Step 1: earliest possible time = now + notice
  let candidate = new Date(fromTime.getTime() + requiredNoticeHours * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const dayName = dayNames[candidate.getDay()];
    const dateStr = candidate.toISOString().split("T")[0];

    // Step 3: holiday check
    if (holidaySet.has(dateStr)) {
      candidate = new Date(candidate);
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(9, 0, 0, 0); // reset to 9am next day
      continue;
    }

    // Step 5: closed day check
    const dayHours = weeklyHours[dayName];
    if (!dayHours || !dayHours.open) {
      candidate = new Date(candidate);
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(9, 0, 0, 0);
      continue;
    }

    // Step 2: within operating hours?
    const [openH, openM] = dayHours.from.split(":").map(Number);
    const [closeH, closeM] = dayHours.to.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const candidateMinutes = candidate.getHours() * 60 + candidate.getMinutes();

    if (candidateMinutes < openMinutes) {
      // Too early — set to opening time
      candidate.setHours(openH, openM, 0, 0);
      return candidate;
    }

    if (candidateMinutes >= closeMinutes) {
      // Too late — move to next day at opening
      candidate = new Date(candidate);
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(9, 0, 0, 0);
      continue;
    }

    // Step 4: within operating hours — valid slot
    return candidate;
  }

  return null; // couldn't find a slot in 30 days
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
