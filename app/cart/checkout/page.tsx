"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/store";
import { formatPrice } from "@/lib/cart/math";
import {
  validateCart,
  validateGuestInfo,
  validateDeliveryAddress,
  getRequiredNoticeHours,
} from "@/lib/cart/validation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, MapPin, User, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "review" | "fulfillment" | "details" | "confirm";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalCents, totalItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [step, setStep] = useState<Step>("review");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [requestedSlot, setRequestedSlot] = useState("");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [deliveryAddress, setDeliveryAddress] = useState({ address: "", landmark: "" });
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const cartValidation = validateCart(items);
  const noticeHours = getRequiredNoticeHours(items);

  const handleProceedToFulfillment = () => {
    if (!cartValidation.valid) {
      setErrors(cartValidation.errors);
      return;
    }
    setErrors([]);
    setStep("fulfillment");
  };

  const handleProceedToDetails = () => {
    if (!requestedSlot) {
      setErrors(["Please select a pickup/delivery slot"]);
      return;
    }
    setErrors([]);
    setStep("details");
  };

  const handleProceedToConfirm = () => {
    const guestErrors = validateGuestInfo(guest);
    if (!guestErrors.valid) {
      setErrors(guestErrors.errors);
      return;
    }
    if (fulfillment === "delivery") {
      const addrErrors = validateDeliveryAddress(deliveryAddress);
      if (!addrErrors.valid) {
        setErrors(addrErrors.errors);
        return;
      }
    }
    setErrors([]);
    setStep("confirm");
  };

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            selections: item.selections,
            lineTotalCents: item.lineTotalCents,
          })),
          totalCents,
          fulfillment,
          requestedSlot,
          guest,
          deliveryAddress: fulfillment === "delivery" ? deliveryAddress : undefined,
          notes,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Order submission failed");
      }

      const data = (await response.json()) as {
        order: { human_id?: string; humanId?: string };
      };
      const orderId = data.order?.human_id || data.order?.humanId;
      clearCart();
      router.push(`/orders/${orderId}?email=${encodeURIComponent(guest.email)}`);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Something went wrong"]);
    } finally {
      setSubmitting(false);
    }
  };

  // Empty cart state
  if (items.length === 0 && step === "review") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <ShoppingBag className="mx-auto mb-4 text-ink-faint" size={48} />
        <h1 className="text-2xl font-bold text-ink mb-2">Your cart is empty</h1>
        <p className="text-ink-soft mb-6">Browse our menu and add some treats!</p>
        <Button onClick={() => router.push("/menu")} variant="primary">
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-ink mb-2">Checkout</h1>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {(["review", "fulfillment", "details", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? "bg-pink text-white"
                  : ["review", "fulfillment", "details", "confirm"].indexOf(step) > i
                  ? "bg-mint text-ink"
                  : "bg-ink/10 text-ink-faint"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="h-0.5 w-8 bg-ink/10" />}
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">⚠️ {err}</p>
          ))}
        </div>
      )}

      {/* Step: Review cart */}
      {step === "review" && (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center gap-4">
              {item.image_url && (
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-pink-soft flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-ink">{item.name}</h3>
                <p className="text-xs text-ink-soft">
                  {item.selections.size && `Size: ${item.selections.size} · `}
                  {item.selections.variant && `Variant: ${item.selections.variant} · `}
                  {formatPrice(item.unitPriceCents)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 hover:bg-pink-soft"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 hover:bg-pink-soft"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="text-right">
                <p className="font-semibold text-pink">{formatPrice(item.lineTotalCents)}</p>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-xs text-ink-faint hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}

          <div className="flex items-center justify-between border-t border-ink/8 pt-4">
            <div>
              <p className="text-sm text-ink-soft">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
              <p className="text-2xl font-bold text-ink">{formatPrice(totalCents)}</p>
            </div>
            <Button onClick={handleProceedToFulfillment} variant="primary" size="lg">
              Continue →
            </Button>
          </div>

          {noticeHours > 12 && (
            <div className="rounded-xl bg-yellow-soft border border-yellow/20 p-3">
              <p className="text-sm text-ink-soft">
                ⏰ This order requires {noticeHours}h advance notice due to{" "}
                {noticeHours >= 120 ? "custom cake" : "bulk order"} requirements.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step: Fulfillment + slot */}
      {step === "fulfillment" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-ink mb-3">Fulfillment Method</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFulfillment("pickup")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  fulfillment === "pickup"
                    ? "border-pink bg-pink-soft"
                    : "border-ink/15 bg-white hover:border-pink"
                }`}
              >
                <MapPin className="mb-2 text-pink" size={20} />
                <p className="font-semibold text-ink">Pickup</p>
                <p className="text-xs text-ink-soft">Collect from our bakery</p>
              </button>
              <button
                onClick={() => setFulfillment("delivery")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  fulfillment === "delivery"
                    ? "border-pink bg-pink-soft"
                    : "border-ink/15 bg-white hover:border-pink"
                }`}
              >
                <MapPin className="mb-2 text-mint" size={20} />
                <p className="font-semibold text-ink">Delivery</p>
                <p className="text-xs text-ink-soft">We&rsquo;ll bring it to you</p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-ink mb-3">Select a Slot</h2>
            <Badge color="pink" className="mb-3">
              Minimum {noticeHours}h notice required
            </Badge>
            <Input
              type="datetime-local"
              label="Requested date & time"
              value={requestedSlot}
              onChange={(e) => setRequestedSlot(e.target.value)}
            />
          </div>

          <div className="flex justify-between">
            <Button onClick={() => setStep("review")} variant="ghost">
              ← Back
            </Button>
            <Button onClick={handleProceedToDetails} variant="primary">
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* Step: Guest details */}
      {step === "details" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
              <User size={20} className="text-pink" /> Your Details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={guest.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                placeholder="Jane Doe"
              />
              <Input
                label="Phone Number"
                type="tel"
                value={guest.phone}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                placeholder="+91 98365 37447"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Email Address"
                  type="email"
                  value={guest.email}
                  onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                  placeholder="jane@example.com"
                />
              </div>
            </div>
          </div>

          {fulfillment === "delivery" && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <MapPin size={20} className="text-mint" /> Delivery Address
              </h2>
              <div className="flex flex-col gap-4">
                <Textarea
                  label="Full Address"
                  value={deliveryAddress.address}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, address: e.target.value })}
                  placeholder="House/Flat number, Street, Area, City, PIN code"
                  rows={3}
                />
                <Input
                  label="Landmark (optional)"
                  value={deliveryAddress.landmark}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, landmark: e.target.value })}
                  placeholder="Near..."
                />
              </div>
            </div>
          )}

          <Textarea
            label="Order Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Message on cake, special instructions, etc."
            rows={2}
          />

          <div className="flex justify-between">
            <Button onClick={() => setStep("fulfillment")} variant="ghost">
              ← Back
            </Button>
            <Button onClick={handleProceedToConfirm} variant="primary">
              Review Order →
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-ink mb-4">Order Summary</h2>
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-ink-soft">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-medium text-ink">{formatPrice(item.lineTotalCents)}</span>
                </div>
              ))}
              <div className="border-t border-ink/8 pt-3 flex justify-between">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-pink text-lg">{formatPrice(totalCents)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-ink mb-3">Details</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div><span className="text-ink-faint">Name:</span> {guest.name}</div>
              <div><span className="text-ink-faint">Email:</span> {guest.email}</div>
              <div><span className="text-ink-faint">Phone:</span> {guest.phone}</div>
              <div>
                <span className="text-ink-faint">Fulfillment:</span>{" "}
                {fulfillment === "pickup" ? "Pickup" : "Delivery"}
              </div>
              <div>
                <span className="text-ink-faint">Slot:</span>{" "}
                {new Date(requestedSlot).toLocaleString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {fulfillment === "delivery" && (
                <div><span className="text-ink-faint">Address:</span> {deliveryAddress.address}</div>
              )}
              {notes && <div><span className="text-ink-faint">Notes:</span> {notes}</div>}
            </div>
          </Card>

          <div className="rounded-xl bg-mint-soft border border-mint/20 p-4">
            <p className="text-sm text-ink-soft">
              💡 Payment: You can pay via Razorpay (online) or UPI (manual). After placing your order,
              we&rsquo;ll confirm availability and send payment instructions.
            </p>
          </div>

          <div className="flex justify-between">
            <Button onClick={() => setStep("details")} variant="ghost" disabled={submitting}>
              ← Back
            </Button>
            <Button onClick={handleSubmitOrder} variant="primary" size="lg" disabled={submitting}>
              {submitting ? "Placing Order..." : "Place Order 🎂"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
