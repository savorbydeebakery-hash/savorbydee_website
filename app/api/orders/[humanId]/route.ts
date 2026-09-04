import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { samePhone } from "@/lib/customers/phone";

/**
 * GET /api/orders/[humanId]?phone=...
 *
 * Retrieve a single order, verified by the phone number on it. Compared on the
 * last ten digits — see normalizePhone for why a strict string match would
 * turn a customer away from their own order.
 * Uses service-role client (bypasses RLS) for guest order retrieval.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ humanId: string }> }
) {
  try {
    const { humanId } = await params;
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "A phone number is required for order lookup" },
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

    if (!samePhone(order.guest_phone, phone)) {
      return NextResponse.json(
        { error: "That order number and phone number do not match." },
        { status: 403 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[api/orders/[id]] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
