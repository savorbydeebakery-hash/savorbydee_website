"use client";

import { useState, useMemo } from "react";
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

const STATUS_FLOW = [
  "pending",
  "confirmed",
  "paid",
  "in_progress",
  "ready",
  "fulfilled",
];

const statusColors: Record<string, "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral"> = {
  pending: "yellow",
  confirmed: "sky",
  paid: "mint",
  in_progress: "lavender",
  ready: "peach",
  fulfilled: "mint",
  cancelled: "neutral",
};

export default function AdminOrdersPage() {
  const { orders, connected, acknowledgeOrder, updateOrderStatus, setDeliveryFee } = useOrdersRealtime();
  useAlarmClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const unacknowledgedCount = orders.filter((o) => !o.acknowledged_at).length;

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
    const success = await acknowledgeOrder(orderId);
    if (success) {
      window.dispatchEvent(new CustomEvent("savor-order-acknowledged"));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    setSelectedOrder((prev) => (prev?.id === orderId ? { ...prev, status: newStatus } : prev));
  };

  const openDetail = (order: OrderRow) => {
    setSelectedOrder(order);
    setDetailOpen(true);
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
              <th className="px-4 py-3 font-semibold text-ink">Slot</th>
              <th className="px-4 py-3 font-semibold text-ink">Status</th>
              <th className="px-4 py-3 font-semibold text-ink">Ack</th>
              <th className="px-4 py-3 font-semibold text-ink">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-faint">
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
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {formatIst(order.requested_slot, {
                      day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={statusColors[order.status] ?? "neutral"}>
                      {order.status}
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
        title={selectedOrder ? `Order ${selectedOrder.human_id}` : ""}
        size="lg"
      >
        {selectedOrder && (
          <div className="flex flex-col gap-4">
            {/* Status + Ack */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge color={statusColors[selectedOrder.status] ?? "neutral"}>
                  {selectedOrder.status}
                </Badge>
                <Badge color={selectedOrder.payment_status === "paid" ? "mint" : "yellow"}>
                  {selectedOrder.payment_status}
                </Badge>
              </div>
              {!selectedOrder.acknowledged_at ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAcknowledge(selectedOrder.id)}
                >
                  <Bell size={14} /> Acknowledge
                </Button>
              ) : (
                <Badge color="mint">
                  <Check size={12} /> Acknowledged
                </Badge>
              )}
            </div>

            {/* Customer info */}
            <Card>
              <h3 className="font-semibold text-ink mb-3">Customer</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="text-ink-faint" size={16} />
                  <span className="text-ink">{selectedOrder.guest_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="text-ink-faint" size={16} />
                  <a href={`tel:${selectedOrder.guest_phone}`} className="text-ink hover:text-pink">
                    {selectedOrder.guest_phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="text-ink-faint" size={16} />
                  <a href={`mailto:${selectedOrder.guest_email}`} className="text-ink hover:text-pink">
                    {selectedOrder.guest_email}
                  </a>
                </div>
              </div>
            </Card>

            {/* Fulfillment */}
            <Card>
              <h3 className="font-semibold text-ink mb-3">Fulfillment</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="text-ink-faint" size={16} />
                  <span className="text-ink">
                    {formatIstSlot(selectedOrder.requested_slot)} IST
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="text-ink-faint" size={16} />
                  <span className="text-ink capitalize">{selectedOrder.fulfillment}</span>
                </div>
                {selectedOrder.delivery_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 text-ink-faint" size={16} />
                    <span className="text-ink">{selectedOrder.delivery_address}</span>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="mt-2 rounded-lg bg-pink-soft/50 p-2">
                    <span className="text-xs text-ink-faint">Notes: </span>
                    <span className="text-ink">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Delivery charge — only meaningful on delivery orders. Collected
                in cash on arrival, so this is a record of what was quoted
                rather than anything the customer pays online. */}
            {selectedOrder.fulfillment === "delivery" && (
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
                      selectedOrder.delivery_fee_cents == null
                        ? ""
                        : selectedOrder.delivery_fee_cents / 100
                    }
                    placeholder="Not quoted yet"
                    onBlur={async (e) => {
                      const raw = e.target.value.trim();
                      // Empty clears the quote back to "not decided", which is
                      // a different state from a free delivery of zero.
                      const cents = raw === "" ? null : Math.round(parseFloat(raw) * 100);
                      if (cents !== null && (Number.isNaN(cents) || cents < 0)) return;
                      await setDeliveryFee(selectedOrder.id, cents);
                      setSelectedOrder((prev) =>
                        prev && prev.id === selectedOrder.id
                          ? { ...prev, delivery_fee_cents: cents }
                          : prev
                      );
                    }}
                    className="w-40 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
                  />
                  <span className="text-xs text-ink-faint">
                    {selectedOrder.delivery_fee_cents == null
                      ? "not quoted"
                      : selectedOrder.delivery_fee_cents === 0
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
                    onClick={() => handleStatusChange(selectedOrder.id, s)}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedOrder.status === s
                        ? "border-pink bg-pink-soft text-pink"
                        : "border-ink/15 bg-white text-ink-soft hover:border-pink"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, "cancelled")}
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
