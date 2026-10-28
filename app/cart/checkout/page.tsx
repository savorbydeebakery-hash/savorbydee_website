"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { formatPrice } from "@/lib/cart/math";
import { deliveryChargeFor } from "@/lib/cart/delivery-charge";
import {
  validateCart,
  validateGuestInfo,
  validateDeliveryAddress,
  getRequiredNoticeHours,
  explainRequiredNotice,
  getEarliestValidSlot,
  cartMenuKind,
  formatNotice,
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
  formatClock,
  istDateKey,
} from "@/lib/time/ist";
import { readOverrides, type HoursOverrides } from "@/lib/shop/hours-override";
import { cashAtPickupAllowed, readCashSetting, type CashAtPickup } from "@/lib/payments/cash";
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
  const [guest, setGuest] = useState({ name: "", phone: "" });
  const [deliveryAddress, setDeliveryAddress] = useState({ address: "", landmark: "" });
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  // Set when the error on screen is about the chosen date and time, so the
  // error box can offer a way straight back to the picker instead of leaving
  // the customer to find it. `noticeHours` is the notice the failed check
  // asked for, when it was a notice failure; null for the other slot errors
  // (closed day, outside opening hours, outside the delivery window).
  const [slotProblem, setSlotProblem] = useState<{ noticeHours: number | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // One key per checkout, sent with every attempt. The order API already
  // de-duplicates on it, but nothing sent one — so a request that timed out
  // after the order was saved, then retried, created a second order and a
  // second payment to chase.
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  // How long the customer has to pay once the order is placed. Shown on the
  // confirm step so the deadline is not a surprise on the next page.
  const [paymentWindowMinutes, setPaymentWindowMinutes] = useState(60);

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
        .select("full_name, phone, default_address, default_landmark")
        .eq("id", user.id)
        .single();

      if (profile) {
        setGuest((prev) => ({
          name: prev.name || profile.full_name || "",
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
  const [schedule, setSchedule] = useState<{ weekly: WeeklyHours | null; holidays: string[]; overrides: HoursOverrides }>({
    weekly: null,
    holidays: [],
    overrides: {},
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
  // "off" until settings load, so cash is never offered on a guess.
  const [cashSetting, setCashSetting] = useState<CashAtPickup>("off");
  const [chosenPayMethod, setChosenPayMethod] = useState<"upi" | "cash">("upi");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("site_settings")
          // Every column: naming one the database doesn't have yet fails the
          // whole read, and checkout would fall back to defaults.
          .select("*")
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
          dailyPickupNoticeMinutes:
            data.daily_pickup_notice_minutes ?? DEFAULT_NOTICE_RULES.dailyPickupNoticeMinutes,
        });
        setCashSetting(readCashSetting(data.cash_at_pickup));
        setSchedule({
          weekly: (data.weekly_hours as WeeklyHours | null) ?? null,
          holidays: (data.holidays as string[] | null) ?? [],
          overrides: readOverrides(data.hours_overrides),
        });
        setDeliveryEnabled(data.delivery_enabled ?? true);
        setWhatsappNumber(data.whatsapp_number?.trim() || null);
        setDeliveryWindow({
          from: data.delivery_from ?? "10:00",
          to: data.delivery_to ?? "20:00",
        });
        setFreeDeliveryOver(data.free_delivery_threshold_cents ?? null);
        if (typeof data.payment_window_minutes === "number") {
          setPaymentWindowMinutes(data.payment_window_minutes);
        }
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

  // Today's Menu: 10 minutes to collect, 2 hours to deliver (settings).
  const noticeHours = getRequiredNoticeHours(items, noticeRules, effectiveFulfillment);
  const isDailyCart = cartMenuKind(items) === "daily";
  const todayKey = istDateKey(new Date());
  // Cash at pickup: offered only where the order API will accept it.
  const cashCheck = cashAtPickupAllowed(cashSetting, effectiveFulfillment, cartMenuKind(items) === "preorder");
  const payMethod: "upi" | "cash" = cashCheck.allowed ? chosenPayMethod : "upi";
  // WHY the wait is this long, rather than inferring it from the number. See
  // explainRequiredNotice: guessing gave "bulk order requirements" for a single
  // made-to-order cake, because 24 is not 120.
  const notice = explainRequiredNotice(items, noticeRules, effectiveFulfillment);
  // One answer for all four places that mention the delivery charge. They were
  // written separately and drifted: an order over the threshold was told it
  // qualified for free delivery, then that delivery was charged separately,
  // then that the charge depended on distance and was payable on arrival.
  const deliveryCharge = deliveryChargeFor(totalCents, freeDeliveryOver);

  // The earliest slot that clears the notice window *and* lands inside opening
  // hours. `datetime-local` reads and writes a naive wall clock, which is
  // treated as IST throughout — see lib/time/ist.ts for why that is pinned
  // rather than left to the device's zone.
  const minSlot = useMemo(() => {
    const earliest = schedule.weekly
      ? getEarliestValidSlot(noticeHours, schedule.weekly, schedule.holidays, new Date(), schedule.overrides)
      : null;
    return earliest ? instantToIstInput(earliest) : istInputAfterHours(noticeHours);
  }, [noticeHours, schedule]);

  // A Today's Menu delivery has to be today, 2 hours out, inside opening and
  // delivery hours. Late in the day that is impossible, and saying so up front
  // beats letting the customer pick times that all fail.
  const dailyDeliveryClosedToday = useMemo(() => {
    if (!isDailyCart || effectiveFulfillment !== "delivery" || !schedule.weekly) return false;
    const earliest = getEarliestValidSlot(noticeHours, schedule.weekly, schedule.holidays, new Date(), schedule.overrides);
    if (!earliest || istDateKey(earliest) !== todayKey) return true;
    // Earlier than deliveries start (an early opening, or deliveries set to
    // begin late): the first delivery is at the start time, not impossible.
    const start = deliveryWindow.from ? istInputToInstant(`${todayKey}T${deliveryWindow.from.padStart(5, "0")}`) : null;
    if (start && earliest < start) {
      return !validateSlotAgainstHours(start, schedule.weekly, schedule.holidays, schedule.overrides).valid;
    }
    return !validateDeliveryWindow(earliest, deliveryWindow.from, deliveryWindow.to).valid;
  }, [isDailyCart, effectiveFulfillment, schedule, noticeHours, todayKey, deliveryWindow]);

  const handleProceedToFulfillment = () => {
    setSlotProblem(null);
    if (!cartValidation.valid) {
      setErrors(cartValidation.errors);
      return;
    }
    setErrors([]);
    setStep("fulfillment");
  };

  const slotError = (message: string, notice: number | null = null) => {
    setErrors([message]);
    setSlotProblem({ noticeHours: notice });
  };

  const handleProceedToDetails = () => {
    if (!settingsLoaded) return;

    if (!requestedSlot) {
      slotError("Please select a pickup/delivery slot");
      return;
    }

    // Mirrors the two checks the order API enforces, so the customer finds out
    // here rather than after filling in their details. The API remains the
    // authority — this is only about where the error surfaces.
    const slot = istInputToInstant(requestedSlot);
    if (!slot) {
      slotError("That slot is not a valid date and time");
      return;
    }

    if (dailyDeliveryClosedToday) {
      slotError(
        `It's too late for a delivery from Today's Menu today: deliveries need ${formatNotice(noticeHours)} and end at ${formatClock(deliveryWindow.to)}. Please choose pickup instead.`
      );
      return;
    }

    if (slot.getTime() < Date.now() + noticeHours * 3_600_000 - 60_000) {
      slotError(
        `This order needs at least ${formatNotice(noticeHours)} notice. Please choose a later slot.`,
        noticeHours
      );
      return;
    }

    // Today's Menu is for today: its stock counts are today's bakes.
    if (isDailyCart && istDateKey(slot) !== todayKey) {
      slotError(
        effectiveFulfillment === "delivery"
          ? "Today's Menu is for today only, and it's too late to deliver today. Choose pickup, or order from the Preorder Menu for another day."
          : "Today's Menu is for today only. Please choose a time today."
      );
      return;
    }

    const hoursCheck = validateSlotAgainstHours(slot, schedule.weekly, schedule.holidays, schedule.overrides);
    if (!hoursCheck.valid) {
      slotError(hoursCheck.error!);
      return;
    }

    if (effectiveFulfillment === "delivery") {
      const windowCheck = validateDeliveryWindow(slot, deliveryWindow.from, deliveryWindow.to);
      if (!windowCheck.valid) {
        slotError(windowCheck.error!);
        return;
      }
    }

    setErrors([]);
    setSlotProblem(null);
    setStep("details");
  };

  // The earliest slot that would pass the check that just failed, offered as
  // a one-tap fix. Not offered for a delivery order whose earliest slot falls
  // outside the delivery window: suggesting a time that fails again is worse
  // than letting the customer choose.
  const suggestedSlot = useMemo(() => {
    if (!slotProblem || !schedule.weekly) return null;
    const hours = Math.max(noticeHours, slotProblem.noticeHours ?? 0);
    const earliest = getEarliestValidSlot(hours, schedule.weekly, schedule.holidays, new Date(), schedule.overrides);
    if (!earliest) return null;
    // Today's Menu can't move to another day, so tomorrow is no suggestion.
    if (isDailyCart && istDateKey(earliest) !== todayKey) return null;
    if (
      effectiveFulfillment === "delivery" &&
      !validateDeliveryWindow(earliest, deliveryWindow.from, deliveryWindow.to).valid
    ) {
      return null;
    }
    return earliest;
  }, [slotProblem, noticeHours, schedule, effectiveFulfillment, deliveryWindow, isDailyCart, todayKey]);

  // Back to the picker, with it in view and focused (and opened, where the
  // browser allows it), so "change the time" is one tap.
  const changeSlot = () => {
    setStep("fulfillment");
    setTimeout(() => {
      const input = document.getElementById("requested-slot") as HTMLInputElement | null;
      if (!input) return;
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
      try {
        input.showPicker?.();
      } catch {
        // Some browsers refuse showPicker outside a direct tap; focus is enough.
      }
    }, 50);
  };

  // Takes the suggestion and stays put: on the confirm step the summary
  // updates in place and the customer can place the order again straight away.
  const takeSuggestedSlot = () => {
    if (!suggestedSlot) return;
    setRequestedSlot(instantToIstInput(suggestedSlot));
    setErrors([]);
    setSlotProblem(null);
  };

  const handleProceedToConfirm = () => {
    setSlotProblem(null);
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
    setSlotProblem(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": idempotencyKey },
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
          paymentMethod: payMethod,
          notes,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as {
          error?: string;
          field?: string;
          requiredNoticeHours?: number;
        };
        // The API tags date-and-time failures (notice, hours, delivery
        // window) so this can offer the way back to the picker. The time may
        // have been fine when chosen and gone stale while the details were
        // filled in.
        if (data.field === "slot") {
          slotError(data.error ?? "Please choose another date and time.", data.requiredNoticeHours ?? null);
          return;
        }
        throw new Error(data.error ?? "Order submission failed");
      }

      const data = (await response.json()) as {
        order: { human_id?: string; humanId?: string };
      };
      const orderId = data.order?.human_id || data.order?.humanId;
      clearCart();
      router.push(`/orders/${orderId}?phone=${encodeURIComponent(guest.phone)}`);
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
          {slotProblem && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedSlot && (
                <Button size="sm" variant="primary" onClick={takeSuggestedSlot}>
                  Use earliest: {formatIstSlot(suggestedSlot)}
                </Button>
              )}
              <Button
                size="sm"
                variant={suggestedSlot ? "outline" : "primary"}
                onClick={changeSlot}
              >
                Change date &amp; time
              </Button>
            </div>
          )}
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
                ⏰{" "}
                {notice.cause === "custom" ? (
                  <>
                    This order needs up to {Math.round(notice.hours / 24)} days&rsquo; notice
                    &mdash; custom cakes are designed and quoted individually, and we will let
                    you know if yours can be ready sooner.
                  </>
                ) : notice.cause === "bulk" ? (
                  <>
                    This order needs {notice.hours}h notice because of the quantity
                    {notice.itemName ? ` of ${notice.itemName}` : ""}.
                  </>
                ) : (
                  <>
                    These are made fresh to order, so this one needs {notice.hours}h notice.
                  </>
                )}
              </p>
              {/* Bulk is a conversation, not just a longer wait — the client
                  wants to quote these directly. Only offered when the quantity
                  is genuinely what drove the window; it used to appear on any
                  single preorder cake. */}
              {notice.cause === "bulk" && (
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
                {deliveryCharge === "free" ? (
                  <span className="font-semibold text-mint-deep">
                    🎉 Congratulations &mdash; delivery on this order is free.
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
              {isDailyCart
                ? effectiveFulfillment === "pickup"
                  ? `Today's Menu: ready to collect from ${formatNotice(noticeHours)} after you order`
                  : `Today's Menu: delivered from ${formatNotice(noticeHours)} after you order`
                : `Please order at least ${formatNotice(noticeHours)} ahead`}
            </Badge>
            {dailyDeliveryClosedToday && (
              <p className="mb-3 rounded-xl bg-yellow-soft px-3 py-2 text-sm text-ink">
                <strong>Delivery isn&rsquo;t possible today any more.</strong> Today&rsquo;s Menu
                deliveries need {formatNotice(noticeHours)} and end at{" "}
                {formatClock(deliveryWindow.to)}. Please choose <strong>Pickup</strong> above.
              </p>
            )}
            {isDailyCart && !dailyDeliveryClosedToday && (
              <p className="mb-3 text-sm text-ink-soft">
                {effectiveFulfillment === "pickup"
                  ? `Today's bakes are already made, so you can collect from ${formatNotice(noticeHours)} after ordering.`
                  : `Deliveries take up to ${formatNotice(noticeHours)}, for traffic and the unexpected.`}{" "}
                Today&rsquo;s Menu is for today only.
              </p>
            )}
            {effectiveFulfillment === "delivery" && (
              <p className="mb-3 text-sm text-ink-soft">
                We deliver between {formatClock(deliveryWindow.from)} and {formatClock(deliveryWindow.to)} IST.
              </p>
            )}
            <Input
              id="requested-slot"
              type="datetime-local"
              label="Requested date & time (IST)"
              value={requestedSlot}
              min={minSlot}
              max={isDailyCart ? `${todayKey}T23:59` : undefined}
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
                placeholder="+91 98765 43210"
              />
              <p className="text-xs text-ink-faint sm:col-span-2">
                We will confirm your order on this number.
              </p>
            </div>
          </div>

          {effectiveFulfillment === "delivery" && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <MapPin size={20} className="text-cocoa" /> Delivery Address
              </h2>

              {/* Two panels, because the two situations are opposite and the
                  page used to show only the warning. An order over the free
                  threshold got a green "qualifies for free delivery" line at
                  the fulfilment step and then this, flatly contradicting it,
                  the moment Delivery was picked.

                  Below the threshold the warning stays, and has to: the charge
                  depends on distance and is set by staff after the order comes
                  in, so it cannot be shown at checkout. Someone who pays online
                  and is then quoted a fee they were never warned about has a
                  legitimate complaint, and a disputed charge against a new
                  payment account is expensive. */}
              {deliveryCharge === "free" ? (
                <p className="mb-4 rounded-xl bg-mint-soft px-4 py-3 text-sm leading-relaxed text-ink">
                  {/* Non-null whenever deliveryCharge is "free" — a missing
                      threshold resolves to "quoted" — but the compiler cannot
                      see that through the derived value. */}
                  <strong>🎉 Congratulations &mdash; your delivery is free!</strong> This
                  order is over {formatPrice(freeDeliveryOver ?? 0)}, so it comes to you
                  on us. There is nothing to pay when it arrives.
                </p>
              ) : (
                <p className="mb-4 rounded-xl bg-pink-soft px-4 py-3 text-sm leading-relaxed text-ink">
                  <strong>Delivery is charged separately.</strong> The amount you
                  pay now covers the bakes only. We work out the delivery charge
                  from your address and confirm it with you before we set off —
                  it is paid in cash when your order arrives.
                  {freeDeliveryOver != null && (
                    <>
                      {" "}
                      Orders over {formatPrice(freeDeliveryOver)} are delivered free.
                    </>
                  )}
                </p>
              )}
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

              {/* The last thing the customer reads before placing the order,
                  so it has to agree with the two panels above it. This one was
                  unconditional: a ₹12,000 basket was told delivery was on us
                  at the address step, then that a charge would be confirmed
                  and paid in cash, on the very next screen. */}
              {effectiveFulfillment === "delivery" && (
                <p
                  className={`mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed text-ink ${
                    deliveryCharge === "free" ? "bg-mint-soft" : "bg-pink-soft"
                  }`}
                >
                  {deliveryCharge === "free" ? (
                    <>
                      <strong>🎉 Congratulations &mdash; delivery is free on this order.</strong>{" "}
                      You are over {formatPrice(freeDeliveryOver ?? 0)}, so {formatPrice(totalCents)}{" "}
                      is the whole of it. Nothing to pay on arrival.
                    </>
                  ) : (
                    <>
                      This total is for the bakes only. Your delivery charge depends
                      on the distance, and we will confirm it with you before
                      delivery &mdash; payable in cash on arrival.
                    </>
                  )}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-ink mb-3">Details</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div><span className="text-ink-faint">Name:</span> {guest.name}</div>
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

          {/* How to pay. Cash only where the order API allows it: pickups,
              and by default Today's Menu only (lib/payments/cash.ts). */}
          {cashCheck.allowed ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-ink">How would you like to pay?</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["upi", "Pay now by UPI", "Recommended. Your order is confirmed as soon as the money reaches us."],
                    ["cash", "Pay cash when I collect", "Bring the exact amount. We hold your order for 30 minutes after your pickup time."],
                  ] as const
                ).map(([value, title, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChosenPayMethod(value)}
                    aria-pressed={payMethod === value}
                    className={`rounded-2xl border p-4 text-left transition-colors ${payMethod === value ? "border-pink bg-pink-soft" : "border-ink/15 bg-white hover:border-pink"}`}
                  >
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">{hint}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            cashSetting !== "off" &&
            cashCheck.reason && <p className="text-xs text-ink-soft">{cashCheck.reason}</p>
          )}

          {payMethod === "cash" ? (
            <div className="rounded-xl bg-mint-soft border border-mint/20 p-4">
              <h3 className="mb-2 text-sm font-semibold text-ink">Paying cash at pickup</h3>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
                <li>Place your order. Nothing to pay now.</li>
                <li>
                  Collect it at your pickup time and pay{" "}
                  <strong className="text-ink">{formatPrice(totalCents)}</strong> in cash.
                </li>
                <li>
                  We hold your order for <strong className="text-ink">30 minutes</strong> after your
                  pickup time. Can&rsquo;t make it? Tell us on WhatsApp so the bakes can go to someone
                  else.
                </li>
              </ol>
            </div>
          ) : (
          /* Said BEFORE the order is placed, so nobody is surprised by the
              QR, the deadline or the WhatsApp step on the next page. */
          <div className="rounded-xl bg-mint-soft border border-mint/20 p-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">How payment works</h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
              <li>
                Place your order. The next page shows a UPI QR code for exactly{" "}
                <strong className="text-ink">{formatPrice(totalCents)}</strong>.
              </li>
              <li>
                Pay by UPI within <strong className="text-ink">{paymentWindowMinutes} minutes</strong>{" "}
                &mdash; Google Pay, PhonePe, Paytm, BHIM or your bank&rsquo;s app.
              </li>
              <li>Send us the payment screenshot on WhatsApp.</li>
              <li>
                We confirm your order once the money reaches us. Nothing is baked before
                that.
              </li>
            </ol>
            <p className="mt-2 text-xs text-ink-soft">
              {effectiveFulfillment === "delivery"
                ? "Deliveries are paid by UPI before we set off. No cards, and no cash on delivery for the bakes."
                : "No card payments."}
            </p>
          </div>
          )}

          <p className="text-xs text-ink-soft">
            By placing this order you agree to our{" "}
            <a href="/policies/terms" target="_blank" className="font-semibold text-ink underline underline-offset-2">
              Terms
            </a>{" "}
            and{" "}
            <a href="/policies/refunds" target="_blank" className="font-semibold text-ink underline underline-offset-2">
              Refunds &amp; Cancellations policy
            </a>
            .
          </p>

          <div className="flex justify-between">
            <Button onClick={() => setStep("details")} variant="ghost" disabled={submitting}>
              ← Back
            </Button>
            <Button onClick={handleSubmitOrder} variant="primary" size="lg" disabled={submitting}>
              {submitting ? "Placing order..." : payMethod === "cash" ? "Place order" : "Place order & pay"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
