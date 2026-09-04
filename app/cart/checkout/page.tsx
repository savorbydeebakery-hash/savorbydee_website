"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { formatPrice } from "@/lib/cart/math";
import {
  validateCart,
  validateGuestInfo,
  validateDeliveryAddress,
  getRequiredNoticeHours,
  getEarliestValidSlot,
  validateSlotAgainstHours,
  validateDeliveryWindow,
  DEFAULT_NOTICE_RULES,
  type SiteNoticeRules,
  type WeeklyHours,
} from "@/lib/cart/validation";
import {
  istInputToInstant,
  instantToIstInput,
  istInputAfterHours,
  formatIstSlot,
} from "@/lib/time/ist";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, MapPin, User, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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

  // Prefill guest details + delivery address from a logged-in profile.
  useEffect(() => {
    const prefill = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email, default_address, default_landmark")
        .eq("id", user.id)
        .single();

      if (profile) {
        setGuest((prev) => ({
          name: prev.name || profile.full_name || "",
          email: prev.email || profile.email || user.email || "",
          phone: prev.phone || profile.phone || "",
        }));
        setDeliveryAddress((prev) => ({
          address: prev.address || profile.default_address || "",
          landmark: prev.landmark || profile.default_landmark || "",
        }));
      }
    };

    void prefill();
  }, []);


  const cartValidation = validateCart(items);
  // This used to call getRequiredNoticeHours(items) with no rules, so it ran on
  // DEFAULT_NOTICE_RULES and the "Global Notice (hours)" field in the admin
  // panel changed nothing at checkout. The setting is the source of truth, so
  // it is loaded here and the constant is only the pre-load fallback.
  const [noticeRules, setNoticeRules] = useState<SiteNoticeRules>(DEFAULT_NOTICE_RULES);
  // Opening hours and holidays, so the picker cannot offer a slot the API is
  // about to reject. Null until loaded — an unknown schedule constrains
  // nothing rather than blocking every date.
  const [schedule, setSchedule] = useState<{ weekly: WeeklyHours | null; holidays: string[] }>({
    weekly: null,
    holidays: [],
  });
  // Whether that request has come back at all. Without this the slot step let
  // a closed day straight through whenever the click beat the fetch: the
  // schedule was still null, the check below no-opped, and the customer only
  // found out after filling in their details. Caught on staging, where the
  // round trip is slower than it is locally.
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  // Admin -> Settings -> Delivery. Unchecking it used to reword the shipping
  // policy and change nothing else, so customers kept placing delivery orders
  // the bakery had switched off. Defaults to true so a settings read that
  // fails does not silently withdraw delivery.
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  // For the bulk-order invite. Null hides the link rather than rendering a
  // dead wa.me/undefined.
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  // Delivery runs on a narrower window than the shop, and is free above a
  // threshold. Both editable in admin.
  const [deliveryWindow, setDeliveryWindow] = useState<{ from: string; to: string }>({
    from: "10:00",
    to: "20:00",
  });
  const [freeDeliveryOver, setFreeDeliveryOver] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("site_settings")
          .select(
            "global_notice_hours, preorder_notice_hours, bulk_threshold, bulk_notice_hours, custom_cake_notice_days, weekly_hours, holidays, delivery_enabled, whatsapp_number, delivery_from, delivery_to, free_delivery_threshold_cents"
          )
          .eq("id", 1)
          .single();

        if (cancelled || !data) return;

        setNoticeRules({
          globalNoticeHours: data.global_notice_hours ?? DEFAULT_NOTICE_RULES.globalNoticeHours,
          preorderNoticeHours:
            data.preorder_notice_hours ?? DEFAULT_NOTICE_RULES.preorderNoticeHours,
          bulkThreshold: data.bulk_threshold ?? DEFAULT_NOTICE_RULES.bulkThreshold,
          bulkNoticeHours: data.bulk_notice_hours ?? DEFAULT_NOTICE_RULES.bulkNoticeHours,
          customCakeNoticeDays:
            data.custom_cake_notice_days ?? DEFAULT_NOTICE_RULES.customCakeNoticeDays,
        });
        setSchedule({
          weekly: (data.weekly_hours as WeeklyHours | null) ?? null,
          holidays: (data.holidays as string[] | null) ?? [],
        });
        setDeliveryEnabled(data.delivery_enabled ?? true);
        setWhatsappNumber(data.whatsapp_number?.trim() || null);
        setDeliveryWindow({
          from: data.delivery_from ?? "10:00",
          to: data.delivery_to ?? "20:00",
        });
        setFreeDeliveryOver(data.free_delivery_threshold_cents ?? null);
      } catch {
        // Fail open. The order API applies both rules authoritatively, so a
        // settings read that fails should not strand the customer at checkout.
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived, not corrected in an effect. If delivery is switched off while a
  // customer has it selected, the answer is simply "pickup" from that render
  // on — writing state back in an effect would cause a cascading render to
  // reach the same place.
  const effectiveFulfillment = deliveryEnabled ? fulfillment : "pickup";

  const noticeHours = getRequiredNoticeHours(items, noticeRules);

  // The earliest slot that clears the notice window *and* lands inside opening
  // hours. `datetime-local` reads and writes a naive wall clock, which is
  // treated as IST throughout — see lib/time/ist.ts for why that is pinned
  // rather than left to the device's zone.
  const minSlot = useMemo(() => {
    const earliest = schedule.weekly
      ? getEarliestValidSlot(noticeHours, schedule.weekly, schedule.holidays)
      : null;
    return earliest ? instantToIstInput(earliest) : istInputAfterHours(noticeHours);
  }, [noticeHours, schedule]);

  const handleProceedToFulfillment = () => {
    if (!cartValidation.valid) {
      setErrors(cartValidation.errors);
      return;
    }
    setErrors([]);
    setStep("fulfillment");
  };

  const handleProceedToDetails = () => {
    if (!settingsLoaded) return;

    if (!requestedSlot) {
      setErrors(["Please select a pickup/delivery slot"]);
      return;
    }

    // Mirrors the two checks the order API enforces, so the customer finds out
    // here rather than after filling in their details. The API remains the
    // authority — this is only about where the error surfaces.
    const slot = istInputToInstant(requestedSlot);
    if (!slot) {
      setErrors(["That slot is not a valid date and time"]);
      return;
    }

    if (slot.getTime() < Date.now() + noticeHours * 3_600_000 - 60_000) {
      setErrors([
        `This order needs at least ${noticeHours} hours notice. Please choose a later slot.`,
      ]);
      return;
    }

    const hoursCheck = validateSlotAgainstHours(slot, schedule.weekly, schedule.holidays);
    if (!hoursCheck.valid) {
      setErrors([hoursCheck.error!]);
      return;
    }

    if (effectiveFulfillment === "delivery") {
      const windowCheck = validateDeliveryWindow(slot, deliveryWindow.from, deliveryWindow.to);
      if (!windowCheck.valid) {
        setErrors([windowCheck.error!]);
        return;
      }
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
    if (effectiveFulfillment === "delivery") {
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
          fulfillment: effectiveFulfillment,
          requestedSlot,
          guest,
          deliveryAddress: effectiveFulfillment === "delivery" ? deliveryAddress : undefined,
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
      <h1 className="text-h1 text-ink mb-2">Checkout</h1>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {(["review", "fulfillment", "details", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? "bg-berry text-white"
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
                <p className="font-semibold text-gold-deep">{formatPrice(item.lineTotalCents)}</p>
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

          {/* "more than the standard wait", not a hardcoded 12 — otherwise
              this silently stops matching the moment the setting changes. */}
          {noticeHours > noticeRules.globalNoticeHours && (
            <div className="rounded-xl bg-yellow-soft border border-yellow/20 p-3">
              <p className="text-sm text-ink-soft">
                ⏰ This order requires {noticeHours}h advance notice due to{" "}
                {noticeHours >= 120 ? "custom cake" : "bulk order"} requirements.
              </p>
              {/* Bulk is a conversation, not just a longer wait — the client
                  wants to quote these directly. */}
              {noticeHours < 120 && (
                <p className="mt-1.5 text-sm text-ink-soft">
                  Ordering this much?{" "}
                  {whatsappNumber ? (
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-berry underline underline-offset-2"
                    >
                      Message us
                    </a>
                  ) : (
                    <span className="font-semibold text-berry">Get in touch</span>
                  )}{" "}
                  &mdash; we offer special rates on bulk orders.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: Fulfillment + slot */}
      {step === "fulfillment" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-ink mb-3">Fulfillment Method</h2>
            <div className={`grid gap-3 ${deliveryEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                onClick={() => setFulfillment("pickup")}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  effectiveFulfillment === "pickup"
                    ? "border-pink bg-pink-soft"
                    : "border-ink/15 bg-white hover:border-pink"
                }`}
              >
                <MapPin className="mb-2 text-berry" size={20} />
                <p className="font-semibold text-ink">Pickup</p>
                <p className="text-xs text-ink-soft">Collect from our bakery</p>
              </button>
              {deliveryEnabled && (
                <button
                  onClick={() => setFulfillment("delivery")}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    effectiveFulfillment === "delivery"
                      ? "border-pink bg-pink-soft"
                      : "border-ink/15 bg-white hover:border-pink"
                  }`}
                >
                  <MapPin className="mb-2 text-cocoa" size={20} />
                  <p className="font-semibold text-ink">Delivery</p>
                  <p className="text-xs text-ink-soft">We&rsquo;ll bring it to you</p>
                </button>
              )}
            </div>
            {!deliveryEnabled && (
              <p className="mt-2 text-xs text-ink-faint">
                We are not delivering at the moment &mdash; collection only.
              </p>
            )}
            {deliveryEnabled && freeDeliveryOver != null && (
              <p className="mt-2 text-sm text-ink-soft">
                {totalCents >= freeDeliveryOver ? (
                  <span className="font-semibold text-mint-deep">
                    ✓ This order qualifies for free delivery.
                  </span>
                ) : (
                  <>Delivery is free on orders over {formatPrice(freeDeliveryOver)}.</>
                )}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-ink mb-3">Select a Slot</h2>
            <Badge color="pink" className="mb-3">
              Minimum {noticeHours}h notice required
            </Badge>
            {effectiveFulfillment === "delivery" && (
              <p className="mb-3 text-sm text-ink-soft">
                We deliver between {deliveryWindow.from} and {deliveryWindow.to} IST.
              </p>
            )}
            <Input
              type="datetime-local"
              label="Requested date & time (IST)"
              value={requestedSlot}
              min={minSlot}
              onChange={(e) => setRequestedSlot(e.target.value)}
            />
            <p className="mt-2 text-xs text-ink-faint">
              All times are India Standard Time.
            </p>
          </div>

          <div className="flex justify-between">
            <Button onClick={() => setStep("review")} variant="ghost">
              ← Back
            </Button>
            <Button onClick={handleProceedToDetails} variant="primary" disabled={!settingsLoaded}>
              {settingsLoaded ? "Continue →" : "Checking availability…"}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Guest details */}
      {step === "details" && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
              <User size={20} className="text-berry" /> Your Details
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

          {effectiveFulfillment === "delivery" && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <MapPin size={20} className="text-cocoa" /> Delivery Address
              </h2>

              {/* Disclosed HERE, at the moment delivery is chosen, and again on
                  the confirm step beside the total. The delivery charge depends
                  on distance and is set by staff after the order comes in, so
                  it cannot be shown at checkout — which makes telling the
                  customer up front the whole basis on which that is fair.
                  Someone who pays online and is then quoted a fee they were
                  never warned about has a legitimate complaint, and a disputed
                  charge against a new payment account is expensive. */}
              <p className="mb-4 rounded-xl bg-pink-soft px-4 py-3 text-sm leading-relaxed text-ink">
                <strong>Delivery is charged separately.</strong> The amount you
                pay now covers the bakes only. We work out the delivery charge
                from your address and confirm it with you before we set off —
                it is paid in cash when your order arrives.
              </p>
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
                <span className="font-bold text-gold-deep text-lg">{formatPrice(totalCents)}</span>
              </div>

              {effectiveFulfillment === "delivery" && (
                <p className="mt-3 rounded-xl bg-pink-soft px-4 py-3 text-xs leading-relaxed text-ink">
                  This total is for the bakes only. Your delivery charge depends
                  on the distance, and we will confirm it with you before
                  delivery — payable in cash on arrival.
                </p>
              )}
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
                {effectiveFulfillment === "pickup" ? "Pickup" : "Delivery"}
              </div>
              <div>
                <span className="text-ink-faint">Slot:</span>{" "}
                {formatIstSlot(istInputToInstant(requestedSlot))} IST
              </div>
              {effectiveFulfillment === "delivery" && (
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
