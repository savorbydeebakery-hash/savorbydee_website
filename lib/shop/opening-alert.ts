/**
 * The one staff alert for everything that came in while the shop was closed
 * (2026-10-30).
 *
 * Preorders are taken around the clock (migration 00054), but staff phones
 * are not buzzed at 2 am: the order API and the five-minute reminder both stay
 * quiet outside opening hours. Instead, once the shop opens, a single push
 * says how many orders and custom cake requests are waiting. Checked every
 * minute by app/api/cron/ack-watchdog.
 */

/** How far back "came in while closed" looks: covers a closed Sunday too. */
export const OPENING_ALERT_LOOKBACK_HOURS = 72;

export function openingAlertDue(args: {
  /** Today's opening window in minutes from midnight IST; null when closed. */
  window: { open: number; close: number } | null | undefined;
  nowMinutes: number;
  sentToday: boolean;
  /** Orders and requests placed before today's opening, still waiting. */
  waiting: number;
}): boolean {
  const { window, nowMinutes, sentToday, waiting } = args;
  if (!window || sentToday || waiting <= 0) return false;
  return nowMinutes >= window.open && nowMinutes < window.close;
}

export function openingAlertText(orders: number, requests: number): { title: string; body: string } {
  const parts: string[] = [];
  if (orders > 0) parts.push(`${orders} order${orders === 1 ? "" : "s"}`);
  if (requests > 0) parts.push(`${requests} custom cake request${requests === 1 ? "" : "s"}`);
  return {
    title: `🌙 ${parts.join(" and ")} came in while we were closed`,
    body:
      orders > 0
        ? "Open Orders → Needs action to check payments and acknowledge them."
        : "Please tell the owner.",
  };
}
