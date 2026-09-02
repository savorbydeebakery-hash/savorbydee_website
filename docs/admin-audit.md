# Admin panel audit

**Run:** 2026-08-31 · **All 6 findings fixed** (1-5 on 2026-09-01, 6 on 2026-09-02)
**Asked for:** "check that everything is editable via admin and every function works"

## Scope and method

Two passes were planned. Only the first was completed.

- **Static pass — done.** Every field the panel writes was traced to the code
  that reads it. Coverage was checked by listing every table in
  `supabase/migrations` against every table the admin pages touch.
- **Live click-through — not done.** It needs an admin sign-in, which the
  agent that wrote this cannot perform. `e2e/admin-alarm.spec.ts` covers the
  login and the order alarm on CI, where `ADMIN_EMAIL` / `ADMIN_PASSWORD` are
  set; the rest of the panel still needs a human pass.

## Coverage: good

Every content table has an admin surface and a nav entry. Nothing is
un-editable because a page is missing.

| Table | Admin page |
|---|---|
| `menu_items` | `/admin/menu-items` — full CRUD |
| `categories` | `/admin/categories` — full CRUD |
| `promo_banners` | `/admin/banners` — full CRUD |
| `gallery_photos` | `/admin/gallery` — full CRUD |
| `reviews` | `/admin/reviews` — full CRUD |
| `behind_the_scenes` | `/admin/behind-the-scenes` — update only |
| `custom_cake_inquiries` | `/admin/custom-cakes` — status update |
| `orders` | `/admin/orders` — status, acknowledge, delivery fee |
| `profiles` | `/admin/accounts` — role update |
| `site_settings` | `/admin/settings` — 6 tabs |

`behind_the_scenes` being update-only is by design: migration 00019 seeds three
fixed slots and the page edits those three.

## Status: 6 of 6 fixed

| # | Finding | State |
|---|---|---|
| 1 | Hero image upload ignored | **Fixed** — `HeroCard` takes `imageUrl` |
| 2 | `delivery_enabled` not read by checkout | **Fixed** — tile hidden, API refuses |
| 3 | UPI fallback unreachable | **Fixed** — rendered on unpaid orders |
| 4 | `razorpay_active` no reader | **Fixed** — gates the payment control |
| 5 | `footer_text` no reader | **Fixed** — footer reads it |
| 6 | Footer socials hardcoded | **Fixed** — all three from settings, migration 00028 applied |

An image had in fact been uploaded through finding 1's control and was sitting
in storage unused, so the homepage was showing the shipped stock photo instead
of the client's own bakery.

## The original findings: controls that save and are never read

This is the whole finding. The panel is not missing fields — it has fields that
write to the database, show a success state, and change nothing on the site.
Each was verified by grepping the column name across `app/`, `components/` and
`lib/` and finding no storefront reader.

Ranked by how misleading the control is.

### 1. Hero image upload does nothing — `hero_image_url`

**Settings → General.** The worst of these, because the UI actively claims
otherwise: it uploads the file, shows a preview, stages it, and prints "Hero
image staged. Click **Save** to apply it."

`components/ui/hero-card.tsx:9` hardcodes `HERO_IMAGE =
"/hero/celebration-cakes-v3.jpg"`. `HeroCard` even declares an `images?: string[]`
prop (`hero-card.tsx:24`) that its body never reads, and `app/page.tsx:110`
renders it with no props.

**Fix:** pass `settings.hero_image_url` from `app/page.tsx` into `HeroCard` and
use it in place of the constant when set.

### 2. Turning delivery off does not turn delivery off — `delivery_enabled`

**Settings → Delivery.** Read only by `app/policies/[slug]/page.tsx`. The
checkout's fulfilment step (`app/cart/checkout/page.tsx`) always renders both
Pickup and Delivery, so unchecking the box rewords the shipping policy while
customers keep placing delivery orders.

**Fix:** load `delivery_enabled` in the checkout alongside the notice rules —
that fetch already exists — and hide the Delivery tile, forcing `pickup`, when
it is false. The order API should refuse `fulfillment: "delivery"` too, for the
same reason the notice window is enforced server-side.

### 3. The UPI fallback is unreachable — `upi_id`, `kyc_pending_mode`

`components/retry-payment-button.tsx` renders the UPI panel when
`kycPendingMode` is set, and it is **not rendered anywhere in the app** — no
file imports it. So an unpaid order has no payment control at all.

This matters now, not later: `kyc_pending_mode` is **true** in the live
settings, which is the mode meant to show UPI instructions while Razorpay
activation is pending. `upi_id` is also still null, so even once the component
is mounted the panel renders without an ID to pay.

**Fix:** render `RetryPaymentButton` on `app/orders/[humanId]/page.tsx` for
unpaid orders, passing `kyc_pending_mode` and `upi_id` from `site_settings`.
Then set `upi_id`.

### 4. "Enable Razorpay" does nothing — `razorpay_active`

**Settings → Payment.** No reader anywhere. Payment behaviour is governed by
the presence of the Razorpay env vars instead. Either wire it up or remove the
checkbox — a payment toggle that lies is worse than no toggle.

### 5. Footer text is not editable in practice — `footer_text`

**Settings → General.** No reader. `components/layout/footer.tsx` hardcodes the
legal line.

### 6. Footer socials and WhatsApp are hardcoded

`components/layout/footer.tsx:44-47` hardcodes the Instagram, Facebook and
WhatsApp URLs, including `wa.me/919836537447`. `whatsapp_number` **is** a
setting and is read by `/about` and `/policies/contact`, so changing the number
in admin updates two of the three places it appears. There is no admin field
for the social URLs at all.

### 7. `is_special` is near-inert

The checkbox writes the column and `components/menu-client.tsx:37` filters on it
for `/menu?tag=specials` — but nothing on the site links to that URL, so the
flag is reachable only by typing the query string. `HANDOFF.md` records this as
fully inert, which is slightly stronger than the code supports.

**Fix:** either link the Specials tag from the menu, or drop the checkbox. The
column should stay either way so existing flags are not lost.

## Fixed while auditing

**Operating hours and holidays were dead settings.** `weekly_hours` and
`holidays` had no reader anywhere. Sunday is marked closed in the live settings
and Sunday slots were bookable; so were 3am slots on an open day. Both are now
enforced in `app/api/orders/route.ts` (authoritative) and mirrored in the
checkout, via `validateSlotAgainstHours` in `lib/cart/validation.ts`.

Two E2E specs that were meant to guard this were passing without asserting
anything — `bulk-rule` and `checkout-closed-day` both located
`input[type='date']`, which does not exist on the checkout (it uses
`datetime-local`), so their assertion bodies sat inside a never-true
`if (visible)`. Both now assert for real.

## Data gaps, not code

The panel can edit all of these today; they are simply empty.

| Setting | State | Where it shows |
|---|---|---|
| `contact_email` | null | Visible yellow gap on `/policies/contact` — Razorpay's reviewer reads this page |
| `about_narrative` | empty | About Us falls back to hardcoded copy |
| `upi_id` | null | Nothing to pay to, once finding 3 is fixed |
| `footer_text` | null | Nothing, until finding 5 is fixed |
| `menu_items.image_url` | ~76 items unset | Every product card falls back to a typographic tile |

## Suggested order

1. Finding 1 (hero) — the control claims success and is a two-line fix.
2. Finding 2 (delivery) — a setting that is wrong about what the site does.
3. Finding 3 + `upi_id` — the only payment route while Razorpay is pending.
4. Findings 4–7 — mostly "wire it up or delete the control".
5. The live click-through, by someone who can sign in.
