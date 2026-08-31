# SAVOR / Savor by Dee — Handoff

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase · OpenNext → Cloudflare Workers
**Live (staging):** https://savor-bakery-staging.savor-bakery.workers.dev
**Repo:** `savorbydeebakery-hash/savorbydee_website`, branch `master`
**Last updated:** 2026-08-31 · last commit `c487f04`

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
  (About Us falls back to hardcoded copy)

### Flags that no longer do anything

`is_preorder` and `is_special` still exist as columns, but **nothing on the
storefront reads either**. Preorder became the full catalogue and the Specials
page was removed. The `is_preorder` admin checkbox was deleted; the
`is_special` one is still in the UI and is misleading. Columns were kept so
existing flags aren't lost if a filter is reintroduced.

---

## 3. Known bugs and open work

### Ordered by how much they matter

1. **Timezone bug on order slots — not fixed.** The checkout's
   `datetime-local` input produces a naive local string (`2026-08-30T22:29`).
   Cloudflare Workers run in UTC, so `new Date(...)` reads it as UTC and slots
   are stored ~5½ hours off IST. Fix: convert to a real instant client-side
   (`new Date(localValue).toISOString()`) before sending. This affects real
   order timing and the server-side notice check inherits the same skew.

2. **`contact_email` is blank.** The policy pages render a visible yellow "add
   this in Admin → Settings" gap where it belongs. Razorpay's activation review
   reads those pages.

3. **`DEPLOY_URL` repository variable is unset.** This is the only reason the
   `verify` job fails on every deploy — the guard is deliberate and fails fast.
   Fix: `gh variable set DEPLOY_URL --body https://savor-bakery-staging.savor-bakery.workers.dev`

4. **Service-role key has never been rotated.** It previously sat in plaintext
   in `scripts/upload-gallery-images.ts` (stripped before commit, so never in
   git history) but is still live. Also unconfirmed: whether the Cloudflare
   Worker has its runtime secrets set at all. `wrangler.jsonc` has
   `"crons": ["*/1 * * * *"]`, so a keyless worker throws every minute.

5. **Admin panel audit — never done.** Client asked for a check that everything
   is editable via admin and every function works. Not started.

6. **Menu item photography.** 76 items, essentially none with `image_url`. All
   product cards fall back to a typographic tile. Real photos are the single
   biggest visual improvement available.

7. **`is_special` admin checkbox** still present but inert (see above).

---

## 4. Things that will bite you

Recorded because each cost real time to find.

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
npx vitest run                   # 58 unit tests
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
