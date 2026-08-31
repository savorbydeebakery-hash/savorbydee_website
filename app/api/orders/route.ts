import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { sendOrderConfirmation, sendStaffNotification } from "@/lib/email/send";
import {
  validateCart,
  validateGuestInfo,
  validateDeliveryAddress,
  getRequiredNoticeHours,
  validateSlotAgainstHours,
  DEFAULT_NOTICE_RULES,
} from "@/lib/cart/validation";
import type { CartItem } from "@/lib/cart/types";
import { istInputToInstant, formatIstSlot, istDateParts } from "@/lib/time/ist";

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
      guest: { name: string; phone: string; email: string };
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
        "global_notice_hours, bulk_threshold, bulk_notice_hours, custom_cake_notice_days, weekly_hours, holidays, bakery_name, address_line1, address_line2, address_city, address_state"
      )
      .eq("id", 1)
      .single();

    const noticeRules = {
      globalNoticeHours:
        noticeSettings?.global_notice_hours ?? DEFAULT_NOTICE_RULES.globalNoticeHours,
      bulkThreshold: noticeSettings?.bulk_threshold ?? DEFAULT_NOTICE_RULES.bulkThreshold,
      bulkNoticeHours:
        noticeSettings?.bulk_notice_hours ?? DEFAULT_NOTICE_RULES.bulkNoticeHours,
      customCakeNoticeDays:
        noticeSettings?.custom_cake_notice_days ?? DEFAULT_NOTICE_RULES.customCakeNoticeDays,
    };

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

    const requiredHours = getRequiredNoticeHours(items as CartItem[], noticeRules);
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
        .select("id, name, stock_count, is_sold_out")
        .in("id", [...orderedByItem.keys()]);

      for (const row of stockRows ?? []) {
        const wanted = orderedByItem.get(row.id) ?? 0;

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
        guest_email: guest.email,
        guest_phone: guest.phone,
        delivery_address: fulfillment === "delivery" ? deliveryAddress?.address ?? null : null,
        delivery_landmark: fulfillment === "delivery" ? deliveryAddress?.landmark ?? null : null,
        requested_slot: slot.toISOString(),
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

    // --- Send emails (non-blocking — don't fail the order if email fails) ---
    try {
      // This used to be built by stripping "supabase.co" out of the Supabase
      // project URL, which produced links like
      // "https://tkzbroymiyvnigqxcpze.orders/SAV-..." in the customer's
      // confirmation email. The request's own origin is the site the customer
      // just ordered from, which is what the link should point at.
      const orderUrl = `${request.nextUrl.origin}/orders/${humanId}`;

      // Zone-pinned. Rendered on a Workers runtime, a bare
      // toLocaleString("en-IN") sets the locale but leaves the zone as UTC, so
      // customers were emailed a time 5h30m before the slot they booked.
      const slotLabel = `${formatIstSlot(slot)} IST`;

      const pickupAddress =
        [
          noticeSettings?.bakery_name,
          noticeSettings?.address_line1,
          noticeSettings?.address_line2,
          noticeSettings?.address_city,
          noticeSettings?.address_state,
        ]
          .filter(Boolean)
          .join(", ") || undefined;

      // Customer confirmation
      await sendOrderConfirmation(guest.email, {
        customerName: guest.name,
        humanId,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          lineTotal: `₹${(item.lineTotalCents / 100).toFixed(0)}`,
        })),
        total: `₹${(totalCents / 100).toFixed(0)}`,
        fulfillment,
        requestedSlot: slotLabel,
        pickupAddress: fulfillment === "pickup" ? pickupAddress : undefined,
        paymentStatus: "Pending",
        orderUrl,
      });

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
 * GET /api/orders?id=SAV-XXXXXX-XXXX&email=...&phone=...
 * Guest order retrieval (gap fix) — verifies email + phone match.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const humanId = searchParams.get("id");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (!humanId || !email || !phone) {
      return NextResponse.json(
        { error: "Order ID, email, and phone are required" },
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

    // Verify email + phone match (service-role client bypasses RLS)
    if (
      order.guest_email?.toLowerCase() !== email.toLowerCase() ||
      order.guest_phone?.replace(/\s/g, "") !== phone.replace(/\s/g, "")
    ) {
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
