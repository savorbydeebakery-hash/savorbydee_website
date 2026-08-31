"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/cart/math";
import { Confetti } from "@/components/magicui/confetti";
import { CheckCircle2, Package, MapPin, Clock, Search } from "lucide-react";
import Link from "next/link";
import { formatIstSlot } from "@/lib/time/ist";
import { RetryPaymentButton } from "@/components/retry-payment-button";
import { createClient } from "@/lib/supabase/client";

interface OrderData {
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
  notes: string | null;
  order_items: {
    name: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
    selections: Record<string, unknown>;
  }[];
}

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ humanId: string }>;
}) {
  const { humanId } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const fetchOrder = useCallback(async (emailVal: string, phoneVal: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ email: emailVal });
      if (phoneVal) params.set("phone", phoneVal);

      const res = await fetch(`/api/orders/${humanId}?${params}`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to load order");
      }

      const data = (await res.json()) as { order: OrderData };
      setOrder(data.order);
      setNeedsVerification(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setNeedsVerification(true);
    } finally {
      setLoading(false);
    }
  }, [humanId]);

  useEffect(() => {
    // Try to get email from URL query (set after checkout)
    const url = new URL(window.location.href);
    const emailParam = url.searchParams.get("email");
    const id = setTimeout(() => {
      if (emailParam) {
        setEmail(emailParam);
        void fetchOrder(emailParam, "");
      } else {
        setNeedsVerification(true);
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [fetchOrder]);

  /**
   * Payment settings. RetryPaymentButton existed but was imported by nothing,
   * so an unpaid order had no way to pay at all — and kyc_pending_mode, the
   * setting whose entire purpose is to show UPI instructions while Razorpay
   * activation is pending, was switched on with nowhere to appear.
   */
  const [payment, setPayment] = useState<{
    razorpayActive: boolean;
    kycPendingMode: boolean;
    upiId: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("site_settings")
      .select("razorpay_active, kyc_pending_mode, upi_id")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setPayment({
          razorpayActive: data.razorpay_active ?? false,
          kycPendingMode: data.kyc_pending_mode ?? false,
          upiId: data.upi_id ?? null,
        });
      });
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(email, phone);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="animate-pulse">
          <CheckCircle2 className="mx-auto mb-4 text-cocoa" size={48} />
          <p className="text-ink-soft">Loading your order...</p>
        </div>
      </div>
    );
  }

  // Verification form (if no email in URL or verification failed)
  if (needsVerification && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
        <div className="text-center mb-8">
          <Search className="mx-auto mb-4 text-berry" size={40} />
          <h1 className="text-2xl font-bold text-ink mb-2">Find Your Order</h1>
          <p className="text-sm text-ink-soft">
            Enter your email and phone to view order {humanId}
          </p>
        </div>
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" variant="primary">View Order</Button>
        </form>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg text-red-500 mb-4">{error}</p>
        <Link href="/orders/lookup">
          <Button variant="outline">Try Again</Button>
        </Link>
      </div>
    );
  }

  if (!order) return null;

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
      {/* Success header */}
      {/* One burst on arrival. This is the single genuinely celebratory moment
          in the whole flow, and it fires once rather than looping. */}
      <Confetti
        className="pointer-events-none fixed inset-0 z-50"
        options={{
          particleCount: 90,
          spread: 70,
          origin: { y: 0.35 },
          colors: ["#A8455A", "#F6C7CF", "#E8AF7C", "#F2E8DC"],
          disableForReducedMotion: true,
        }}
      />

      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mint-soft">
          <CheckCircle2 className="text-cocoa" size={36} />
        </div>
        <h1 className="text-h1 text-ink mb-2">Order confirmed</h1>
        <p className="text-ink-soft">Your order has been received.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-pink-soft px-4 py-2">
          <span className="text-sm text-ink-faint">Order ID:</span>
          <span className="font-bold text-berry">{order.human_id}</span>
        </div>
      </div>

      {/* Status */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="text-berry" size={20} />
            <div>
              <p className="text-xs text-ink-faint">Status</p>
              <Badge color={statusColors[order.status] ?? "neutral"}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-faint">Payment</p>
            <Badge color={order.payment_status === "paid" ? "mint" : "yellow"}>
              {order.payment_status}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card className="mb-4">
        <h2 className="font-semibold text-ink mb-3">Items</h2>
        <div className="flex flex-col gap-3">
          {order.order_items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <span className="text-ink-soft">{item.quantity}× {item.name}</span>
              </div>
              <span className="font-medium text-ink">{formatPrice(item.line_total_cents)}</span>
            </div>
          ))}
          <div className="border-t border-ink/8 pt-3 flex justify-between">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-bold text-gold-deep text-lg">{formatPrice(order.total_cents)}</span>
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card className="mb-4">
        <h2 className="font-semibold text-ink mb-3">Details</h2>
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
          {order.notes && (
            <div>
              <span className="text-ink-faint">Notes: </span>
              <span className="text-ink">{order.notes}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Payment */}
      {order.payment_status !== "paid" && payment && (payment.razorpayActive || payment.kycPendingMode) ? (
        <div className="mb-6">
          <RetryPaymentButton
            orderId={order.id}
            humanId={order.human_id}
            totalCents={order.total_cents}
            kycPendingMode={payment.kycPendingMode}
            upiId={payment.upiId ?? undefined}
            onPaymentSuccess={() => fetchOrder(email, phone)}
          />
        </div>
      ) : (
        <div className="rounded-xl bg-mint-soft border border-mint/20 p-4 mb-6">
          <p className="text-sm text-ink-soft">
            💡 We&rsquo;ll confirm your order and send payment instructions to{" "}
            <strong>{order.guest_email}</strong>.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Link href="/menu">
          <Button variant="outline">Continue Browsing</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
