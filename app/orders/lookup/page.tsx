"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/cart/math";
import { Search, Package, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { formatIstSlot } from "@/lib/time/ist";

interface OrderData {
  id: string;
  human_id: string;
  status: string;
  fulfillment: string;
  guest_name: string;
  requested_slot: string;
  payment_status: string;
  total_cents: number;
  delivery_address: string | null;
  order_items: {
    name: string;
    quantity: number;
    line_total_cents: number;
  }[];
}

export default function FindMyOrderPage() {
  const [humanId, setHumanId] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanId || !phone) {
      setError("Both fields are required");
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const params = new URLSearchParams({ id: humanId, phone });
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Order not found");
      }
      const data = (await res.json()) as { order: OrderData };
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, "pink" | "mint" | "lavender" | "peach" | "sky" | "yellow" | "neutral"> = {
    pending: "yellow",
    confirmed: "sky",
    paid: "mint",
    in_progress: "lavender",
    ready: "peach",
    fulfilled: "mint",
    cancelled: "neutral",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center mb-8">
        <Search className="mx-auto mb-4 text-berry" size={40} />
        <h1 className="text-h1 text-ink mb-2">Find My Order</h1>
        <p className="text-ink-soft">
Enter your order number and the phone number you ordered with.
        </p>
      </div>

      {/* Search form */}
      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <Input
            label="Order ID"
            value={humanId}
            onChange={(e) => setHumanId(e.target.value.toUpperCase())}
            placeholder="SAV-260820-0001"
            required
          />
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98365 37447"
              required
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">⚠️ {error}</p>
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? "Searching..." : "Find My Order"}
          </Button>
        </form>
      </Card>

      {/* Order result */}
      {order && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Package className="text-berry" size={20} />
                <div>
                  <p className="font-bold text-ink">{order.human_id}</p>
                  <p className="text-xs text-ink-faint">{order.guest_name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge color={statusColors[order.status] ?? "neutral"}>
                  {order.status}
                </Badge>
                <Badge color={order.payment_status === "paid" ? "mint" : "yellow"}>
                  {order.payment_status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {order.order_items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink-soft">{item.quantity}× {item.name}</span>
                  <span className="font-medium text-ink">{formatPrice(item.line_total_cents)}</span>
                </div>
              ))}
              <div className="border-t border-ink/8 pt-3 flex justify-between">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-gold-deep">{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="text-ink-faint" size={16} />
                <span className="text-ink-faint">Slot:</span>
                <span className="text-ink">
                  {formatIstSlot(order.requested_slot)} IST
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="text-ink-faint" size={16} />
                <span className="text-ink-faint">Fulfillment:</span>
                <span className="text-ink capitalize">{order.fulfillment}</span>
              </div>
              {order.delivery_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 text-ink-faint" size={16} />
                  <span className="text-ink">{order.delivery_address}</span>
                </div>
              )}
            </div>
          </Card>

          <Link href={`/orders/${order.human_id}?phone=${encodeURIComponent(phone)}`}>
            <Button variant="outline" className="w-full">View Full Order Details →</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
