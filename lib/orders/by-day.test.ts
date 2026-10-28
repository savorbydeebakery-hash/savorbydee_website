import { describe, it, expect } from "vitest";
import { groupOrders, needsAction, viewCounts, type DayOrder } from "./by-day";

const NOW = Date.parse("2026-10-28T06:00:00Z"); // 11:30 am IST, Wed 28 Oct
const TODAY = "2026-10-28";
let n = 0;
const o = (slot: string, over: Partial<DayOrder> = {}): DayOrder => ({
  id: `o${++n}`,
  requested_slot: new Date(`${slot}+05:30`).toISOString(),
  created_at: new Date(NOW - 3600e3).toISOString(),
  acknowledged_at: new Date(NOW - 3000e3).toISOString(),
  fulfillment: "pickup",
  total_cents: 50000,
  status: "confirmed",
  payment_status: "paid",
  payment_due_at: null,
  ...over,
});

describe("groupOrders", () => {
  const orders = [
    o("2026-10-28T16:00:00"),
    o("2026-10-28T10:00:00", { fulfillment: "delivery" }),
    o("2026-10-28T09:00:00", { status: "cancelled", payment_status: "refunded" }),
    o("2026-10-29T12:00:00"),
    o("2026-10-31T12:00:00"),
    o("2026-10-30T12:00:00"),
    o("2026-10-27T12:00:00", { status: "fulfilled" }),
    o("2026-10-25T12:00:00", { status: "fulfilled" }),
  ];

  it("Today is the day's run sheet: by time, cancelled last, with a summary", () => {
    const [g, ...rest] = groupOrders(orders, "today", { todayKey: TODAY, now: NOW });
    expect(rest).toHaveLength(0);
    expect(g.key).toBe(TODAY);
    expect(g.orders.map((x) => new Date(x.requested_slot).getUTCHours())).toEqual([4, 10, 3]); // 10:00, 16:00 IST, cancelled 09:00 last
    expect(g).toMatchObject({ active: 2, pickups: 1, deliveries: 1, totalCents: 100000 });
  });

  it("Tomorrow, Upcoming (day by day, soonest first) and Past (newest first)", () => {
    expect(groupOrders(orders, "tomorrow", { todayKey: TODAY, now: NOW }).map((g) => g.key)).toEqual(["2026-10-29"]);
    expect(groupOrders(orders, "upcoming", { todayKey: TODAY, now: NOW }).map((g) => g.key)).toEqual(["2026-10-30", "2026-10-31"]);
    expect(groupOrders(orders, "past", { todayKey: TODAY, now: NOW }).map((g) => g.key)).toEqual(["2026-10-27", "2026-10-25"]);
  });

  it("Pick a day shows just that date", () => {
    expect(groupOrders(orders, "day", { todayKey: TODAY, dayKey: "2026-10-30", now: NOW }).map((g) => g.key)).toEqual(["2026-10-30"]);
  });
});

describe("needs action", () => {
  it("not acknowledged, says paid, overdue, or a refund due — whatever the day", () => {
    expect(needsAction(o("2026-11-05T12:00:00", { acknowledged_at: null }), NOW)).toBe(true);
    expect(needsAction(o("2026-11-05T12:00:00", { payment_status: "pending" }), NOW)).toBe(true); // says paid
    expect(needsAction(o("2026-11-05T12:00:00", { payment_status: "unpaid", status: "pending", payment_due_at: new Date(NOW - 60e3).toISOString() }), NOW)).toBe(true); // overdue
    expect(needsAction(o("2026-10-20T12:00:00", { status: "cancelled", payment_status: "paid" }), NOW)).toBe(true); // refund due
  });
  it("not a paid, acknowledged order, or one still inside its payment window", () => {
    expect(needsAction(o("2026-10-28T16:00:00"), NOW)).toBe(false);
    expect(needsAction(o("2026-10-28T16:00:00", { payment_status: "unpaid", status: "pending", payment_due_at: new Date(NOW + 600e3).toISOString() }), NOW)).toBe(false);
    expect(needsAction(o("2026-10-28T16:00:00", { status: "cancelled", payment_status: "refunded" }), NOW)).toBe(false);
  });
  it("tab counts leave cancelled orders out", () => {
    const c = viewCounts([o("2026-10-28T10:00:00"), o("2026-10-28T11:00:00", { status: "cancelled", payment_status: "refunded" }), o("2026-10-29T10:00:00", { acknowledged_at: null })], TODAY, NOW);
    expect(c).toMatchObject({ today: 1, tomorrow: 1, attention: 1, all: 3 });
  });
});
