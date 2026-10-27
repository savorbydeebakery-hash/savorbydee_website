import { IST_OFFSET, istDayName, parseClockMinutes } from "@/lib/time/ist";
import type { DayHours, WeeklyHours } from "@/lib/cart/validation";

/**
 * One-day changes to the opening hours: close early, open late, close for the
 * day, or open specially (site_settings.hours_overrides, migration 00050).
 *
 * Added for emergencies (client request, 2026-10-27). An override belongs to
 * a single IST date, so it expires by itself: nobody has to remember to put
 * the normal hours back, which is the mistake editing the weekly hours for an
 * emergency would invite.
 *
 * Every check that asks "are we open?" or "is this slot allowed?" goes
 * through dayWindow below — the closed banner, the order API, checkout and
 * the earliest-slot finder — so a change applies everywhere at once.
 */

export interface HoursOverride {
  /** Closed for the whole day. */
  closed?: boolean;
  /** Replacement opening time, "HH:MM". */
  from?: string;
  /** Replacement closing time, "HH:MM". */
  to?: string;
  /** Shown to customers while closed because of this change. */
  note?: string;
  /** Who set it and when (shown in the admin). */
  set_by?: string;
  set_at?: string;
}

export type HoursOverrides = Record<string, HoursOverride>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{1,2}:\d{2}$/;

/**
 * Accepts whatever is stored and returns only well-formed entries. A broken
 * entry is dropped (normal hours apply) rather than closing the shop.
 */
export function readOverrides(raw: unknown): HoursOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: HoursOverrides = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DATE_KEY.test(key) || !value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const o: HoursOverride = {};
    if (v.closed === true) o.closed = true;
    if (typeof v.from === "string" && CLOCK.test(v.from)) o.from = v.from;
    if (typeof v.to === "string" && CLOCK.test(v.to)) o.to = v.to;
    if (typeof v.note === "string" && v.note.trim()) o.note = v.note.trim().slice(0, 200);
    if (typeof v.set_by === "string") o.set_by = v.set_by;
    if (typeof v.set_at === "string") o.set_at = v.set_at;
    if (o.closed || o.from || o.to) out[key] = o;
  }
  return out;
}

export interface DayWindow {
  open: number;
  close: number;
  /** True when an override decided this day's hours. */
  changed: boolean;
}

/**
 * The opening window for an IST date, in minutes from midnight, or null when
 * closed. `undefined` means the schedule has nothing for that weekday, which
 * callers treat as "unconfigured, so allowed" (the long-standing rule that a
 * missing setting must not refuse orders).
 *
 * Holidays win over everything. Then an override: closed shuts the day;
 * from/to replace the weekly times (either may be set alone). An override can
 * also open a normally closed day, as long as it gives both times.
 */
export function dayWindow(
  dateKey: string,
  weeklyHours: WeeklyHours | null | undefined,
  holidays: Set<string>,
  overrides: HoursOverrides = {}
): DayWindow | null | undefined {
  if (holidays.has(dateKey)) return null;
  const override = overrides[dateKey];
  const day: DayHours | undefined = weeklyHours?.[istDayName(`${dateKey}T12:00:00${IST_OFFSET}`)];

  if (override) {
    if (override.closed) return null;
    const baseFrom = day?.open ? day.from : undefined;
    const baseTo = day?.open ? day.to : undefined;
    const open = parseClockMinutes(override.from ?? baseFrom ?? "");
    const close = parseClockMinutes(override.to ?? baseTo ?? "");
    if (Number.isNaN(open) || Number.isNaN(close)) {
      // Half an override on a day with no normal hours: nothing to apply it to.
      return day ? (day.open ? weeklyWindow(day) : null) : undefined;
    }
    // Closing before opening (say "close early" at 8 am) means closed all day.
    return close <= open ? null : { open, close, changed: true };
  }

  if (!day) return undefined;
  if (!day.open) return null;
  return weeklyWindow(day);
}

function weeklyWindow(day: DayHours): DayWindow | null {
  const open = parseClockMinutes(day.from);
  const close = parseClockMinutes(day.to);
  if (Number.isNaN(open) || Number.isNaN(close) || close <= open) return null;
  return { open, close, changed: false };
}

/** Overrides for dates before `todayKey` are dead weight; drop them on save. */
export function pruneOverrides(overrides: HoursOverrides, todayKey: string): HoursOverrides {
  return Object.fromEntries(Object.entries(overrides).filter(([k]) => k >= todayKey));
}
