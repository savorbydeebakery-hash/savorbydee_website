"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { E2E_FIXTURE_NAMES } from "@/lib/orders/ack-reminder";

export interface OrderRow {
  id: string;
  human_id: string;
  status: string;
  fulfillment: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  delivery_address: string | null;
  requested_slot: string;
  payment_status: string;
  total_cents: number;
  /** Cash-on-delivery charge quoted by staff. null = not quoted yet. */
  delivery_fee_cents: number | null;
  /** Manual UPI payment tracking — migration 00045. */
  payment_method?: string | null;
  payment_due_at?: string | null;
  payment_claimed_at?: string | null;
  payment_reference?: string | null;
  payment_received_cents?: number | null;
  payment_verified_at?: string | null;
  payment_note?: string | null;
  acknowledged_at: string | null;
  staff_email_sent_at: string | null;
  created_at: string;
  notes: string | null;
}

/**
 * T4.1: Supabase Realtime Broadcast subscription for admin tabs.
 * Subscribes to postgres_changes on the orders table.
 * Auto-reconnects on disconnect. Returns live order list + new order callback.
 */
/** A pending order nobody has acknowledged, placed within the last `withinMs`. */
function isFreshUnacknowledged(o: OrderRow, withinMs: number): boolean {
  return (
    !o.acknowledged_at &&
    o.status === "pending" &&
    Date.now() - Date.parse(o.created_at) < withinMs
  );
}

/**
 * Tells the alarm (lib/alarm/alarm-client.ts) to ring for this order. Never
 * for the daily E2E run's fixture orders, placed at 11:00 and deleted
 * minutes later: staff kept hearing an alarm for an order that vanished.
 */
function announceNewOrder(o: OrderRow) {
  if (o.guest_name && E2E_FIXTURE_NAMES.includes(o.guest_name)) return;
  window.dispatchEvent(new CustomEvent("savor-new-order", { detail: o }));
}

export function useOrdersRealtime() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Every order this page has already seen, so each new one rings once,
  // whichever way it arrives. null until the first load.
  const knownIdsRef = useRef<Set<string> | null>(null);

  /**
   * Fetches the list, and rings for orders the page has not seen before.
   *
   * The alarm used to ring only for an order the realtime feed delivered at
   * the moment it was placed. A phone drops that feed whenever the screen
   * locks, and the 15-second refresh that picked missed orders up added them
   * silently — so on phones a new order often never rang (client demo,
   * 2026-10-27). Now the refresh rings too, and the page refreshes the
   * instant the phone wakes or the tab comes back.
   */
  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      const rows = data as OrderRow[];
      const known = knownIdsRef.current;
      if (known) {
        for (const o of rows) {
          if (known.has(o.id)) continue;
          known.add(o.id);
          if (isFreshUnacknowledged(o, 2 * 3600_000)) announceNewOrder(o);
        }
      } else {
        knownIdsRef.current = new Set(rows.map((o) => o.id));
        // Opening Orders with a new order still waiting (say the phone was
        // asleep when it came in) rings for the newest one.
        const waiting = rows.find((o) => isFreshUnacknowledged(o, 15 * 60_000));
        if (waiting) announceNewOrder(waiting);
      }
      setOrders(rows);
    }
  }, []);

  // Acknowledge an order
  const acknowledgeOrder = useCallback(async (orderId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("orders")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id ?? null,
      })
      .eq("id", orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, acknowledged_at: new Date().toISOString() }
            : o
        )
      );
    }
    return !error;
  }, []);

  // Update order status
  /**
   * Records the distance-based delivery charge. Deliberately a separate column
   * from total_cents: that value is what Razorpay captured for the bakes, and
   * editing it after payment would leave the order record disagreeing with the
   * money actually taken.
   */
  const setDeliveryFee = useCallback(
    async (orderId: string, feeCents: number | null) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("orders")
        .update({ delivery_fee_cents: feeCents })
        .eq("id", orderId);

      if (!error) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, delivery_fee_cents: feeCents } : o))
        );
      }
      return !error;
    },
    []
  );

  /**
   * Payment changes: mark paid, not found, refunded, or undo. Returns the
   * database's reason on refusal, because the refusals here are meaningful —
   * a UTR already used on another order, a missing amount — and "could not
   * save" would hide exactly the thing staff need to know.
   *
   * The verified-at / verified-by stamps are written by the database trigger
   * (migration 00045), so they are read back rather than set here.
   */
  const updatePayment = useCallback(
    async (orderId: string, patch: Partial<OrderRow>): Promise<{ ok: true } | { ok: false; error: string }> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", orderId)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return {
            ok: false,
            error:
              "That UPI transaction ID is already recorded on another order. One payment can only pay for one order — check the ID, or search the orders list for it.",
          };
        }
        return { ok: false, error: error.message || "Could not save. Nothing was changed." };
      }

      setOrders((prev) => prev.map((o) => (o.id === orderId ? (data as OrderRow) : o)));
      return { ok: true };
    },
    []
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (!error) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
      }
      return !error;
    },
    []
  );

  useEffect(() => {
    const timerId = setTimeout(() => { void fetchOrders(); }, 0);

    // Polling fallback: re-fetch periodically so new orders appear even if
    // the realtime channel is slow or disconnected.
    const pollId = setInterval(() => { void fetchOrders(); }, 15_000);

    const supabase = createClient();
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as OrderRow;
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          // Ring, unless a refresh already rang for it.
          const known = (knownIdsRef.current ??= new Set());
          if (!known.has(newOrder.id)) {
            known.add(newOrder.id);
            announceNewOrder(newOrder);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as OrderRow;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        (payload) => {
          const deleted = payload.old as { id: string };
          setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Catch up the moment the phone wakes, the tab comes back, or the
    // connection returns: timers are frozen while a phone sleeps.
    const catchUp = () => {
      if (document.visibilityState === "visible") void fetchOrders();
    };
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    window.addEventListener("pageshow", catchUp);

    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
      window.removeEventListener("pageshow", catchUp);
      clearTimeout(timerId);
      clearInterval(pollId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchOrders]);

  return {
    orders,
    connected,
    acknowledgeOrder,
    updateOrderStatus,
    updatePayment,
    setDeliveryFee,
    refresh: fetchOrders,
  };
}
