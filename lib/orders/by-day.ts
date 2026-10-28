import { IST_OFFSET, istDateKey } from "@/lib/time/ist";
import { paymentStage, type PaymentStageInput } from "@/lib/payments/state";

/**
 * How the admin Orders page groups orders (2026-10-28, client request: "the
 * orders separated by date").
 *
 * Orders are grouped by the day they are picked up or delivered, not the day
 * they were placed: that is the day the kitchen has to act. Tabs:
 *
 *   attention  anything waiting on staff, whatever the day (not acknowledged,
 *              "says paid · check bank", unpaid and overdue, cancelled after
 *              paying so a refund is due)
 *   today      today's pickups and deliveries, in time order — the run sheet
 *   tomorrow   the same for tomorrow, for planning the bake
 *   upcoming   after tomorrow, one heading per day
 *   past       before today, newest day first
 *   all        everything
 *   day        one chosen date ("Pick a day")
 */

export type OrderView = "attention" | "today" | "tomorrow" | "upcoming" | "past" | "all" | "day";

export interface DayOrder extends PaymentStageInput {
  id: string;
  requested_slot: string;
  created_at: string;
  acknowledged_at: string | null;
  fulfillment: string;
  total_cents: number;
}

export interface OrderGroup<T> {
  /** IST date key, or "attention" / "all". */
  key: string;
  orders: T[];
  /** Orders that will actually be made (cancelled ones left out). */
  active: number;
  pickups: number;
  deliveries: number;
  totalCents: number;
}

/** The IST date an order is picked up or delivered. */
export const slotDay = (o: { requested_slot: string }) => istDateKey(o.requested_slot);

export const addDays = (key: string, n: number) =>
  istDateKey(new Date(`${key}T12:00:00${IST_OFFSET}`).getTime() + n * 86_400_000);

/** Waiting on staff right now, whatever day it's for. */
export function needsAction(o: DayOrder, now: number = Date.now()): boolean {
  if (o.status === "cancelled") return o.payment_status === "paid"; // refund due
  if (!o.acknowledged_at) return true;
  const stage = paymentStage(o, now);
  return stage === "checking" || stage === "overdue";
}

function inView(o: DayOrder, view: OrderView, todayKey: string, dayKey: string | undefined, now: number): boolean {
  const d = slotDay(o);
  switch (view) {
    case "attention":
      return needsAction(o, now);
    case "today":
      return d === todayKey;
    case "tomorrow":
      return d === addDays(todayKey, 1);
    case "upcoming":
      return d > addDays(todayKey, 1);
    case "past":
      return d < todayKey;
    case "day":
      return !!dayKey && d === dayKey;
    case "all":
      return true;
  }
}

function summarise<T extends DayOrder>(key: string, orders: T[]): OrderGroup<T> {
  const live = orders.filter((o) => o.status !== "cancelled");
  return {
    key,
    orders,
    active: live.length,
    pickups: live.filter((o) => o.fulfillment !== "delivery").length,
    deliveries: live.filter((o) => o.fulfillment === "delivery").length,
    totalCents: live.reduce((sum, o) => sum + o.total_cents, 0),
  };
}

/** Within a day: by time, with cancelled orders at the bottom. */
const byTime = (a: DayOrder, b: DayOrder) =>
  Number(a.status === "cancelled") - Number(b.status === "cancelled") ||
  Date.parse(a.requested_slot) - Date.parse(b.requested_slot);

export function groupOrders<T extends DayOrder>(
  orders: T[],
  view: OrderView,
  opts: { todayKey: string; dayKey?: string; now?: number }
): OrderGroup<T>[] {
  const now = opts.now ?? Date.now();
  const picked = orders.filter((o) => inView(o, view, opts.todayKey, opts.dayKey, now));

  // Needing action is one list, newest first: what came in last is what
  // most likely still needs someone.
  if (view === "attention") {
    return picked.length
      ? [summarise("attention", [...picked].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)))]
      : [];
  }

  const days = new Map<string, T[]>();
  for (const o of picked) {
    const d = slotDay(o);
    if (!days.has(d)) days.set(d, []);
    days.get(d)!.push(o);
  }
  const keys = [...days.keys()].sort();
  if (view === "past" || view === "all") keys.reverse();
  return keys.map((k) => summarise(k, days.get(k)!.sort(byTime)));
}

/** The number on each tab: orders that will actually be made, or that need action. */
export function viewCounts(orders: DayOrder[], todayKey: string, now: number = Date.now()): Record<Exclude<OrderView, "day">, number> {
  const count = (view: OrderView) =>
    orders.filter((o) => inView(o, view, todayKey, undefined, now) && (view === "attention" || o.status !== "cancelled")).length;
  return {
    attention: count("attention"),
    today: count("today"),
    tomorrow: count("tomorrow"),
    upcoming: count("upcoming"),
    past: count("past"),
    all: orders.length,
  };
}
