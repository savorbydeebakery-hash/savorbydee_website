import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { sendStaffNotification } from "@/lib/email/send";
import {
  validateCart,
  validateGuestInfo,
  validateDeliveryAddress,
  getRequiredNoticeHours,
  validateSlotAgainstHours,
  validateDeliveryWindow,
  DEFAULT_NOTICE_RULES,
} from "@/lib/cart/validation";
import type { CartItem } from "@/lib/cart/types";
import { istInputToInstant, formatIstSlot, istDateParts } from "@/lib/time/ist";
import { getOpenState, DEFAULT_DAILY_MENU_CUTOFF } from "@/lib/shop/open-state";
import { samePhone } from "@/lib/customers/phone";

/**
 * Resolve the logged-in customer id from the request's auth cookies.
 * Returns null for guest checkout.
 */
async function resolveCustomerId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Sessions are not modified here (read-only lookup).
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (e) {
    console.error("[api/orders] resolveCustomerId error:", e);
    return null;
  }
}


/**
 * POST /api/orders — Create a new order.
 * Supports guest checkout (no auth required).
 * Returns the full order data in the 201 response (gap fix: guest order retrieval).
 *
 * Idempotency: client sends an idempotency-key header; if we've seen it,
 * return the existing order instead of creating a duplicate.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      items: CartItem[];
      totalCents: number;
      fulfillment: "pickup" | "delivery";
      requestedSlot: string;
      guest: { name: string; phone: string };
      deliveryAddress?: {
        address: string;
        landmark?: string;
      };
      notes?: string;
    };
    const idempotencyKey = request.headers.get("idempotency-key");

    const {
      items,
      totalCents,
      fulfillment,
      requestedSlot,
      guest,
      deliveryAddress,
      notes,
    } = body;

    // --- Validation ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const cartValidation = validateCart(items as CartItem[]);
    if (!cartValidation.valid) {
      return NextResponse.json(
        { error: cartValidation.errors.join("; ") },
        { status: 400 }
      );
    }

    const guestValidation = validateGuestInfo(guest);
    if (!guestValidation.valid) {
      return NextResponse.json(
        { error: guestValidation.errors.join("; ") },
        { status: 400 }
      );
    }

    if (fulfillment === "delivery") {
      if (!deliveryAddress) {
        return NextResponse.json(
          { error: "Delivery address is required" },
          { status: 400 }
        );
      }
      const addrValidation = validateDeliveryAddress(deliveryAddress);
      if (!addrValidation.valid) {
        return NextResponse.json(
          { error: addrValidation.errors.join("; ") },
          { status: 400 }
        );
      }
    }

    if (!requestedSlot) {
      return NextResponse.json(
        { error: "Requested slot is required" },
        { status: 400 }
      );
    }

    // --- Notice window (AUTHORITATIVE) ---
    // The checkout applies the same rule, but that runs in the browser and is
    // trivially skipped by posting here directly — so until now an order could
    // be booked for a slot inside the notice window, which the kitchen then
    // cannot physically meet. This is the check that actually holds.
    //
    // Rules come from site_settings rather than the constant, so raising the
    // notice period in the admin panel takes effect immediately and cannot
    // drift from what the checkout showed the customer.
    // Anon client on purpose: site_settings is world-readable (RLS policy
    // settings_select_public), so this needs no privilege. Validating input
    // before building a service-role client also means a bad slot is rejected
    // as a 400 rather than failing later as a 500 if that secret is missing.
    const { data: noticeSettings } = await createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
      .from("site_settings")
      .select(
        "global_notice_hours, preorder_notice_hours, bulk_threshold, bulk_notice_hours, custom_cake_notice_days, weekly_hours, holidays, daily_menu_cutoff, delivery_enabled, delivery_from, delivery_to, free_delivery_threshold_cents, bakery_name, address_line1, address_line2, address_city, address_state"
      )
      .eq("id", 1)
      .single();

    const noticeRules = {
      globalNoticeHours:
        noticeSettings?.global_notice_hours ?? DEFAULT_NOTICE_RULES.globalNoticeHours,
      preorderNoticeHours:
        noticeSettings?.preorder_notice_hours ?? DEFAULT_NOTICE_RULES.preorderNoticeHours,
      bulkThreshold: noticeSettings?.bulk_threshold ?? DEFAULT_NOTICE_RULES.bulkThreshold,
      bulkNoticeHours:
        noticeSettings?.bulk_notice_hours ?? DEFAULT_NOTICE_RULES.bulkNoticeHours,
      customCakeNoticeDays:
        noticeSettings?.custom_cake_notice_days ?? DEFAULT_NOTICE_RULES.customCakeNoticeDays,
    };

    // Delivery can be switched off in admin. The checkout hides the tile, but
    // that is the browser's copy of the rule. Checked here rather than with the
    // other fulfillment validation further up, because it needs site_settings,
    // which is not read until this point.
    if (fulfillment === "delivery" && noticeSettings?.delivery_enabled === false) {
      return NextResponse.json(
        { error: "We are not delivering at the moment. Please choose collection." },
        { status: 400 }
      );
    }

    // --- Business hours (AUTHORITATIVE) ---
    // "Orders will be reviewed only during business hours." The storefront
    // greys the menu out and refuses the add-to-cart, but a tab left open
    // since the afternoon would still post here at midnight.
    const openState = getOpenState(
      noticeSettings?.weekly_hours as Parameters<typeof getOpenState>[0],
      (noticeSettings?.holidays as string[] | null) ?? [],
      noticeSettings?.daily_menu_cutoff ?? DEFAULT_DAILY_MENU_CUTOFF
    );

    if (!openState.isOpen) {
      const back = openState.nextOpen
        ? ` We reopen ${formatIstSlot(openState.nextOpen)} IST.`
        : "";
      return NextResponse.json(
        {
          error: `We are closed and not accepting orders right now.${back}`,
          reopensAt: openState.nextOpen?.toISOString() ?? null,
        },
        { status: 400 }
      );
    }

    // The checkout posts a naive wall clock from a `datetime-local` input.
    // `new Date()` would resolve that against the *runtime's* zone, which is
    // UTC on Workers — so a 06:07 slot picked in Shillong was stored as 06:07Z
    // and every check below inherited a 5h30m skew in the lenient direction.
    // Read as IST, always, whatever zone the customer's device is set to.
    const slot = istInputToInstant(requestedSlot);
    if (!slot) {
      return NextResponse.json(
        { error: "Requested slot is not a valid date" },
        { status: 400 }
      );
    }
    const slotMs = slot.getTime();

    // Fallback only — replaced by the database-derived value inside the block
    // below whenever the ordered items are actually found.
    let requiredHours = getRequiredNoticeHours(items as CartItem[], noticeRules);

    // --- Stock (AUTHORITATIVE) ---
    // Same reasoning as the notice window: the modal caps the quantity picker,
    // but that cap lives in the browser. An item with stock_count null is not
    // tracked and is skipped entirely — most of the catalogue is untracked, so
    // this must not turn into a blanket rejection.
    const orderedByItem = new Map<string, number>();
    for (const line of items as CartItem[]) {
      if (!line.menuItemId) continue;
      orderedByItem.set(
        line.menuItemId,
        (orderedByItem.get(line.menuItemId) ?? 0) + line.quantity
      );
    }

    if (orderedByItem.size > 0) {
      const { data: stockRows } = await createPublicClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
        .from("menu_items")
        .select("id, name, stock_count, is_sold_out, daily_menu, notice_hours, bulk_threshold, requires_custom_notice, categories(notice_hours, bulk_threshold)")
        .in("id", [...orderedByItem.keys()]);

      // Rebuild the cart from what the database says these items are, then
      // take the notice window from that. Same shape as a CartItem so the one
      // resolver covers both sides.
      const trustedLines = (stockRows ?? []).map((row) => {
        const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
        return {
          quantity: orderedByItem.get(row.id) ?? 0,
          dailyMenu: row.daily_menu,
          noticeHours: row.notice_hours ?? cat?.notice_hours ?? null,
          bulkThreshold: row.bulk_threshold ?? cat?.bulk_threshold ?? null,
          requiresCustomNotice: row.requires_custom_notice,
        } as unknown as CartItem;
      });

      if (trustedLines.length > 0) {
        requiredHours = getRequiredNoticeHours(trustedLines, noticeRules);

        // One order, one collection slot. A basket spanning both menus cannot
        // honour either window.
        const kinds = new Set(trustedLines.map((l) => (l.dailyMenu === false ? "preorder" : "daily")));
        if (kinds.size > 1) {
          return NextResponse.json(
            {
              error:
                "This order mixes today's menu with preorder items, which are ready on " +
                "different schedules. Please place them as two separate orders.",
            },
            { status: 400 }
          );
        }
      }

      for (const row of stockRows ?? []) {
        const wanted = orderedByItem.get(row.id) ?? 0;

        // Today's bakes stop being orderable before the shop shuts, so the
        // last of them can be handed over. Preorders are unaffected — they are
        // being baked another day regardless.
        if (row.daily_menu && !openState.dailyMenuOpen) {
          return NextResponse.json(
            {
              error: `${row.name} is on today's menu, which has closed for the evening. It reopens in the morning.`,
            },
            { status: 400 }
          );
        }

        if (row.is_sold_out) {
          return NextResponse.json(
            { error: `${row.name} is sold out. Please remove it from your cart.` },
            { status: 400 }
          );
        }

        if (row.stock_count == null) continue;

        if (row.stock_count === 0) {
          return NextResponse.json(
            { error: `${row.name} is out of stock. Please remove it from your cart.` },
            { status: 400 }
          );
        }

        if (wanted > row.stock_count) {
          return NextResponse.json(
            {
              error: `Only ${row.stock_count} of ${row.name} ${
                row.stock_count === 1 ? "is" : "are"
              } available. Please reduce the quantity.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // requiredHours was computed above from the DATABASE rows, not from the
    // posted cart. dailyMenu, noticeHours and bulkThreshold all ride on the
    // cart line, so a caller could otherwise post a preorder cake claiming to
    // be a 2-hour daily bake. The fallback below only applies when the item
    // lookup found nothing at all.
    // 60s of slack. Someone who picks the earliest valid slot and submits a few
    // seconds later would otherwise be rejected for being marginally too early,
    // which is a false failure rather than an attempt to dodge the rule.
    const earliestMs = Date.now() + requiredHours * 3_600_000 - 60_000;

    if (slotMs < earliestMs) {
      return NextResponse.json(
        {
          error: `This order needs at least ${requiredHours} hours notice. Please choose a later slot.`,
          requiredNoticeHours: requiredHours,
        },
        { status: 400 }
      );
    }

    // --- Opening hours (AUTHORITATIVE) ---
    // weekly_hours and holidays have been editable in the admin panel since it
    // was built and nothing read either one, so a Sunday marked closed was
    // still bookable. Enforced here for the same reason the notice window is:
    // the browser's copy of the rule is advisory.
    const hoursCheck = validateSlotAgainstHours(
      slot,
      noticeSettings?.weekly_hours as Parameters<typeof validateSlotAgainstHours>[1],
      (noticeSettings?.holidays as string[] | null) ?? []
    );
    if (!hoursCheck.valid) {
      return NextResponse.json({ error: hoursCheck.error }, { status: 400 });
    }

    // Delivery runs 10:00-20:00, narrower than the shop's own 09:00-21:00.
    // Only applied to delivery orders — collection at 09:30 is fine.
    if (fulfillment === "delivery") {
      const windowCheck = validateDeliveryWindow(
        slot,
        noticeSettings?.delivery_from,
        noticeSettings?.delivery_to
      );
      if (!windowCheck.valid) {
        return NextResponse.json({ error: windowCheck.error }, { status: 400 });
      }
    }

    const supabase = createAdminClient();

    // --- Resolve logged-in customer for account-linked orders ---
    const customerId = await resolveCustomerId(request);

    // --- Idempotency check ---
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("orders")
        .select("*")
        .eq("razorpay_order_id", `idem-${idempotencyKey}`)
        .single();

      if (existing) {
        return NextResponse.json({ order: existing, deduplicated: true }, { status: 200 });
      }
    }

    // --- Generate human_id: SAV-YYMMDD-NNNN ---
    // IST parts, not the runtime's: on a UTC worker an order placed between
    // midnight and 05:30 IST was stamped with the previous day's date.
    const { yy, mm, dd } = istDateParts();
    const datePart = `${yy}${mm}${dd}`;

    // Get next sequence value
    const { data: seqData } = await supabase.rpc("nextval_sequence", {
      seq_name: "order_daily_seq",
    });

    // Fallback: use a random number if RPC isn't available
    const seqNum = seqData ?? Math.floor(Math.random() * 9999) + 1;
    const seqPart = String(seqNum).padStart(4, "0");
    const humanId = `SAV-${datePart}-${seqPart}`;

    // --- Create order ---
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        human_id: humanId,
        kind: "standard",
        status: "pending",
        fulfillment,
        guest_name: guest.name,
        // No email is collected any more; the column stays for older orders.
        guest_email: null,
        guest_phone: guest.phone,
        delivery_address: fulfillment === "delivery" ? deliveryAddress?.address ?? null : null,
        delivery_landmark: fulfillment === "delivery" ? deliveryAddress?.landmark ?? null : null,
        requested_slot: slot.toISOString(),
        // NULL means "not quoted yet" and 0 means "free" — see HANDOFF on why
        // delivery_fee_cents is deliberately not folded into total_cents. An
        // order over the threshold is free by rule, so it is recorded as 0
        // here rather than waiting for staff to quote a charge they would then
        // have to zero by hand. Everything else stays NULL for them to quote.
        delivery_fee_cents:
          fulfillment === "delivery" &&
          noticeSettings?.free_delivery_threshold_cents != null &&
          totalCents >= noticeSettings.free_delivery_threshold_cents
            ? 0
            : null,
        payment_status: "unpaid",
        total_cents: totalCents,
        notes: notes || null,
        razorpay_order_id: idempotencyKey ? `idem-${idempotencyKey}` : null,
      })
      .select("*")
      .single();

    if (orderError) {
      console.error("[api/orders] Insert error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // --- Create order items ---
    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      name: item.name,
      unit_price_cents: item.unitPriceCents,
      quantity: item.quantity,
      selections: item.selections,
      line_total_cents: item.lineTotalCents,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("[api/orders] Items insert error:", itemsError);
      // Order created but items failed — still return the order
    }

    // --- Reduce stock ---
    // After the order exists, so a failure here cannot lose a paid-for order,
    // and through an RPC so the subtraction happens inside the database: two
    // checkouts in the same second would otherwise both read the old value.
    // Untracked items (stock_count null) are skipped by the function itself.
    try {
      const { error: stockError } = await supabase.rpc("decrement_stock", {
        lines: [...orderedByItem.entries()].map(([id, qty]) => ({ id, qty })),
      });
      if (stockError) {
        console.error("[api/orders] Stock decrement error:", stockError);
      }
    } catch (stockError) {
      // Non-fatal. Staff also sell over the counter and correct the number by
      // hand, so an out-of-date count is a known, recoverable state; refusing
      // an order that is already in the database would not be.
      console.error("[api/orders] Stock decrement threw:", stockError);
    }

    // --- Notify staff (non-blocking — don't fail the order if email fails) ---
    try {
      // Zone-pinned. Rendered on a Workers runtime, a bare
      // toLocaleString("en-IN") sets the locale but leaves the zone as UTC, so
      // the staff alert used to show a time 5h30m before the booked slot.
      const slotLabel = `${formatIstSlot(slot)} IST`;

      // orderUrl and pickupAddress went with the customer confirmation email:
      // both existed only to fill that template, and there is no address to
      // send it to any more.

      // Staff notification (triggers alarm)
      await sendStaffNotification({
        humanId,
        customerName: guest.name,
        customerPhone: guest.phone,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),
        total: `₹${(totalCents / 100).toFixed(0)}`,
        fulfillment,
        requestedSlot: slotLabel,
        deliveryAddress:
          fulfillment === "delivery" ? deliveryAddress?.address : undefined,
        notes: notes || undefined,
        adminUrl: `/admin/orders`,
      });

      // Update staff_email_sent_at
      await supabase
        .from("orders")
        .update({ staff_email_sent_at: new Date().toISOString() })
        .eq("id", order.id);
    } catch (emailError) {
      console.error("[api/orders] Email send error:", emailError);
      // Non-fatal — order is still created
    }

    // --- Return full order data (gap fix: guest order retrieval) ---
    return NextResponse.json(
      {
        order: {
          ...order,
          items: orderItems,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/orders] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders?id=SAV-XXXXXX-XXXX&phone=...
 *
 * Guest order retrieval. Email is gone, so the order number plus the phone
 * number on the order are what identify it. Phones are compared on their last
 * ten digits: the same customer is stored as both "9836537447" and
 * "+91 98365 37447" in this table, and a strict string match would refuse
 * someone their own order for typing the country code.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const humanId = searchParams.get("id");
    const phone = searchParams.get("phone");

    if (!humanId || !phone) {
      return NextResponse.json(
        { error: "Order ID and phone number are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("human_id", humanId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Service-role client bypasses RLS, so this comparison is the only gate.
    if (!samePhone(order.guest_phone, phone)) {
      return NextResponse.json(
        { error: "Order details do not match" },
        { status: 403 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[api/orders] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
