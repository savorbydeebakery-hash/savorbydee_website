import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/orders/[humanId]?email=...&phone=...
 * Retrieve a single order by human_id with email+phone verification.
 * Uses service-role client (bypasses RLS) for guest order retrieval.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ humanId: string }> }
) {
  try {
    const { humanId } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (!email || !phone) {
      return NextResponse.json(
        { error: "Email and phone are required for order lookup" },
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

    // Verify email + phone match
    if (
      order.guest_email?.toLowerCase() !== email.toLowerCase() ||
      order.guest_phone?.replace(/\s/g, "") !== phone.replace(/\s/g, "")
    ) {
      return NextResponse.json(
        { error: "Order details do not match. Please check your email and phone." },
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
