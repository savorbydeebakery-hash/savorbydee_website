import { describe, it, expect } from "vitest";
import { buildUpiUri, isValidVpa, upiAmount, cleanPayeeName, transactionNote } from "./upi";
import {
  paymentStage,
  acceptsPayment,
  isWaitingOnBakery,
  adminPaymentBadge,
  paymentDifferenceCents,
} from "./state";
import { waNumber, waLink, paymentProofMessage } from "./whatsapp";
import { normalizePaymentReference } from "./reference";
import { buildOrderPayment, publicOrder } from "./order-payment";

describe("UPI links", () => {
  it("accepts real UPI IDs and refuses phone numbers and URLs", () => {
    expect(isValidVpa("savorbydee@okaxis")).toBe(true);
    expect(isValidVpa("doretta.blah-1@ybl")).toBe(true);
    expect(isValidVpa("9876543210@paytm")).toBe(true);
    expect(isValidVpa("9876543210")).toBe(false);
    expect(isValidVpa("https://savorbydee.in")).toBe(false);
    expect(isValidVpa("name@")).toBe(false);
    expect(isValidVpa("")).toBe(false);
    expect(isValidVpa(null)).toBe(false);
  });

  it("always sends the amount with two decimals", () => {
    expect(upiAmount(125000)).toBe("1250.00");
    expect(upiAmount(49950)).toBe("499.50");
    expect(upiAmount(100)).toBe("1.00");
  });

  it("builds a link with the exact amount and the order number", () => {
    const uri = buildUpiUri({
      vpa: "savorbydee@okaxis",
      payeeName: "Savor by Dee",
      amountCents: 125000,
      note: transactionNote("SAV-260928-0012"),
    });
    expect(uri).toBe(
      "upi://pay?pa=savorbydee%40okaxis&pn=Savor%20by%20Dee&am=1250.00&cu=INR&tn=Savor%20SAV-260928-0012"
    );
    // Spaces as %20, never "+": some apps print a literal plus.
    expect(uri).not.toContain("+");
  });

  it("strips characters UPI apps choke on from the payee name", () => {
    expect(cleanPayeeName("Savor & Dee 🎂")).toBe("Savor Dee");
    expect(cleanPayeeName("  Doretta   Blah ")).toBe("Doretta Blah");
  });
});

describe("payment stage", () => {
  const due = "2026-09-28T10:00:00Z";
  const before = Date.parse("2026-09-28T09:30:00Z");
  const after = Date.parse("2026-09-28T10:30:00Z");

  it("cancelled wins over every payment state", () => {
    for (const payment_status of ["unpaid", "pending", "paid", "failed", "refunded"]) {
      expect(paymentStage({ status: "cancelled", payment_status, payment_due_at: due }, after)).toBe("cancelled");
    }
  });

  it("maps the payment column", () => {
    expect(paymentStage({ status: "pending", payment_status: "paid" })).toBe("paid");
    expect(paymentStage({ status: "pending", payment_status: "pending" })).toBe("checking");
    expect(paymentStage({ status: "pending", payment_status: "failed" })).toBe("not_found");
    expect(paymentStage({ status: "fulfilled", payment_status: "refunded" })).toBe("refunded");
  });

  it("an unpaid order is overdue only after its deadline", () => {
    expect(paymentStage({ status: "pending", payment_status: "unpaid", payment_due_at: due }, before)).toBe("awaiting");
    expect(paymentStage({ status: "pending", payment_status: "unpaid", payment_due_at: due }, after)).toBe("overdue");
  });

  it("an order with no deadline is never overdue", () => {
    expect(paymentStage({ status: "pending", payment_status: "unpaid", payment_due_at: null }, after)).toBe("awaiting");
  });

  it("a claimed payment is being checked even after the deadline", () => {
    expect(paymentStage({ status: "pending", payment_status: "pending", payment_due_at: due }, after)).toBe("checking");
  });

  it("only offers payment when payment is still wanted", () => {
    expect(acceptsPayment("awaiting")).toBe(true);
    expect(acceptsPayment("overdue")).toBe(true);
    expect(acceptsPayment("not_found")).toBe(true);
    expect(acceptsPayment("checking")).toBe(false);
    expect(acceptsPayment("paid")).toBe(false);
    expect(acceptsPayment("cancelled")).toBe(false);
  });

  it("stops polling once nothing more can happen", () => {
    expect(isWaitingOnBakery("checking")).toBe(true);
    expect(isWaitingOnBakery("paid")).toBe(false);
    expect(isWaitingOnBakery("cancelled")).toBe(false);
    expect(isWaitingOnBakery("refunded")).toBe(false);
  });

  it("tells staff a cancelled-but-paid order needs refunding", () => {
    expect(adminPaymentBadge({ status: "cancelled", payment_status: "paid" }).label).toBe("Cancelled · refund due");
    expect(adminPaymentBadge({ status: "cancelled", payment_status: "unpaid" }).label).toBe("Cancelled");
    expect(adminPaymentBadge({ status: "pending", payment_status: "pending" }).label).toBe("Says paid · check bank");
  });

  it("measures short and over payments", () => {
    expect(paymentDifferenceCents(125000, 125000)).toBe(0);
    expect(paymentDifferenceCents(125000, 120000)).toBe(-5000);
    expect(paymentDifferenceCents(125000, 130000)).toBe(5000);
    expect(paymentDifferenceCents(125000, null)).toBe(null);
  });
});

describe("WhatsApp", () => {
  it("normalises every way a number gets typed", () => {
    expect(waNumber("919876543210")).toBe("919876543210");
    expect(waNumber("+91 98765 43210")).toBe("919876543210");
    expect(waNumber("9876543210")).toBe("919876543210");
    expect(waNumber("09876543210")).toBe("919876543210");
    expect(waNumber("0091 98765 43210")).toBe("919876543210");
    expect(waNumber("12345")).toBe(null);
    expect(waNumber("")).toBe(null);
    expect(waNumber(null)).toBe(null);
  });

  const fullOrder = {
    human_id: "SAV-260928-0012",
    guest_name: "Asha",
    guest_phone: "9876543210",
    fulfillment: "delivery",
    requested_slot: "2026-09-29T07:00:00Z",
    delivery_address: "12 Laitumkhrah Main Road",
    delivery_landmark: "Don Bosco Square",
    notes: "Write Happy Birthday Mei",
    order_items: [
      { name: "Chocolate Truffle Cake", quantity: 1, line_total_cents: 95000, selections: { weight: "1 kg", decoration: "Basic" } },
      { name: "Brownie", quantity: 2, line_total_cents: 30000, selections: {} },
    ],
  };

  it("puts the whole order in the proof message", () => {
    const text = paymentProofMessage({
      order: fullOrder,
      amountCents: 125000,
      reference: "123456789012",
      freeDeliveryOverCents: 1000000,
    });
    expect(text).toBe(
      [
        "Hi Savor by Dee! I've paid for my order.",
        "",
        "*Order:* SAV-260928-0012",
        "*Total:* ₹1250",
        "",
        "*Items*",
        "• 1× Chocolate Truffle Cake (1 kg · Basic decoration) — ₹950",
        "• 2× Brownie — ₹300",
        "",
        "*Name:* Asha",
        "*Phone:* 9876543210",
        "*Delivery:* Tue, 29 Sept, 12:30 pm IST",
        "*Address:* 12 Laitumkhrah Main Road (near Don Bosco Square)",
        "*Delivery charge:* to be confirmed — paid in cash on arrival",
        "*Notes:* Write Happy Birthday Mei",
        "*UPI transaction ID:* 123456789012",
        "",
        "My payment screenshot is attached.",
      ].join("\n")
    );
  });

  it("says delivery is free over the threshold, and leaves out what a pickup does not have", () => {
    const free = paymentProofMessage({ order: fullOrder, amountCents: 1200000, freeDeliveryOverCents: 1000000 });
    expect(free).toContain("*Delivery charge:* Free");

    const pickup = paymentProofMessage({
      order: { human_id: "SAV-1", guest_name: "Asha", guest_phone: "98", fulfillment: "pickup", requested_slot: "2026-09-29T07:00:00Z" },
      amountCents: 50000,
    });
    expect(pickup).toContain("*Pickup:* Tue, 29 Sept, 12:30 pm IST");
    expect(pickup).not.toMatch(/Address|Delivery charge|Notes|Items|UPI transaction ID/);
  });

  it("encodes the message into the link", () => {
    expect(waLink("919876543210", "Hi there\nline two")).toBe(
      "https://wa.me/919876543210?text=Hi%20there%0Aline%20two"
    );
  });
});

describe("transaction IDs", () => {
  it("treats differently formatted copies of one ID as the same ID", () => {
    expect(normalizePaymentReference("1234 5678 9012")).toBe("123456789012");
    expect(normalizePaymentReference("123456789012.")).toBe("123456789012");
    expect(normalizePaymentReference("t2309281234abcd")).toBe("T2309281234ABCD");
  });

  it("drops things that cannot be a transaction ID", () => {
    expect(normalizePaymentReference("paid")).toBe(null);
    expect(normalizePaymentReference("12")).toBe(null);
    expect(normalizePaymentReference("")).toBe(null);
    expect(normalizePaymentReference("I paid ₹1250 yesterday")).toBe(null);
  });
});

describe("order payment block", () => {
  const order = { human_id: "SAV-260928-0012", total_cents: 125000, payment_due_at: "2026-09-28T10:00:00Z" };

  it("asks for the stored order total, never anything else", () => {
    const p = buildOrderPayment(order, { upi_id: "savorbydee@okaxis", bakery_name: "Savor by Dee" });
    expect(p.amountCents).toBe(125000);
    expect(p.upi?.uri).toContain("am=1250.00");
    expect(p.upi?.uri).toContain("tn=Savor%20SAV-260928-0012");
  });

  it("offers no QR at all when the UPI ID is missing or wrong", () => {
    expect(buildOrderPayment(order, {}).upi).toBe(null);
    expect(buildOrderPayment(order, { upi_id: "9876543210" }).upi).toBe(null);
    expect(buildOrderPayment(order, null).upi).toBe(null);
  });

  it("uses the payments WhatsApp number, falling back to the main one", () => {
    expect(buildOrderPayment(order, { payment_whatsapp_number: "9000000001", whatsapp_number: "919000000002" }).whatsapp).toBe(
      "919000000001"
    );
    expect(buildOrderPayment(order, { whatsapp_number: "919000000002" }).whatsapp).toBe("919000000002");
    expect(buildOrderPayment(order, {}).whatsapp).toBe(null);
  });

  it("defaults the payment window when settings have none", () => {
    expect(buildOrderPayment(order, {}).windowMinutes).toBe(60);
    expect(buildOrderPayment(order, { payment_window_minutes: 30 }).windowMinutes).toBe(30);
  });

  it("never sends staff-only columns to the customer", () => {
    const shown = publicOrder({
      human_id: "SAV-1",
      total_cents: 1,
      payment_note: "suspicious",
      payment_verified_by: "uuid",
      razorpay_order_id: "idem-x",
      customer_id: "uuid",
    });
    expect(shown).toEqual({ human_id: "SAV-1", total_cents: 1 });
  });
});
