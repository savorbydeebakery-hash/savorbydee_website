"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { describeSelections } from "@/lib/orders/line-summary";
import { describeWriteError } from "@/lib/admin/write-error";
import { useOrdersRealtime } from "@/lib/realtime/use-orders-realtime";
import { useAlarmClient } from "@/lib/alarm/alarm-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatPrice } from "@/lib/cart/math";
import { formatIst, formatIstSlot } from "@/lib/time/ist";
import {
  Bell,
  Check,
  Clock,
  MapPin,
  Phone,
  Mail,
  Package,
  Filter,
  Search,
} from "lucide-react";
import type { OrderRow } from "@/lib/realtime/use-orders-realtime";
import { adminPaymentBadge } from "@/lib/payments/state";
import { OrderPaymentCard } from "@/components/admin/order-payment-card";

// "paid" is no longer offered as an order status. Payment is tracked in its
// own column and set from the Payment card, so a "Paid" status button meant
// staff could mark an order paid without any of the checks there — and the
// two could disagree. Old orders already on "paid" still render correctly.
const STATUS_FLOW = [
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "fulfilled",
];

/** Moving an order into these means the kitchen is spending on it. */
const KITCHEN_STATUSES = new Set(["in_progress", "ready", "fulfilled"]);

const statusColors: Record<string, "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral"> = {
  pending: "yellow",
  confirmed: "sky",
  paid: "mint",
  in_progress: "lavender",
  ready: "peach",
  fulfilled: "mint",
  cancelled: "neutral",
};

interface OrderLine {
  id: string;
  name: string;
  quantity: number;
  selections: unknown;
  unit_price_cents: number;
  line_total_cents: number;
}

/** "in_progress" -> "In progress". Staff were shown the raw database value. */
function statusLabel(status: string): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function AdminOrdersPage() {
  const { orders, connected, acknowledgeOrder, updateOrderStatus, updatePayment, setDeliveryFee } =
    useOrdersRealtime();
  useAlarmClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // What was actually ordered. Loaded when an order is opened: the list is a
  // realtime subscription on `orders` alone, and joining items into it would
  // resend every line of every order on each status change.
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [linesState, setLinesState] = useState<"idle" | "loading" | "error">("idle");
  // A save that was refused. The status buttons and fee box used to update the
  // screen whether or not the database accepted the change.
  const [actionError, setActionError] = useState<string | null>(null);

  const unacknowledgedCount = orders.filter((o) => !o.acknowledged_at).length;

  // The open order, as the realtime list currently has it. selectedOrder is
  // a copy taken when the modal opened; reading through the list means a
  // payment marked by this tab, another staff member, or the customer's
  // "I've paid" shows up without closing and reopening the order.
  const detailOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) ?? selectedOrder
    : null;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          order.human_id.toLowerCase().includes(q) ||
          order.guest_name?.toLowerCase().includes(q) ||
          order.guest_phone?.includes(q)
        );
      }
      return true;
    });
  }, [orders, filterStatus, searchQuery]);

  const handleAcknowledge = async (orderId: string) => {
    setActionError(null);
    const success = await acknowledgeOrder(orderId);
    if (success) {
      window.dispatchEvent(new CustomEvent("savor-order-acknowledged"));
    } else {
      setActionError("Could not acknowledge this order. Reload the page and try again.");
    }
  };

  /**
   * Only moves the order on screen once the database has accepted it. This
   * used to update the modal unconditionally and ignore the result, so a
   * refused change (an expired session, a dropped connection) still showed
   * the new status, and staff could believe an order was marked Ready when it
   * was not.
   */
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActionError(null);

    // Nothing is baked before the money arrives — the checkout and the terms
    // both promise that. Not a hard block: staff may know something the
    // screen doesn't (paid in person, a regular on account).
    const target = orders.find((o) => o.id === orderId) ?? selectedOrder;
    if (target && target.payment_status !== "paid" && KITCHEN_STATUSES.has(newStatus)) {
      const ok = window.confirm(
        `Order ${target.human_id} has NOT been paid. Move it to "${statusLabel(newStatus)}" anyway?`
      );
      if (!ok) return;
    }
    if (target && newStatus === "cancelled") {
      const ok = window.confirm(
        target.payment_status === "paid"
          ? `Cancel ${target.human_id}? It has been PAID, so the customer is owed a refund of ${formatPrice(target.payment_received_cents ?? target.total_cents)}. Today's stock for it goes back on the menu.`
          : `Cancel ${target.human_id}? Tell the customer on WhatsApp. Today's stock for it goes back on the menu.`
      );
      if (!ok) return;
    }

    const success = await updateOrderStatus(orderId, newStatus);
    if (!success) {
      setActionError(`Could not change the status to "${statusLabel(newStatus)}". Nothing was saved.`);
      return;
    }
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));
  };

  const openDetail = async (order: OrderRow) => {
    setSelectedOrder(order);
    setDetailOpen(true);
    setActionError(null);
    setLines([]);
    setLinesState("loading");

    const { data, error } = await createClient()
      .from("order_items")
      .select("id, name, quantity, selections, unit_price_cents, line_total_cents")
      .eq("order_id", order.id)
      .order("id");

    if (error) {
      setLinesState("error");
      setActionError(describeWriteError(error, "the items on this order"));
      return;
    }
    setLines((data as OrderLine[]) ?? []);
    setLinesState("idle");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`flex h-2 w-2 rounded-full ${
                connected ? "bg-mint" : "bg-ink-faint"
              }`}
            />
            <span className="text-xs text-ink-soft">
              {connected ? "Realtime connected" : "Connecting..."}
            </span>
            {unacknowledgedCount > 0 && (
              <Badge color="pink" className="ml-2 animate-pulse">
                {unacknowledgedCount} unacknowledged
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={16} />
          <input
            type="text"
            placeholder="Search by order ID, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-white py-2 pl-9 pr-4 text-sm focus:border-pink focus:outline-none focus:ring-2 focus:ring-pink/20"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={16} className="text-ink-faint" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm focus:border-pink focus:outline-none"
          >
            <option value="all">All Status</option>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders table */}
      <div className="overflow-x-auto rounded-2xl border border-ink/8">
        <table className="w-full text-sm">
          <thead className="bg-pink-soft/50 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-ink">Order ID</th>
              <th className="px-4 py-3 font-semibold text-ink">Customer</th>
              <th className="px-4 py-3 font-semibold text-ink">Total</th>
              <th className="px-4 py-3 font-semibold text-ink">Payment</th>
              <th className="px-4 py-3 font-semibold text-ink">Slot</th>
              <th className="px-4 py-3 font-semibold text-ink">Status</th>
              <th className="px-4 py-3 font-semibold text-ink">Ack</th>
              <th className="px-4 py-3 font-semibold text-ink">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-ink-faint">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-pink-soft/30 transition-colors cursor-pointer ${
                    !order.acknowledged_at ? "bg-yellow-soft/30" : ""
                  }`}
                  onClick={() => openDetail(order)}
                >
                  <td className="px-4 py-3 font-medium text-ink">{order.human_id}</td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{order.guest_name}</div>
                    <div className="text-xs text-ink-faint">{order.guest_phone}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-pink">
                    {formatPrice(order.total_cents)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const pay = adminPaymentBadge(order);
                      return <Badge color={pay.color}>{pay.label}</Badge>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {formatIst(order.requested_slot, {
                      day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusColors[order.status] ?? "neutral"}>
                      {statusLabel(order.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {order.acknowledged_at ? (
                      <Check className="text-mint" size={18} />
                    ) : (
                      <Bell className="text-pink animate-pulse" size={18} />
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {!order.acknowledged_at && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAcknowledge(order.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detailOrder ? `Order ${detailOrder.human_id}` : ""}
        size="lg"
      >
        {detailOrder && (
          <div className="flex flex-col gap-4">
            {/* Status + Ack */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge color={statusColors[detailOrder.status] ?? "neutral"}>
                  {statusLabel(detailOrder.status)}
                </Badge>
                {(() => {
                  const pay = adminPaymentBadge(detailOrder);
                  return <Badge color={pay.color}>{pay.label}</Badge>;
                })()}
              </div>
              {!detailOrder.acknowledged_at ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAcknowledge(detailOrder.id)}
                >
                  <Bell size={14} /> Acknowledge
                </Button>
              ) : (
                <Badge color="mint">
                  <Check size={12} /> Acknowledged
                </Badge>
              )}
            </div>

            {actionError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>
            )}

            {/* What to bake. This panel did not exist: the modal showed who and
                when, and staff had to find the notification email to learn
                what the order actually was. */}
            <Card>
              <h3 className="font-semibold text-ink mb-3">Items</h3>
              {linesState === "loading" ? (
                <p className="text-sm text-ink-soft">Loading items…</p>
              ) : linesState === "error" ? (
                <p className="text-sm text-red-700">The items could not be loaded.</p>
              ) : lines.length === 0 ? (
                <p className="text-sm text-ink-soft">This order has no items recorded.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {lines.map((line) => {
                    const detail = describeSelections(line.selections);
                    return (
                      <div key={line.id} className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-ink">
                            <span className="tabular-nums">{line.quantity}×</span> {line.name}
                          </p>
                          {detail && <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>}
                        </div>
                        <span className="shrink-0 tabular-nums text-ink">
                          {formatPrice(line.line_total_cents)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
                    <span className="font-semibold text-ink">Total</span>
                    <span className="font-bold tabular-nums text-gold-deep">
                      {formatPrice(detailOrder.total_cents)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Payment — keyed on the order and its payment state, so the
                form's typed values reset when either changes underneath it
                (another staff member marking it paid, say). */}
            <OrderPaymentCard
              key={`${detailOrder.id}-${detailOrder.payment_status}`}
              order={detailOrder}
              onUpdate={async (patch) => {
                setActionError(null);
                const result = await updatePayment(detailOrder.id, patch);
                return result;
              }}
            />

            {/* Customer info */}
            <Card>
              <h3 className="font-semibold text-ink mb-3">Customer</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="text-ink-faint" size={16} />
                  <span className="text-ink">{detailOrder.guest_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="text-ink-faint" size={16} />
                  <a href={`tel:${detailOrder.guest_phone}`} className="text-ink hover:text-pink">
                    {detailOrder.guest_phone}
                  </a>
                </div>
                {/* Email is no longer collected, so this only appears on older
                    orders. Unconditional, it rendered a blank mailto: link. */}
                {detailOrder.guest_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="text-ink-faint" size={16} />
                    <a href={`mailto:${detailOrder.guest_email}`} className="text-ink hover:text-pink">
                      {detailOrder.guest_email}
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Fulfillment */}
            <Card>
              <h3 className="font-semibold text-ink mb-3">Fulfillment</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="text-ink-faint" size={16} />
                  <span className="text-ink">
                    {formatIstSlot(detailOrder.requested_slot)} IST
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="text-ink-faint" size={16} />
                  <span className="text-ink capitalize">{detailOrder.fulfillment}</span>
                </div>
                {detailOrder.delivery_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 text-ink-faint" size={16} />
                    <span className="text-ink">{detailOrder.delivery_address}</span>
                  </div>
                )}
                {detailOrder.notes && (
                  <div className="mt-2 rounded-lg bg-pink-soft/50 p-2">
                    <span className="text-xs text-ink-faint">Notes: </span>
                    <span className="text-ink">{detailOrder.notes}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Delivery charge — only meaningful on delivery orders. Collected
                in cash on arrival, so this is a record of what was quoted
                rather than anything the customer pays online. */}
            {detailOrder.fulfillment === "delivery" && (
              <Card>
                <h3 className="font-semibold text-ink mb-1">Delivery Charge</h3>
                <p className="mb-3 text-xs text-ink-soft">
                  Worked out from the distance and collected in cash on
                  delivery. The customer has already paid for the bakes online —
                  this is not added to that payment.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-ink-soft">&#8377;</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    defaultValue={
                      // == null, not === null: before migration 00020 is
                      // applied the column is absent and this is undefined,
                      // which would render defaultValue as NaN.
                      detailOrder.delivery_fee_cents == null
                        ? ""
                        : detailOrder.delivery_fee_cents / 100
                    }
                    placeholder="Not quoted yet"
                    onBlur={async (e) => {
                      const raw = e.target.value.trim();
                      // Empty clears the quote back to "not decided", which is
                      // a different state from a free delivery of zero.
                      const cents = raw === "" ? null : Math.round(parseFloat(raw) * 100);
                      if (cents !== null && (Number.isNaN(cents) || cents < 0)) return;
                      setActionError(null);
                      const saved = await setDeliveryFee(detailOrder.id, cents);
                      if (!saved) {
                        setActionError("Could not save the delivery charge. Nothing was changed.");
                        return;
                      }
                      setSelectedOrder((prev) =>
                        prev && prev.id === detailOrder.id
                          ? { ...prev, delivery_fee_cents: cents }
                          : prev
                      );
                    }}
                    className="w-40 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
                  />
                  <span className="text-xs text-ink-faint">
                    {detailOrder.delivery_fee_cents == null
                      ? "not quoted"
                      : detailOrder.delivery_fee_cents === 0
                        ? "free delivery"
                        : "to collect in cash"}
                  </span>
                </div>
              </Card>
            )}

            {/* Status update */}
            <Card>
              <h3 className="font-semibold text-ink mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(detailOrder.id, s)}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                      detailOrder.status === s
                        ? "border-pink bg-pink-soft text-pink"
                        : "border-ink/15 bg-white text-ink-soft hover:border-pink"
                    }`}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
                <button
                  onClick={() => handleStatusChange(detailOrder.id, "cancelled")}
                  className="rounded-xl border border-red-300 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
