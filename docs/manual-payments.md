# Manual UPI payments — how it works and what it guards against

Razorpay is off. Customers pay by UPI to the bakery's own UPI ID and send the
payment screenshot on WhatsApp; staff confirm the money has arrived and mark
the order paid in Admin → Orders.

## The flow

1. **Checkout.** The confirm step says how payment works before the order is
   placed: exact amount, UPI only, pay within the window, send the screenshot,
   nothing is baked until the money arrives.
2. **Order placed.** The server prices the order (never the browser), stores it
   as `payment_status = unpaid`, `payment_method = upi_manual`, and stamps
   `payment_due_at = now + payment_window_minutes`.
3. **Order page.** Shows a UPI QR with the exact amount and the order number
   already filled in (`upi://pay?pa=…&am=…&tn=Savor SAV-…`). The link is built
   on the server from `total_cents`, so what the QR asks for is what the order
   says. On a phone there is a "Pay with a UPI app" button, a "Save QR" button
   (scan it from the gallery inside the UPI app), and copyable UPI ID / amount
   / note for paying by hand.
4. **Proof.** "Send screenshot on WhatsApp" opens WhatsApp with the order
   number, amount and name already typed. Tapping it also records the claim
   (`payment_status = pending`, `payment_claimed_at`) and the UPI transaction
   ID if the customer typed one.
5. **Staff verify.** Admin → Orders shows who has paid, who says they have, and
   who is overdue. "Mark as paid" needs the amount received, the UTR from the
   bank/UPI app, and a tick confirming the money was seen in the account. The
   database stamps who verified it and when.
6. **Customer sees it.** The order page re-checks every 20 seconds while it is
   waiting and flips to "Payment received — order confirmed".

## What can go wrong, and what covers it

| # | Situation | What happens |
|---|---|---|
| 1 | Customer pays a different amount | QR pre-fills the exact amount. Staff record the amount actually received; admin shows "₹X short" or "₹X over". Short: collect the difference before handing over. Over: refund the difference (Refunds policy). |
| 2 | Customer pays but never sends proof | Order stays "Awaiting payment". The order page (and /orders/lookup) keeps offering the WhatsApp button. Staff can still find the payment by the order number in the UPI note and mark it paid. |
| 3 | Customer sends a screenshot but did not pay (fake or edited screenshot) | A screenshot is never treated as payment. "Mark as paid" requires a tick confirming the money was seen in the bank/UPI app, and the UTR. Terms say an order is confirmed only when money reaches the account. |
| 4 | Same screenshot reused for two orders | A verified UTR is unique across orders (database index). The second "Mark as paid" is refused with a message saying so. |
| 5 | Customer pays twice | Staff see the second payment in their bank app; Refunds policy: extra payment refunded in full by UPI within 3 working days. |
| 6 | Customer is on a phone and cannot scan their own screen | "Pay with a UPI app" deep link; "Save QR" to scan from the gallery; copyable UPI ID + amount + note. |
| 7 | UPI app refuses the deep link (some apps block links to personal UPI IDs) | Help text points to Save QR / pay by UPI ID. Using a business (merchant) UPI ID avoids most of this. |
| 8 | Payment fails or is stuck "pending" | Help text: don't pay again; failed debits are reversed by the bank automatically; send the screenshot and we will check. |
| 9 | Amount is over the customer's UPI limit | Help text: message us. |
| 10 | Customer never pays | Order is flagged "Overdue" in admin after the window. The customer page says the time has passed and to message before paying. Staff cancel it; cancelling puts same-day stock back automatically. |
| 11 | Customer pays after the order was cancelled | Refunds policy: refunded in full, or reinstated if the slot can still be met. Admin shows a paid-but-cancelled order clearly. |
| 12 | Kitchen starts an unpaid order | Admin shows the payment state on every row, warns before moving an unpaid order to In progress / Ready / Fulfilled, and the staff email says "do not start until paid". |
| 13 | Price changes between basket and payment | Server reprices at order time; the QR amount comes from the stored order total, which signed-in users cannot edit (database trigger). |
| 14 | Network drops while placing the order | Checkout sends an idempotency key, so a retry returns the same order instead of creating a second one. |
| 15 | Page closed before paying | /orders/lookup (order number + phone) brings back the same payment panel. |
| 16 | UPI ID not set yet | Order page says "We'll send payment details on WhatsApp" with a WhatsApp button instead of a broken QR. |
| 17 | Someone changes the UPI ID to their own | UPI ID, payee name, payment WhatsApp number and payment window are admin-only (database trigger, migration 00040 + 00045). |
| 18 | Someone fakes a "paid" order through the public API | Migration 00045 removes the insert/update policies that let anyone with the public key insert orders directly (verified: a probe insert passed RLS). Orders are only created by the server. |
| 19 | Customer marks their own order paid | Same migration removes the policy that let a signed-in customer update their own order. The claim endpoint can only move an order to "checking", never to paid. |
| 20 | Delivery charge confusion | QR covers the bakes only; the delivery note (cash on arrival, or free over the threshold) repeats next to the payment. |
| 21 | Customer asks "where do I pay?" to a scammer | Terms and the payment panel say: only pay the UPI ID shown on your order page; we never ask you to pay a different ID by phone or WhatsApp. |

## Before going live (needs the client)

- **UPI ID and payee name** — Admin → Settings → Payment. Taken from the QR the
  client sends: scanning it shows `pa=` (the UPI ID) and `pn=` (the name).
- **Payment WhatsApp number** — Admin → Settings → Payment. Blank falls back to
  the main WhatsApp number.
- **Grievance officer name** — Admin → Settings → General. The Consumer
  Protection (E-Commerce) Rules 2020 require one to be named. Until it is set,
  the policy pages show a visible gap.
- Apply `supabase/migrations/00045_manual_upi_payments.sql` in the Supabase SQL
  editor **before** deploying the code.
- Scan the ₹1 test QR in Admin → Settings → Payment with a real UPI app.

The policy text is a careful template that states this bakery's real terms. It
is not legal advice; a lawyer or CA should read it before relying on it.
