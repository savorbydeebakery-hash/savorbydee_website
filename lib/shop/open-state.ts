import {
  IST_OFFSET,
  istDateKey,
  istDayName,
  istMinutesOfDay,
  parseClockMinutes,
} from "@/lib/time/ist";
import type { WeeklyHours } from "@/lib/cart/validation";

/**
 * Is the bakery open right now, and if not, when does it open next?
 *
 * Three separate things the client asked for all need this one answer:
 *   - a visible "we're closed, back fresh and early tomorrow" notice
 *   - orders being reviewed only inside business hours (9am-9pm)
 *   - the daily menu closing half an hour before the shop does (8:30pm)
 *
 * Everything is reasoned about in IST. See lib/time/ist.ts for why that is
 * pinned rather than left to the runtime's zone.
 */

export type ClosedReason = "open" | "before-open" | "after-close" | "closed-day" | "holiday";

export interface OpenState {
  /** Within today's operating hours. */
  isOpen: boolean;
  reason: ClosedReason;
  /** The instant the bakery next opens. Null only if it is closed every day. */
  nextOpen: Date | null;
  /** Today's closing instant, when currently open. */
  closesAt: Date | null;
  /** Open AND before the daily-menu cutoff. */
  dailyMenuOpen: boolean;
  /** Today's daily-menu cutoff instant, when today is an open day. */
  dailyMenuClosesAt: Date | null;
}

/** The daily menu shuts before the shop does, so the last bakes can be handed over. */
export const DEFAULT_DAILY_MENU_CUTOFF = "20:30";

const MAX_LOOKAHEAD_DAYS = 8;

function instantAt(dateKey: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:00${IST_OFFSET}`);
}

function nextDateKey(dateKey: string): string {
  return istDateKey(new Date(`${dateKey}T12:00:00${IST_OFFSET}`).getTime() + 86_400_000);
}

/** The open/close window for a given IST day, or null when shut. */
function windowFor(
  dateKey: string,
  weeklyHours: WeeklyHours | null | undefined,
  holidays: Set<string>
): { open: number; close: number } | null {
  if (holidays.has(dateKey)) return null;

  const dayHours = weeklyHours?.[istDayName(`${dateKey}T12:00:00${IST_OFFSET}`)];
  if (!dayHours || !dayHours.open) return null;

  const open = parseClockMinutes(dayHours.from);
  const close = parseClockMinutes(dayHours.to);
  if (Number.isNaN(open) || Number.isNaN(close) || close <= open) return null;

  return { open, close };
}

export function getOpenState(
  weeklyHours: WeeklyHours | null | undefined,
  holidays: string[] = [],
  cutoffClock: string = DEFAULT_DAILY_MENU_CUTOFF,
  now: Date = new Date()
): OpenState {
  // An unconfigured schedule means "always open" rather than "always closed".
  // Same failure direction as the slot validator: a missing setting must not
  // put a CLOSED sign on a bakery that is actually trading.
  if (!weeklyHours || Object.keys(weeklyHours).length === 0) {
    return {
      isOpen: true,
      reason: "open",
      nextOpen: null,
      closesAt: null,
      dailyMenuOpen: true,
      dailyMenuClosesAt: null,
    };
  }

  const holidaySet = new Set(holidays);
  const todayKey = istDateKey(now);
  const nowMinutes = istMinutesOfDay(now);
  const today = windowFor(todayKey, weeklyHours, holidaySet);

  // The cutoff cannot outlast the close, and a malformed value falls back to
  // the close rather than shutting the daily menu all day.
  const rawCutoff = parseClockMinutes(cutoffClock);
  const cutoffMinutes =
    today && !Number.isNaN(rawCutoff) ? Math.min(rawCutoff, today.close) : today?.close ?? NaN;

  const findNextOpen = (fromKey: string, skipToday: boolean): Date | null => {
    let key = skipToday ? nextDateKey(fromKey) : fromKey;
    for (let i = 0; i < MAX_LOOKAHEAD_DAYS; i++) {
      const w = windowFor(key, weeklyHours, holidaySet);
      if (w) return instantAt(key, w.open);
      key = nextDateKey(key);
    }
    return null;
  };

  if (!today) {
    return {
      isOpen: false,
      reason: holidaySet.has(todayKey) ? "holiday" : "closed-day",
      nextOpen: findNextOpen(todayKey, true),
      closesAt: null,
      dailyMenuOpen: false,
      dailyMenuClosesAt: null,
    };
  }

  const closesAt = instantAt(todayKey, today.close);
  const dailyMenuClosesAt = Number.isNaN(cutoffMinutes)
    ? null
    : instantAt(todayKey, cutoffMinutes);

  if (nowMinutes < today.open) {
    return {
      isOpen: false,
      reason: "before-open",
      nextOpen: instantAt(todayKey, today.open),
      closesAt: null,
      dailyMenuOpen: false,
      dailyMenuClosesAt,
    };
  }

  if (nowMinutes >= today.close) {
    return {
      isOpen: false,
      reason: "after-close",
      nextOpen: findNextOpen(todayKey, true),
      closesAt: null,
      dailyMenuOpen: false,
      dailyMenuClosesAt,
    };
  }

  return {
    isOpen: true,
    reason: "open",
    nextOpen: null,
    closesAt,
    dailyMenuOpen: !Number.isNaN(cutoffMinutes) && nowMinutes < cutoffMinutes,
    dailyMenuClosesAt,
  };
}
