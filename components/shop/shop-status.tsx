"use client";

import { createContext, useContext } from "react";
import { formatIstSlot } from "@/lib/time/ist";
import type { ClosedReason } from "@/lib/shop/open-state";

/**
 * Whether the bakery is currently taking orders, shared with every card and
 * modal on the page.
 *
 * The client's rule: outside business hours the menu stays readable but is
 * greyed out and cannot be added to the cart. A context rather than prop
 * drilling because the cards sit four levels down from the pages that know
 * the answer, and the item modal is opened from three different places.
 *
 * Computed on the server per request (every page is force-dynamic), so it is
 * correct on load. It does not tick over while a tab sits open — the order API
 * enforces the same rule, so a stale tab gets a clear refusal rather than a
 * booking the kitchen never sees.
 */
export interface ShopStatus {
  /** Within business hours today. */
  isOpen: boolean;
  /** Open AND before the daily-menu cutoff (8:30pm). */
  dailyMenuOpen: boolean;
  /** ISO instant the bakery next opens, or null. */
  nextOpenIso: string | null;
  reason: ClosedReason;
}

const FALLBACK: ShopStatus = {
  isOpen: true,
  dailyMenuOpen: true,
  nextOpenIso: null,
  reason: "open",
};

const ShopStatusContext = createContext<ShopStatus>(FALLBACK);

export function ShopStatusProvider({
  value,
  children,
}: {
  value: ShopStatus;
  children: React.ReactNode;
}) {
  return <ShopStatusContext.Provider value={value}>{children}</ShopStatusContext.Provider>;
}

export function useShopStatus(): ShopStatus {
  return useContext(ShopStatusContext);
}

/**
 * Can this specific item be ordered right now?
 *
 * Two separate gates. The shop being shut blocks everything. The daily-menu
 * cutoff blocks only items flagged `daily_menu` — those are the ready-made
 * bakes that have to be handed over before closing, whereas a preorder is
 * being baked another day anyway.
 */
export function useCanOrder(item: { daily_menu?: boolean } | null | undefined): {
  canOrder: boolean;
  message: string | null;
} {
  const status = useShopStatus();

  if (!status.isOpen) {
    return { canOrder: false, message: closedMessage(status) };
  }

  if (item?.daily_menu && !status.dailyMenuOpen) {
    return {
      canOrder: false,
      message: "Today's menu has closed for the evening. It reopens at 9:00 am tomorrow.",
    };
  }

  return { canOrder: true, message: null };
}

/** The sentence shown to a customer who arrives outside business hours. */
export function closedMessage(status: ShopStatus): string {
  const back = status.nextOpenIso
    ? `We are back ${formatIstSlot(status.nextOpenIso)} IST.`
    : "We are back during business hours.";

  switch (status.reason) {
    case "closed-day":
      return `We are closed today. ${back}`;
    case "holiday":
      return `We are closed for the day. ${back}`;
    case "before-open":
      return `We are not open just yet. ${back}`;
    default:
      return `We are closed for the evening — back fresh and early tomorrow. ${back}`;
  }
}
