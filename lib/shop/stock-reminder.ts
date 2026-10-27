/**
 * When staff phones get the "Today's Stock isn't set yet" push (2026-10-28).
 *
 * Once a day, 30 minutes after the shop opens (that day's real hours, so an
 * "open late" change moves it), while still open, only if nobody has saved
 * Today's Stock yet and the reminder hasn't already gone. Checked every
 * minute by app/api/cron/ack-watchdog.
 */
export const STOCK_REMINDER_AFTER_OPEN_MIN = 30;

export function stockReminderDue(args: {
  /** Today's opening window in minutes from midnight IST; null when closed. */
  window: { open: number; close: number } | null | undefined;
  nowMinutes: number;
  setToday: boolean;
  remindedToday: boolean;
}): boolean {
  const { window, nowMinutes, setToday, remindedToday } = args;
  if (!window || setToday || remindedToday) return false;
  return nowMinutes >= window.open + STOCK_REMINDER_AFTER_OPEN_MIN && nowMinutes < window.close;
}
