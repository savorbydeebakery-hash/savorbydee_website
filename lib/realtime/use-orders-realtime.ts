"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
export function useOrdersRealtime() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initial fetch
  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setOrders(data as OrderRow[]);
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
          // Trigger alarm via custom event
          window.dispatchEvent(
            new CustomEvent("savor-new-order", { detail: newOrder })
          );
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

    return () => {
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
    refresh: fetchOrders,
  };
}
