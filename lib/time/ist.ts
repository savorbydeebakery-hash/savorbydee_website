/**
 * Every time this bakery cares about is India Standard Time.
 *
 * Two things were being conflated before this module existed:
 *
 * 1. The checkout's `datetime-local` input hands back a *naive* wall-clock
 *    string — "2026-09-01T06:07", no zone. `new Date()` resolves a naive
 *    string against the runtime's local zone, and Cloudflare Workers run in
 *    UTC, so a slot the customer picked as 06:07 IST was stored as
 *    06:07Z — 5h30m late. The order API's notice guard compared that same
 *    inflated instant against `Date.now()`, so it under-enforced the notice
 *    window by 5.5 hours: exactly backwards for a rule that exists to stop
 *    the kitchen being handed an order it cannot physically bake in time.
 *
 * 2. `toLocaleString("en-IN", ...)` sets the *locale*, not the zone. Without
 *    an explicit `timeZone` it renders in whatever zone the code is running
 *    in — the viewer's browser on a client component, UTC on the server. The
 *    order confirmation emails are rendered server-side, so customers were
 *    being emailed UTC times labelled as their slot.
 *
 * The rule enforced here: a wall-clock string from a picker is always read as
 * IST regardless of the browser's zone, and a stored instant is always
 * rendered in IST. A customer travelling, or on a device with the wrong zone
 * set, gets the slot they actually saw on the screen.
 *
 * A fixed +05:30 is safe rather than lazy: India has observed no DST since
 * 1945 and the offset has not moved since 1955, so there is no transition for
 * an offset-aware library to handle. `timeZone: "Asia/Kolkata"` is still used
 * for *formatting*, because that is what Intl wants.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";
export const IST_OFFSET = "+05:30";
export const IST_OFFSET_MINUTES = 330;

const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60_000;

/** "2026-09-01T06:07" or "2026-09-01T06:07:00" — a wall clock with no zone. */
const NAIVE_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}))?$/;

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Read a picker value as IST and return the real instant it denotes.
 *
 * A value that already carries a zone (a trailing `Z` or `±HH:MM`) is an
 * instant already and is passed through untouched, so an API client that
 * sends a proper ISO timestamp is not silently shifted by 5h30m.
 *
 * Returns null on anything unparseable — callers reject rather than store a
 * guess.
 */
export function istInputToInstant(value: string | null | undefined): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const naive = NAIVE_LOCAL.exec(trimmed);
  if (naive) {
    const seconds = naive[6] ? "" : ":00";
    return toDate(`${trimmed}${seconds}${IST_OFFSET}`);
  }

  return toDate(trimmed);
}

/**
 * The inverse: an instant → the "YYYY-MM-DDTHH:mm" a `datetime-local` input
 * wants, expressed in IST.
 *
 * Shifting the epoch and then reading the UTC fields is exact for a fixed
 * offset, and avoids `Intl` formatting round-trips that vary by locale.
 */
export function instantToIstInput(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16);
}

/** "YYYY-MM-DD" for the IST calendar day an instant falls on. */
export function istDateKey(value: string | number | Date | null | undefined): string {
  return instantToIstInput(value).slice(0, 10);
}

/** The `min` for a slot picker: now + `hours`, as an IST wall clock. */
export function istInputAfterHours(hours: number, from: Date = new Date()): string {
  return instantToIstInput(from.getTime() + hours * 3_600_000);
}

/**
 * Format an instant in IST. Same signature as `toLocaleString`, with the zone
 * pinned — use this everywhere instead of a bare `toLocaleString("en-IN")`.
 * Passing only time fields renders only the time, so this covers what
 * `toLocaleTimeString`/`toLocaleDateString` were doing too.
 */
export function formatIst(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleString("en-IN", { ...options, timeZone: IST_TIME_ZONE });
}

/** Day and time together, the format order cards and emails use. */
export function formatIstSlot(value: string | number | Date | null | undefined): string {
  return formatIst(value, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date only, in the dd/mm/yyyy order en-IN uses. */
export function formatIstDate(value: string | number | Date | null | undefined): string {
  return formatIst(value, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Clock time only. */
export function formatIstTime(value: string | number | Date | null | undefined): string {
  return formatIst(value, { hour: "2-digit", minute: "2-digit" });
}

/**
 * The half-open [start, end) instants bounding the IST calendar day that
 * `from` falls in. The admin dashboard filtered on `toISOString().split("T")`,
 * which bounds the *UTC* day — so its "today" began at 05:30 IST and dropped
 * every slot before that.
 */
export function istDayBounds(from: Date = new Date()): { start: string; end: string } {
  const start = new Date(`${istDateKey(from)}T00:00:00${IST_OFFSET}`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 86_400_000).toISOString(),
  };
}

/**
 * yy/mm/dd of the IST calendar day, for the SAV-YYMMDD-NNNN order id. Built
 * from UTC fields before this, so an order placed between midnight and
 * 05:30 IST was stamped with the previous day.
 */
export function istDateParts(from: Date = new Date()): { yy: string; mm: string; dd: string } {
  const key = istDateKey(from);
  return { yy: key.slice(2, 4), mm: key.slice(5, 7), dd: key.slice(8, 10) };
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Lowercase weekday in IST — the key shape `site_settings.weekly_hours` uses. */
export function istDayName(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return DAY_NAMES[new Date(d.getTime() + IST_OFFSET_MS).getUTCDay()];
}

/** Minutes since IST midnight, for comparing against "09:00"/"21:00" strings. */
export function istMinutesOfDay(value: string | number | Date | null | undefined): number {
  const input = instantToIstInput(value);
  if (!input) return NaN;
  return Number(input.slice(11, 13)) * 60 + Number(input.slice(14, 16));
}

/** "09:00" → 540. NaN if malformed, so callers can skip a broken setting. */
export function parseClockMinutes(clock: string | null | undefined): number {
  if (typeof clock !== "string") return NaN;
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}
