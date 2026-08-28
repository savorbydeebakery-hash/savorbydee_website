import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { sendOrderConfirmation, sendStaffNotification } from "@/lib/email/send";
import { validateCart, validateGuestInfo, validateDeliveryAddress } from "@/lib/cart/validation";
import type { CartItem } from "@/lib/cart/types";

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
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
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
        requested_slot: new Date(requestedSlot).toISOString(),
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
      const orderUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
        "supabase.co",
        ""
      )}orders/${humanId}`;

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
        requestedSlot: new Date(requestedSlot).toLocaleString("en-IN"),
        pickupAddress: fulfillment === "pickup" ? "SAVOR Bakery, Kolkata" : undefined,
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
        requestedSlot: new Date(requestedSlot).toLocaleString("en-IN"),
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
