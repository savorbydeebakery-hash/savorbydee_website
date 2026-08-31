# SAVOR / Savor by Dee — Handoff

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase · OpenNext → Cloudflare Workers
**Live (staging):** https://savor-bakery-staging.savor-bakery.workers.dev
**Repo:** `savorbydeebakery-hash/savorbydee_website`, branch `master`
**Last updated:** 2026-08-31 · last commit `829fa2c` + the IST slot fix

Client is a real bakery in Shillong, Meghalaya. Payments are not live yet —
Razorpay activation is pending on the client's side.

---

## 1. Where things stand

The homepage was rebuilt against two references the client chose:

- **littletoken.in** — layout and rhythm. Sections separated by margin alone, a
  bold title with a quiet "See All", full-bleed rails, product tiles with no
  card chrome. That site never leaves a 448px column even on desktop; the brief
  here was "Little Token on mobile, optimised for desktop", so the vocabulary
  is kept and the container grows to 1410px.
- **brookibakehouse.com** — palette, type, the phone bottom bar and the policy
  page template. Values were read off its live CSS, not eyedropped.

**Watch the unit base:** Brooki's theme runs a 10px rem root. Its "2.4rem" pill
is **24px** here, not 38px. Every length taken from it was converted.

### Homepage order (`app/page.tsx`)

1. `PromoBanner`
2. `HeroCard` — kept from the original build
3. `ReviewsCarousel` — titled "Indulgence Approved", rating 4.6
4. `MenuTypeShowcase` — Brooki tab strip + product cards
5. `CustomOrder`
6. `GalleryRail`
7. `BestSellers` — horizontal rail
8. `BehindTheScenes`
9. `AboutUs`

### Design tokens

Brooki tokens live in `app/globals.css` under `/* Brooki layer */`, prefixed
`--bk-*`. Key ones: `--bk-fg #000`, `--bk-bg #fff`, `--bk-muted #666`,
`--bk-pink #e1b5c2`, `--bk-maroon #653230` (buttons, active tab, badges),
`--bk-page-width 1410px`.

The **older** Savor tokens (`--ink`, `--cocoa`, `--berry`, `--shell`…) still
exist and still drive `/menu`, `/about`, `/cart` and the admin panel. Those
pages have **not** been converted to the Brooki palette. That is the largest
piece of visual inconsistency remaining.

---

## 2. Database

All migrations through **00020 are applied to the live database** (verified by
querying each). Migrations are applied by hand via the Supabase SQL editor —
there is no automated migration step in CI.

| Migration | Adds | Applied |
|---|---|---|
| 00017 | `reviews` table | ✅ |
| 00018 | `menu_items.is_preorder` | ✅ |
| 00019 | `behind_the_scenes` table + 3 seeded slots | ✅ |
| 00020 | `orders.delivery_fee_cents` | ✅ |

### Settings currently driving copy (`site_settings`, id=1)

- `global_notice_hours` **2**, `bulk_threshold` 10, `bulk_notice_hours` 24,
  `custom_cake_notice_days` 5
- `contact_phone` set · **`contact_email` still null** · `about_narrative` empty
  (About Us falls back to hardcoded copy) · `upi_id` null while
  `kyc_pending_mode` is true
- `weekly_hours` open Mon–Sat 09:00–21:00, **Sunday closed**; `holidays` empty.
  These are enforced as of this change — see item 8.

### Flags that no longer do anything

`is_preorder` and `is_special` still exist as columns. Nothing reads
`is_preorder`; `is_special` is read only by the `/menu?tag=specials` filter,
which nothing links to. Preorder became the full catalogue and the Specials
page was removed. The `is_preorder` admin checkbox was deleted; the
`is_special` one is still in the UI and is misleading. Columns were kept so
existing flags aren't lost if a filter is reintroduced.

---

## 3. Known bugs and open work

### Ordered by how much they matter

1. ~~**Timezone bug on order slots.**~~ **Fixed.** Everything is IST now, via
   `lib/time/ist.ts` — read its header comment before touching any date code.
   A picker's wall clock is always read as IST regardless of the device's zone,
   and every stored instant is rendered with `timeZone: "Asia/Kolkata"` pinned.
   `toLocaleString("en-IN")` sets the *locale*, not the zone; there are no bare
   ones left in the codebase and there should not be new ones.

   Worth knowing what it had broken: the notice guard compared the inflated
   instant against `Date.now()`, so it under-enforced by 5.5 hours — a rule
   that exists to protect the kitchen was failing open. The admin dashboard's
   "today" was a UTC day, so it began at 05:30 IST. Order ids were stamped with
   the previous day between midnight and 05:30 IST. The confirmation emails
   render server-side, so customers were emailed UTC times.

   The 20 orders in the live table are all E2E rows, so nothing was backfilled.
   They are still there — clearing them before go-live is worth doing.

2. **`contact_email` is blank.** The policy pages render a visible yellow "add
   this in Admin → Settings" gap where it belongs. Razorpay's activation review
   reads those pages.

3. ~~**`DEPLOY_URL` repository variable is unset.**~~ **Set** to the staging
   URL. Note this does not make `verify` green on its own: it runs the full
   Playwright suite against the deployed worker, and `order-placement` /
   `admin-alarm` need the worker to have `SUPABASE_SERVICE_ROLE_KEY` set as a
   Cloudflare secret. That is item 4, and it is a prerequisite, not a
   follow-up.

4. **Service-role key has never been rotated.** It previously sat in plaintext
   in `scripts/upload-gallery-images.ts` (stripped before commit, so never in
   git history) but is still live. Also unconfirmed: whether the Cloudflare
   Worker has its runtime secrets set at all. `wrangler.jsonc` has
   `"crons": ["*/1 * * * *"]`, so a keyless worker throws every minute.

5. **Admin panel audit — static pass done, live pass not.** See
   `docs/admin-audit.md`. Coverage is fine: every content table has an admin
   page. The problem is six controls that save to the database, show a success
   state, and are read by nothing — the hero image upload is the worst, since
   it prints "staged, click Save to apply" and `HeroCard` hardcodes its image.
   The live click-through still needs someone who can sign in.

6. **Menu item photography.** 76 items, essentially none with `image_url`. All
   product cards fall back to a typographic tile. Real photos are the single
   biggest visual improvement available.

7. **`is_special` admin checkbox** still present and near-inert. Correction to
   what this file said before: `components/menu-client.tsx:37` *does* filter on
   it for `/menu?tag=specials`. Nothing links to that URL, so the flag is
   reachable only by typing the query string.

8. **Operating hours and holidays are now enforced** — they were dead settings
   until this change, so Sunday was bookable despite being marked closed, as
   was 3am on an open day. `validateSlotAgainstHours` in
   `lib/cart/validation.ts`, called authoritatively from the order API and
   mirrored in the checkout. Malformed or unset hours deliberately allow
   everything: a broken setting must not refuse every order on the site.

---

## 4. Things that will bite you

Recorded because each cost real time to find.

- **Business hours are enforced in three places and they must agree.**
  `lib/shop/open-state.ts` is the single source: it answers "is the bakery
  open", "when does it reopen" and "is the daily menu still taking orders"
  (cutoff 20:30, before the 21:00 close). The root layout resolves it once per
  request and hands it down through `ShopStatusProvider`; cards grey out and
  refuse the add-to-cart; the order API refuses the POST. Every failure path
  returns OPEN on purpose — a settings read that breaks must not hang a CLOSED
  sign on a bakery that is trading.

- **Specs that place an order skip when the shop is shut.** `verify` runs on
  every deploy at whatever time the deploy happens, and the API correctly
  refuses orders outside Mon-Sat 09:00-21:00 IST. `e2e/helpers/shop-open.ts`
  reads the storefront's own closed banner and skips, so a 9:30pm deploy does
  not go red. If those specs are always skipping, check the clock before
  assuming they are broken.

- **The bulk rule is PER ITEM, not per cart.** "More than 12 of each item",
  strictly greater, so 12 is fine and 13 triggers `bulk_notice_hours`. It used
  to sum the whole cart, which made a basket of ten different single items a
  bulk order. `bulk_threshold` is 12 in the live settings.

- **Dates are IST, and only `lib/time/ist.ts` knows that.** Do not reach for
  `new Date(pickerValue)` or `toLocaleString("en-IN")` again — the first
  resolves against the runtime's zone (UTC on Workers) and the second sets the
  locale without setting the zone. Both look correct on a laptop in India and
  are wrong in production, which is exactly why the bug survived so long.

- **The checkout's rules load asynchronously, so anything that reads them must
  wait.** The slot step's Continue is disabled and labelled "Checking
  availability…" until `site_settings` arrives. Without that gate a closed day
  went straight through whenever the click beat the fetch — the schedule was
  still null, the client check no-opped, and the customer only hit the refusal
  after filling in their details. It passed locally every time and failed on
  staging, which is the only reason it was caught. Any new check that depends
  on those settings needs the same gate.

- **E2E specs must not fill the slot picker with a UTC string.** Three did
  (`new Date(Date.now() + 48h).toISOString().slice(0, 16)`), which was harmless
  only while nothing validated opening hours. Use `validSlotInput()` from
  `e2e/helpers/slot.ts`; it picks midday on the next open day.

- **Two E2E specs were passing without asserting anything.** `bulk-rule` and
  `checkout-closed-day` both located `input[type='date']`, which the checkout
  does not have — it uses `datetime-local` — so their whole bodies sat inside a
  never-true `if (visible)`. Both are real now. Worth grepping for the pattern
  before trusting any other spec that wraps assertions in a visibility check.

- **The a11y audit is the safety net.** `e2e/a11y-audit.spec.ts` catches
  contrast and horizontal-overflow regressions at 375/768/1440. It caught three
  real bugs during this work that code review did not. **Run it before every
  deploy.** It needs a running server:
  `E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/a11y-audit.spec.ts --workers=1`

- **The preview browser pane lies about two things.** It reports
  `prefers-reduced-motion: reduce`, so GSAP hero animations and the review
  carousel's autoplay never start there — they are not broken. It also reports
  `visibilityState: hidden` and **throttles `setInterval`**, so a 5s timer
  cannot be observed. Verify motion in a real browser.

- **`resize=cover` in the Supabase image loader was destroying aspect ratios.**
  Given a width and no height, Supabase leaves the source height untouched —
  `?width=640` on a 3000×4000 photo returned 640×4000. `lib/images/supabase-loader.ts`
  now always sends `resize=contain`. Do not change it back.

- **Horizontal overflow can come from somewhere you cannot see.** The Best
  Sellers rail widened the document by 183px while every element in its chain
  measured exactly 375px, nothing escaped visually, and `overflow-x: hidden` on
  every ancestor did nothing. The fix was rebuilding it on `GalleryRail`'s
  construction — a clipping wrapper around the scroller, fixed card widths, no
  `vw` units. Mechanism never fully explained.

- **`export const dynamic = "force-dynamic"` is deliberate everywhere.** ISR
  hangs: OpenNext dispatches revalidation through `memoryQueue`, which
  revalidates inside the same worker invocation and the Workers runtime kills
  it. Do not "optimise" this without wiring a real Cloudflare Queue first.

- **Sections hide themselves when their query fails.** Gallery, Best Sellers and
  Reviews return `null` on an empty list, so a broken database read looks like
  "the section was removed" rather than an error. Behind the Scenes and About Us
  have code fallbacks and survive. If a section vanishes, check the data first.

- **The local dev server dies often.** Restart via `preview_start`, and note
  Next caches env at startup — edit `.env.local` and you must restart.

- **`.env.local` holds only the two public vars.** Server-side secrets live in
  `.dev.vars`. Two E2E tests (`order-placement`, `admin-alarm`) fail locally
  because `app/api/orders/route.ts` needs `SUPABASE_SERVICE_ROLE_KEY`, which is
  not in `.env.local` by design. Do not paste secrets between those files
  casually — a mis-appended line silently corrupts the anon key and every
  database read starts failing.

---

## 5. Payments (Razorpay)

Not live. The client must apply; `docs/razorpay-client-onboarding.md` is a
copy-paste message for her with the full step-by-step (two `<<>>` placeholders
to fill first).

Two things were fixed on this side and should not regress:

- **The webhook used to fail open.** With `RAZORPAY_WEBHOOK_SECRET` unset it
  accepted unsigned requests and marked orders paid. It now rejects with 500
  until the secret exists.
- **Signature comparisons are constant-time** (`lib/crypto/timing-safe.ts`).
  Node's `timingSafeEqual` is unavailable on Workers, hence the XOR loop.

The five policy pages Razorpay's review expects are at `/policies/[slug]` —
terms, privacy, refunds, shipping, contact — linked from the footer. Their
wording is driven by `site_settings` so it states this bakery's actual terms,
and renders a visible gap rather than inventing a value it does not have.

**Delivery model:** goods are paid online; the delivery charge is distance-based,
quoted per order by staff in admin, and collected **in cash**.
`delivery_fee_cents` is deliberately **not** added to `total_cents` — that value
is what Razorpay captured, and editing it post-payment would leave the order
record disagreeing with the money taken. `NULL` = not quoted; `0` = free.

---

## 6. Commands

```bash
npx tsc --noEmit                 # typecheck
npx eslint .                     # 1 known pre-existing warning in open-next.config.ts
npx vitest run                   # 110 unit tests
npx playwright test --workers=1  # 14 e2e; 12 pass, 2 need the service-role key locally
```

Deploy (workflow_dispatch only — pushing does not deploy):

```bash
gh workflow run "CI + Deploy" --ref master
```

`check` and `deploy` should go green; `verify` will fail until `DEPLOY_URL` is
set. Node is pinned to 24 in CI to match the npm that wrote `package-lock.json`
— npm 10 rejects the lockfile.

---

## 7. Working style the client expects

Short, direct changes shipped one at a time, each verified against the live site
and deployed immediately. They ask for things conversationally and often mid-
task; expect to reprioritise. They respond well to being told when a request
conflicts with something already on the site — several genuine contradictions
(same-day delivery vs a 12h notice rule, a shipping policy that promised charges
at checkout) were caught that way.

Two standing judgment calls made throughout, worth continuing: **no fabricated
content** — no invented testimonials, ratings, or stock photos captioned as this
bakery's work (the reviews table and Behind the Scenes both ship empty rather
than seeded), and **no misleading imagery** — product cards fall back to
typographic tiles rather than borrowing an unrelated gallery photo.
