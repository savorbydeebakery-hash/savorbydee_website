# Razorpay onboarding — message to send to Dee

Copy everything below the line. Fill in the two `<<>>` placeholders first.

Razorpay's dashboard wording shifts occasionally, so a label may read slightly
differently — the order of steps is stable.

---

Hi Dee,

The website is ready to take online payments, but that part can't be switched on
until Razorpay approves an account in your name. I can't apply on your behalf —
it's tied to your PAN and your bank account, so it has to be you. Here's exactly
what to do. Budget about 30 minutes, plus 2–4 working days for their review.

## Before you start, have these ready

- **PAN card** — yours, if the bakery is a sole proprietorship
- **Bank account number + IFSC code** — the account you want the money paid into
- **FSSAI licence** — you already have this. Razorpay asks for it because food
  is a regulated category, and applications without it get held up
- **Address proof** for the bakery (electricity bill, rent agreement, or
  Aadhaar if you operate from home)
- **GSTIN** — only if you're registered. If you're not, there's an option
  saying you don't have one. Not having GST is fine and won't block you

## Step 1 — Create the account

1. Go to **razorpay.com** and click **Sign Up**.
2. Register with the email and phone number you actually use for the bakery.
   Everything — approval notices, payment alerts, settlement reports — goes to
   these, so don't use a spare address.
3. Verify the OTP sent to your phone.

## Step 2 — Business details

1. Business name: **Savor by Dee** (or the exact name on your FSSAI licence —
   these should match).
2. Business type: choose **Proprietorship** if it's just you. Pick
   **Individual** only if you have no business registration at all.
3. Business category: choose **Food and Beverage**, sub-category **Bakery** or
   the closest option.
4. Website: `<<PASTE THE FINAL WEBSITE ADDRESS HERE>>`

## Step 3 — Upload documents (KYC)

Upload the PAN, address proof and FSSAI licence. Then enter the bank account
number and IFSC.

**The name on the bank account must match the name on the PAN or the business
registration.** A mismatch here is the single most common reason applications
get sent back, and it costs several days.

## Step 4 — Wait for review

Razorpay usually replies within 2–4 working days. They will look at the website
as part of this. I've already added the pages they check for — Terms, Privacy,
Refunds & Cancellations, Shipping & Delivery, and Contact — so that side is
covered.

One thing I need from you for those pages to be correct: **your bakery's
contact phone number, contact email, and full address**, if they aren't already
in the admin panel. Right now a couple of those are blank and the Contact page
shows a gap where they should be. Razorpay's reviewer will see that.

If they come back asking for anything, forward me the email and I'll tell you
what it means.

## Step 5 — Once you're approved, send me three things

### 1 and 2 — The API keys

1. Log in to the Razorpay Dashboard.
2. Go to **Settings → API Keys**.
3. Make sure the toggle at the top says **Live**, not Test.
4. Click **Generate Live Key**.
5. You'll see a **Key ID** (starts with `rzp_live_`) and a **Key Secret**.

**The Key Secret is shown exactly once.** Copy it somewhere safe before you
close that box. If you lose it you have to regenerate, which invalidates the
old one.

### 3 — The webhook

This is what lets the website know a payment actually succeeded. Without it,
customers can pay and the order won't update.

1. Go to **Settings → Webhooks → Add New Webhook**.
2. **Webhook URL** — paste exactly:
   ```
   <<PASTE THE FINAL WEBSITE ADDRESS HERE>>/api/webhooks/razorpay
   ```
3. **Secret** — make up a long random password and type it in. It doesn't have
   to be memorable, and it isn't shown to customers. Save a copy.
4. **Active Events** — tick these three and nothing else:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
5. Click **Create Webhook**.

### Sending them to me

I need: **Key ID**, **Key Secret**, and the **webhook secret** you invented.

Please don't send the two secrets over WhatsApp or plain email — anyone who
gets them can take payments in your name. Either:

- send them through a password manager's share link (1Password, Bitwarden), or
- call me and read them out, or
- send the Key ID by message and the two secrets by a separate channel

The Key ID alone is not sensitive — it's visible in the website's code anyway.
It's the two secrets that matter.

## A note on money and timing

Razorpay settles into your bank account on a **T+2 or T+3** cycle by default —
money from today's orders lands in two to three working days, not instantly.
Their fee is around **2% per transaction** plus GST; the exact rate is confirmed
on your dashboard after approval. Worth knowing before you price anything.

## One thing to decide

The website currently tells customers we need **12 hours notice** on standard
orders, 24 hours for large orders, and 5 days for custom cakes. I've been asked
to add a "Same Day Delivery" badge to the daily menu. Those two can't both be
true — if a customer reads "same day" and then can't pick a same-day slot at
checkout, that's the kind of thing that turns into a chargeback.

Tell me which is right and I'll make the site say the same thing everywhere.

Thanks,
`<<YOUR NAME>>`
