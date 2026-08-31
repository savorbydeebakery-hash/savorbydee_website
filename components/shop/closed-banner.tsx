"use client";

import { Clock } from "lucide-react";
import { useShopStatus, closedMessage } from "@/components/shop/shop-status";

/**
 * The "we are shut" notice, in the shape food-delivery apps use and the client
 * pointed at: a hard CLOSED label, then one plain sentence saying when the
 * bakery is back. Nothing is hidden behind it — the menu below stays readable,
 * just greyed and un-orderable.
 *
 * Renders nothing while the shop is open, and nothing for the daily-menu
 * cutoff either: that one only affects a subset of items, so it is said on the
 * items themselves rather than as a page-wide banner that would wrongly imply
 * the whole bakery had shut.
 */
export function ClosedBanner() {
  const status = useShopStatus();
  if (status.isOpen) return null;

  return (
    <div
      role="status"
      className="border-b border-bk-border bg-bk-pink-soft px-4 py-3 md:px-6"
      data-testid="shop-closed-banner"
    >
      <div className="mx-auto flex w-full max-w-[var(--bk-page-width)] flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-[var(--bk-r-sm)] bg-bk-maroon px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          <Clock size={12} aria-hidden="true" /> Currently closed
        </span>
        <p className="text-sm text-bk-fg">
          Not accepting orders at the moment. {closedMessage(status)}
        </p>
      </div>
    </div>
  );
}
