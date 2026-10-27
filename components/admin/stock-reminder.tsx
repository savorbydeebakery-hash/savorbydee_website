"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WeeklyHours } from "@/lib/cart/validation";
import { dayWindow, readOverrides } from "@/lib/shop/hours-override";
import { istDateKey } from "@/lib/time/ist";

/**
 * "Today's Stock hasn't been set yet today", on the Dashboard and Orders
 * (2026-10-28). An item with no count can be ordered without limit, so a
 * morning where nobody sets the stock is one where the website can oversell.
 *
 * Shown on days the shop opens (weekly hours, holidays and one-day changes
 * all count) until a save is recorded today (migration 00052). Staff phones
 * also get one push 30 minutes after opening (app/api/cron/ack-watchdog).
 * Says nothing if anything can't be read: a reminder must never block work.
 */
export function StockReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let live = true;
    const supabase = createClient();
    void (async () => {
      const [{ data: last, error }, { data: settings }] = await Promise.all([
        supabase.from("stock_checks").select("saved_at").order("saved_at", { ascending: false }).limit(1),
        supabase.from("site_settings").select("weekly_hours, holidays, hours_overrides").eq("id", 1).maybeSingle(),
      ]);
      if (!live || error) return;
      const today = istDateKey(new Date());
      const setToday = !!last?.[0] && istDateKey(last[0].saved_at) === today;
      const openToday =
        dayWindow(
          today,
          (settings?.weekly_hours as WeeklyHours | null) ?? null,
          new Set((settings?.holidays as string[] | null) ?? []),
          readOverrides(settings?.hours_overrides)
        ) !== null;
      setShow(openToday && !setToday);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!show) return null;
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-yellow bg-yellow-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="flex items-center gap-2 font-semibold text-ink">
          <ClipboardList size={16} /> Today&rsquo;s Stock hasn&rsquo;t been set yet today
        </p>
        <p className="text-sm text-ink-soft">
          Until it is, Today&rsquo;s Menu items without a count can be ordered without limit.
        </p>
      </div>
      <Link
        href="/admin/stock"
        className="inline-flex h-9 items-center justify-center rounded-xl bg-berry px-4 text-sm font-medium text-white hover:opacity-90"
      >
        Set Today&rsquo;s Stock
      </Link>
    </div>
  );
}
