import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * The customer's order page in every payment state, with the order API
 * mocked. Needs no database and places no order, so it runs anywhere,
 * including against the deployed worker.
 *
 * What it guards: that each stage says the right thing and offers the right
 * action — a cancelled order never invites payment, a paid one never shows a
 * QR, an unpaid one shows the exact amount — and that "I've paid" records the
 * claim with the customer's phone and transaction ID.
 */

const HUMAN_ID = "SAV-260928-0042";
const PHONE = "9876543210";
const UPI_URI =
  "upi://pay?pa=savorbydee%40okaxis&pn=Savor%20by%20Dee&am=1250.00&cu=INR&tn=Savor%20SAV-260928-0042";

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000042",
    human_id: HUMAN_ID,
    status: "pending",
    fulfillment: "pickup",
    guest_name: "Asha Test",
    guest_phone: PHONE,
    delivery_address: null,
    requested_slot: "2026-09-29T07:00:00Z",
    payment_status: "unpaid",
    // Far in the future unless a test makes it overdue.
    payment_due_at: "2099-01-01T00:00:00Z",
    payment_reference: null,
    total_cents: 125000,
    notes: null,
    order_items: [
      { name: "Chocolate Truffle Cake", quantity: 1, unit_price_cents: 125000, line_total_cents: 125000, selections: {} },
    ],
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    amountCents: 125000,
    upi: { vpa: "savorbydee@okaxis", payeeName: "Savor by Dee", note: `Savor ${HUMAN_ID}`, uri: UPI_URI },
    whatsapp: "919000000001",
    phone: "+91 90000 00001",
    dueAt: "2099-01-01T00:00:00Z",
    windowMinutes: 60,
    freeDeliveryOverCents: 1000000,
    ...overrides,
  };
}

async function mockOrder(page: Page, body: unknown) {
  await page.route(`**/api/orders/${HUMAN_ID}?*`, (route: Route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  );
}

async function open(page: Page) {
  await page.goto(`/orders/${HUMAN_ID}?phone=${PHONE}`);
}

test("unpaid: exact amount, QR, UPI details, and the WhatsApp proof link", async ({ page }) => {
  await mockOrder(page, { order: order(), payment: payment() });
  await open(page);

  await expect(page.getByRole("heading", { name: "Order placed — now pay to confirm" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pay ₹1250 to confirm your order" })).toBeVisible();
  await expect(page.getByAltText(/UPI QR code to pay ₹1250 to Savor by Dee for order SAV-260928-0042/)).toBeVisible();
  await expect(page.getByText("savorbydee@okaxis")).toBeVisible();

  const wa = page.getByRole("link", { name: /I've paid ₹1250 — send screenshot/ });
  const href = await wa.getAttribute("href");
  expect(href).toContain("https://wa.me/919000000001?text=");
  const text = decodeURIComponent(href!.split("text=")[1]);
  expect(text).toContain(HUMAN_ID);
  expect(text).toContain("₹1250");
  expect(text).toContain("Asha Test");

  // No confetti, no "confirmed" before the money arrives.
  await expect(page.getByRole("heading", { name: "Order confirmed", exact: true })).toHaveCount(0);
});

test("tapping the WhatsApp button records the claim with phone and transaction ID", async ({ page, context }) => {
  await mockOrder(page, { order: order(), payment: payment() });
  let claim: { phone?: string; reference?: string } | null = null;
  await page.route(`**/api/orders/${HUMAN_ID}/payment`, async (route) => {
    claim = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ order: { payment_status: "pending", payment_reference: "123456789012" } }),
    });
  });
  // The link opens WhatsApp in a new tab; keep it from leaving the test.
  await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "ok" }));

  await open(page);
  await page.getByLabel("UPI transaction ID (optional)").fill("1234 5678 9012");
  await page.getByRole("link", { name: /send screenshot/ }).click();

  await expect.poll(() => claim).not.toBeNull();
  expect(claim!.phone).toBe(PHONE);
  expect(claim!.reference).toBe("1234 5678 9012");
  // The page moves to "checking" from the response, without a reload.
  await expect(page.getByRole("heading", { name: "Checking your payment", exact: true })).toBeVisible();
});

test("customer says paid: checking, no QR, still able to send the screenshot", async ({ page }) => {
  await mockOrder(page, { order: order({ payment_status: "pending" }), payment: payment() });
  await open(page);

  await expect(page.getByRole("heading", { name: "Checking your payment", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /we’re checking your payment/ })).toBeVisible();
  await expect(page.getByAltText(/UPI QR code/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Send screenshot on WhatsApp" })).toBeVisible();
});

test("overdue: warns before paying, details hidden behind a deliberate click", async ({ page }) => {
  await mockOrder(page, {
    order: order({ payment_due_at: "2020-01-01T00:00:00Z" }),
    payment: payment({ dueAt: "2020-01-01T00:00:00Z" }),
  });
  await open(page);

  await expect(page.getByRole("heading", { name: "The time to pay for this order has passed" })).toBeVisible();
  await expect(page.getByAltText(/UPI QR code/)).toBeHidden();
  await expect(page.getByRole("link", { name: /Message us before paying/ })).toBeVisible();
  await page.getByText("Show payment details anyway").click();
  await expect(page.getByAltText(/UPI QR code/)).toBeVisible();
});

test("payment not found: tells the customer not to pay twice", async ({ page }) => {
  await mockOrder(page, { order: order({ payment_status: "failed" }), payment: payment() });
  await open(page);
  await expect(page.getByRole("heading", { name: "We couldn’t find your payment yet" })).toBeVisible();
  await expect(page.getByText(/don’t pay again/i).first()).toBeVisible();
});

test("paid: confirmed, and no payment request anywhere", async ({ page }) => {
  await mockOrder(page, { order: order({ payment_status: "paid", status: "confirmed" }), payment: payment() });
  await open(page);

  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
  await expect(page.getByText("Payment received — your order is confirmed")).toBeVisible();
  await expect(page.getByAltText(/UPI QR code/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: /send screenshot/i })).toHaveCount(0);
});

test("cancelled and unpaid: never invites payment", async ({ page }) => {
  await mockOrder(page, { order: order({ status: "cancelled" }), payment: payment() });
  await open(page);
  await expect(page.getByRole("heading", { name: "Order cancelled" })).toBeVisible();
  await expect(page.getByText(/Please don’t pay for it/)).toBeVisible();
  await expect(page.getByAltText(/UPI QR code/)).toHaveCount(0);
});

test("cancelled after paying: promises the refund", async ({ page }) => {
  await mockOrder(page, { order: order({ status: "cancelled", payment_status: "paid" }), payment: payment() });
  await open(page);
  await expect(page.getByText(/we’ll refund ₹1250 by UPI to the account you paid from within 3 working days/)).toBeVisible();
});

test("no UPI ID set yet: no QR, says details come on WhatsApp", async ({ page }) => {
  await mockOrder(page, { order: order(), payment: payment({ upi: null }) });
  await open(page);
  await expect(page.getByText(/We’ll send you our UPI payment details on WhatsApp shortly/)).toBeVisible();
  await expect(page.getByAltText(/UPI QR code/)).toHaveCount(0);
});

test("delivery under the free threshold: the QR covers the bakes only", async ({ page }) => {
  await mockOrder(page, { order: order({ fulfillment: "delivery", delivery_address: "Laitumkhrah" }), payment: payment() });
  await open(page);
  await expect(page.getByText(/This covers the bakes only\. The delivery charge/)).toBeVisible();
});

test("an owner-named UPI account is explained, so customers don't think it's the wrong payee", async ({ page }) => {
  await mockOrder(page, {
    order: order(),
    payment: payment({
      upi: {
        vpa: "doretta.blah-googlemail.com@oksbi",
        payeeName: "Doretta Blah",
        note: `Savor ${HUMAN_ID}`,
        uri: "upi://pay?pa=doretta.blah-googlemail.com%40oksbi&pn=Doretta%20Blah&am=1250.00&cu=INR&tn=Savor%20SAV-260928-0042",
      },
    }),
  });
  await open(page);
  await expect(page.getByText(/Your UPI app will show the name Doretta Blah — that’s us/)).toBeVisible();
  await expect(page.getByText("doretta.blah-googlemail.com@oksbi")).toBeVisible();
});
