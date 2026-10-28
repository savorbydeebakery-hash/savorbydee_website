"use client";

import { useMemo, useState } from "react";
import { Bell, Check, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart/math";
import { IST_OFFSET, formatIst, istDateKey } from "@/lib/time/ist";
import { adminPaymentBadge } from "@/lib/payments/state";
import { addDays, groupOrders, viewCounts, type OrderGroup, type OrderView } from "@/lib/orders/by-day";
import type { OrderRow } from "@/lib/realtime/use-orders-realtime";

type BadgeColor = "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral";

const TABS: { view: Exclude<OrderView, "day">; label: string }[] = [
  { view: "attention", label: "Needs action" },
  { view: "today", label: "Today" },
  { view: "tomorrow", label: "Tomorrow" },
  { view: "upcoming", label: "Upcoming" },
  { view: "past", label: "Past" },
  { view: "all", label: "All" },
];

const EMPTY: Record<OrderView, string> = {
  attention: "Nothing needs action. Every order is acknowledged and every payment checked.",
  today: "No pickups or deliveries today.",
  tomorrow: "Nothing booked for tomorrow yet.",
  upcoming: "Nothing booked after tomorrow yet.",
  past: "No past orders.",
  all: "No orders yet.",
  day: "Nothing booked for that day.",
};

/**
 * The Orders list, grouped by the day each order is picked up or delivered
 * (rules in lib/orders/by-day.ts). Each day is its own block with a heading
 * and a summary, spaced apart, so days can't run into each other. A table on
 * a laptop; cards on a phone, so nothing scrolls sideways.
 */
export function OrdersByDay({
  orders,
  searching,
  onOpen,
  onAcknowledge,
  statusLabel,
  statusColors,
}: {
  orders: OrderRow[];
  /** A search is typed: show matches from every day. */
  searching: boolean;
  onOpen: (order: OrderRow) => void;
  onAcknowledge: (orderId: string) => void;
  statusLabel: (s: string) => string;
  statusColors: Record<string, BadgeColor>;
}) {
  const [view, setView] = useState<OrderView>("today");
  const [dayKey, setDayKey] = useState("");
  const todayKey = istDateKey(new Date());
  const shown: OrderView = searching ? "all" : view;

  const counts = useMemo(() => viewCounts(orders, todayKey), [orders, todayKey]);
  const groups = useMemo(
    () => groupOrders(orders, shown, { todayKey, dayKey }),
    [orders, shown, todayKey, dayKey]
  );

  const heading = (g: OrderGroup<OrderRow>) => {
    if (g.key === "attention") return "Needs action";
    const label = formatIst(new Date(`${g.key}T12:00:00${IST_OFFSET}`), { weekday: "long", day: "numeric", month: "short" });
    if (g.key === todayKey) return `Today · ${label}`;
    if (g.key === addDays(todayKey, 1)) return `Tomorrow · ${label}`;
    return label;
  };

  const summary = (g: OrderGroup<OrderRow>) => {
    const parts = [`${g.active} order${g.active === 1 ? "" : "s"}`];
    if (g.key !== "attention") {
      if (g.pickups) parts.push(`${g.pickups} pickup${g.pickups === 1 ? "" : "s"}`);
      if (g.deliveries) parts.push(`${g.deliveries} deliver${g.deliveries === 1 ? "y" : "ies"}`);
    }
    if (g.totalCents) parts.push(formatPrice(g.totalCents));
    return parts.join(" · ");
  };

  // In a single-day block the date is in the heading, so rows show the time;
  // "Needs action" mixes days, so it shows both.
  const when = (o: OrderRow, withDate: boolean) =>
    formatIst(o.requested_slot, withDate ? { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { hour: "numeric", minute: "2-digit" });

  return (
    <div>
      {/* Tabs */}
      {!searching && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const active = view === t.view;
            const n = counts[t.view];
            return (
              <button
                key={t.view}
                type="button"
                onClick={() => { setView(t.view); setDayKey(""); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "border-berry bg-berry text-white" : "border-ink/15 bg-white text-ink hover:border-ink/30"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    t.view === "attention" && n > 0
                      ? "bg-red-500 text-white"
                      : active
                        ? "bg-white/25 text-white"
                        : "bg-ink/5 text-ink-soft"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
          <label className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${view === "day" ? "border-berry" : "border-ink/15"} bg-white`}>
            <CalendarDays size={14} className="text-ink-soft" />
            <span className="sr-only">Pick a day</span>
            <input
              type="date"
              value={dayKey}
              onChange={(e) => { setDayKey(e.target.value); setView(e.target.value ? "day" : "today"); }}
              className="bg-transparent text-sm text-ink focus:outline-none"
              aria-label="Pick a day"
            />
          </label>
        </div>
      )}
      {searching && <p className="mb-4 text-sm text-ink-soft">Showing matches from every day.</p>}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm text-ink-faint">
          {searching ? "No orders match that search." : EMPTY[shown]}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((g) => {
            const withDate = g.key === "attention";
            return (
              <section key={g.key} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
                <header className={`flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/8 px-4 py-3 ${g.key === todayKey ? "bg-pink-soft/60" : g.key === "attention" ? "bg-yellow-soft/60" : "bg-ink/[0.03]"}`}>
                  <h2 className="text-base font-bold text-ink">{heading(g)}</h2>
                  <p className="text-sm text-ink-soft">{summary(g)}</p>
                </header>

                {/* Laptop: a table per day */}
                <table className="hidden w-full text-sm sm:table">
                  <thead className="text-left text-xs uppercase tracking-wide text-ink-faint">
                    <tr>
                      <th className="px-4 py-2 font-medium">{withDate ? "When" : "Time"}</th>
                      <th className="px-4 py-2 font-medium">Order</th>
                      <th className="px-4 py-2 font-medium">Customer</th>
                      <th className="px-4 py-2 font-medium">Total</th>
                      <th className="px-4 py-2 font-medium">Payment</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium"><span className="sr-only">Acknowledge</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {g.orders.map((o) => {
                      const pay = adminPaymentBadge(o);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => onOpen(o)}
                          className={`cursor-pointer transition-colors hover:bg-pink-soft/30 ${!o.acknowledged_at ? "bg-yellow-soft/30" : ""} ${o.status === "cancelled" ? "opacity-50" : ""}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                            {when(o, withDate)}
                            <div className="text-xs font-normal text-ink-faint">{o.fulfillment === "delivery" ? "Delivery" : "Pickup"}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-ink">{o.human_id}</td>
                          <td className="px-4 py-3">
                            <div className="text-ink">{o.guest_name}</div>
                            <div className="text-xs text-ink-faint">{o.guest_phone}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink">{formatPrice(o.total_cents)}</td>
                          <td className="px-4 py-3"><Badge color={pay.color}>{pay.label}</Badge></td>
                          <td className="px-4 py-3"><Badge color={statusColors[o.status] ?? "neutral"}>{statusLabel(o.status)}</Badge></td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {o.acknowledged_at ? (
                              <Check className="ml-auto text-mint" size={18} aria-label="Acknowledged" />
                            ) : (
                              <Button size="sm" variant="primary" onClick={() => onAcknowledge(o.id)}>
                                <Bell size={14} /> Acknowledge
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Phone: a card per order */}
                <ul className="divide-y divide-ink/8 sm:hidden">
                  {g.orders.map((o) => {
                    const pay = adminPaymentBadge(o);
                    return (
                      <li
                        key={o.id}
                        onClick={() => onOpen(o)}
                        className={`cursor-pointer px-4 py-3 active:bg-pink-soft/40 ${!o.acknowledged_at ? "bg-yellow-soft/30" : ""} ${o.status === "cancelled" ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">
                              {when(o, withDate)} · {o.fulfillment === "delivery" ? "Delivery" : "Pickup"}
                            </p>
                            <p className="text-sm text-ink">{o.guest_name} <span className="text-ink-faint">· {o.human_id}</span></p>
                          </div>
                          <p className="font-semibold text-ink">{formatPrice(o.total_cents)}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge color={pay.color}>{pay.label}</Badge>
                          <Badge color={statusColors[o.status] ?? "neutral"}>{statusLabel(o.status)}</Badge>
                          {!o.acknowledged_at && (
                            <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="primary" onClick={() => onAcknowledge(o.id)}>
                                <Bell size={14} /> Acknowledge
                              </Button>
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
