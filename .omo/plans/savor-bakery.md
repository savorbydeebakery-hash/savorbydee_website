# savor-bakery - Work Plan

## TL;DR (For humans)

### What you'll get
A mobile-first, white-dominant, bright-pastel-accented **pre-order bakery website** for SAVOR (Doretta Blah, near Laban Police Station, Kolkata). Customers browse a seeded menu (6 categories, ~60 items with weight tiers, add-ons, variants, dietary tags), add to cart, choose pickup or delivery, and pre-order with online payment via Razorpay. Staff get a **realtime audio+visual alarm** on every new order plus email alerts, manage the live menu (sold-out toggles, price edits, new items) and the entire site content (banners, offers, gallery, text, operating hours, roles) from a full admin panel. Custom cakes flow through an inquiry→staff-quote→offline-UPI-payment path.

### Why this approach
- **Next.js App Router on Cloudflare Workers (OpenNext)** is the 2026-canonical path (legacy `@cloudflare/next-on-pages` is deprecated). Edge runtime for webhooks, `nodejs_compat` for the app.
- **Supabase** gives Postgres + Auth + Storage + Realtime in one platform — reuses RLS for storage auth, Broadcast for the alarm fan-out, and Auth for 3-level RBAC.
- **Razorpay** has the best Next.js + Cloudflare integration story (real reference projects, clean HMAC-SHA256 webhook API, 2% flat fee, instant settlement).
- **Resend** for transactional email with React Email templates, svix webhook verification, and dual-recipient sends (customer + staff).
- **6 staged waves** so each layer is tested before the next builds on it — infrastructure first, then public pages, then cart logic, then realtime + notifications, then the full CMS, then payments + deploy.

### What it will NOT do
- No same-day instant checkout — pre-orders only with notice windows (12h global, 24h bulk, 5d custom cakes).
- No WhatsApp notifications (email only).
- No geofence/delivery radius (pure address capture, staff decides).
- No multi-language (English only).
- No online payment for custom cakes (offline UPI, staff marks paid).
- No full staff-management dashboard (1 admin + 1 staff seeded; minimal email/password management only).
- No menu item photos at launch (clean 21st.dev component presentation; upload capability exists in admin for later).

### Effort
~50 todos across 6 waves. Architecture-scale greenfield full-stack build.

### Risk
- Razorpay KYC can take 2–7 days (FSSAI mandatory for food business) — mitigated by KYC-pending fallback mode so the site launches before gateway approval.
- Supabase Realtime WebSocket can disconnect on backgrounded tabs — mitigated by `worker:true` + `heartbeatCallback` + Broadcast Replay + lastSeenOrderId catch-up.
- Cloudflare Workers bundle size limit (10MB compressed) — mitigated by lazy-initializing SDKs inside handlers, dry-run bundle profiling.
- Resend rate limit (10 req/s) — mitigated by parallel dual-send per order + idempotency keys.

### Decisions
All 4 interview batches resolved + research-verified facts recorded in `.omo/drafts/savor-bakery.md`.

---

## Scope

### IN
- Next.js 15 App Router + TypeScript + Tailwind + 21st.dev components + Framer Motion
- Supabase: Postgres schema (menu_items, categories, orders, order_items, profiles, site_settings, promo_banners, gallery_photos, custom_cake_inquiries), Auth (admin/staff/customer), Storage (5 buckets), Realtime Broadcast
- Cloudflare Workers deploy via @opennextjs/cloudflare (staging + production)
- Razorpay integration (UPI/Card/NetBanking, webhook verification, refund flow)
- Resend email (customer receipts, staff alerts, delivery/bounce webhooks, React Email templates)
- Storefront: About page, Menu hub (search/filter/badges), promo banners, WhatsApp widget
- Cart: weight tiers, admin-priced add-ons, variants, min order qty, bulk detection, notice validation, operating-hours blocking
- Checkout: guest + optional account, pickup vs delivery, readable order IDs (SAV-YYMMDD-NNNN)
- Custom cakes: inquiry flow (flavor/weight/text/image upload) + fully-custom flow (image + description) → staff quote → offline UPI → staff marks paid
- Realtime alarm: Web Audio beep + Notification API + title/badge flash + cross-tab BroadcastChannel + 30s ack watchdog (Cloudflare Cron → email fallback)
- Admin panel: full CMS — menu CRUD, categories CRUD, promo banners CRUD, gallery upload, site text editing, site_settings (notice rules, operating hours, holidays, contact, WhatsApp, delivery config), custom cake inquiry management, order dashboard, role management (email/password)
- Menu seeding from client's real menu data
- Resilience: wrong-button guards, cart localStorage recovery, idempotent order creation, rate limiting, RLS on every table, webhook idempotency

### OUT (Must-NOT-Have)
- Same-day instant checkout / no-notice orders
- WhatsApp notification integration (chat widget only, no order notifications via WhatsApp)
- Delivery geofence / radius / pin-code enforcement
- Multi-language / i18n / bilingual support
- Online payment for custom cake inquiries (offline UPI only)
- Staff management dashboard with seat invites / multi-staff onboarding flow
- Menu item photo pipeline at launch (capability exists, photos not required)
- Mobile app (native iOS/Android)
- POS / accounting system integration
- Loyalty / rewards / referral program
- Subscription / recurring orders
- Multi-location / multi-branch support
- SEO content marketing / blog

---

## Verification strategy

**Tests-after** approach (not strict TDD — greenfield full-stack, implementation first then verification):

1. **Unit tests** (Vitest): cart math (price computation with weight tiers + addons + variants + bulk detection), notice validation (12h global + 24h bulk + 5d custom, stacking logic), operating-hours validation (closed-day blocking, outside-hours blocking), order ID generation, promo banner date-expiry logic.
2. **Integration tests** (Vitest + Supabase local): RLS policy enforcement (guest can't read other customers' orders, staff can read all orders, customer can read own orders only), Storage bucket policies, Auth role assignment.
3. **E2E tests** (Playwright): order placement (happy path), admin alarm fires on new order, sold-out toggle greys item, bulk rule blocks checkout, custom cake inquiry submission, checkout datepicker blocks closed days, promo banner display + auto-expiry, admin login + menu edit, Razorpay test-mode checkout.
4. **Agent-executed QA per todo**: every todo has happy + failure QA scenarios with exact tool invocations and evidence paths. Zero human-intervention verification.
5. **Final verification wave** (parallel, all must approve): F1 plan compliance audit, F2 code quality review, F3 real manual QA (Playwright browser screenshots), F4 scope fidelity.

---

## Execution strategy

6 staged waves. Each wave = implementation + agent-executed QA in one todo batch. Dependencies flow strictly downward:

```
Wave 1 (Infra + Schema + Auth)
  ↓
Wave 2 (Storefront Public Pages)  ←  depends on Wave 1 schema
  ↓
Wave 3 (Menu CMS + Cart + Checkout)  ←  depends on Wave 1 schema + Wave 2 UI shell
  ↓
Wave 4 (Order Mgmt + Realtime Alarm + Notifications)  ←  depends on Wave 1 schema + Wave 3 order submission
  ↓
Wave 5 (Admin Panel — Full CMS)  ←  depends on Wave 1 schema + Wave 3 cart model + Wave 4 order dashboard
  ↓
Wave 6 (Payments + Resilience + Deploy + Verification)  ←  depends on all prior waves
```

**Parallelism within waves**: independent todos within the same wave can be executed in parallel (e.g. in Wave 5, menu CRUD and promo banner CRUD are independent). Dependencies within a wave are noted per todo.

**Worktree discipline**: single worktree, atomic commits per todo. Each todo ends with a conventional commit.

---

## Todos

<!-- Todos appended below in waves. Each todo has: References, What to build, Acceptance criteria, QA happy + failure paths, Commit line. -->

### Wave 1 — Infra + Schema + Auth

#### T1.1: Initialize Next.js project with Cloudflare Workers (OpenNext) scaffold
**Status: ✅ COMPLETE** — dev server HTTP 200 (localhost:3000), OpenNext preview HTTP 200 (localhost:8787), build passes, wrangler types generated, pastel palette in globals.css, git initialized. Note: removed `.codegraph` junction (CodeGraph MCP artifact) that crashed Turbopack.
**References:**
- Cloudflare Next.js on Workers guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- OpenNext adapter: `@opennextjs/cloudflare`
- Compat date ≥ 2024-09-23; `nodejs_compat` flag required
- Command: `npm create cloudflare@latest -- savor-bakery --framework=next`

**What to build:**
- Run the Cloudflare create command with `--framework=next`
- Configure `wrangler.jsonc`: name `savor-bakery`, `main: .open-next/worker.js`, `compatibility_date: 2026-08-19`, `compatibility_flags: ["nodejs_compat"]`, assets binding
- Configure `open-next.config.ts` with `defineCloudflareConfig()`
- Add package.json scripts: `dev` (next dev), `preview` (opennextjs-cloudflare build && preview), `deploy` (opennextjs-cloudflare build && deploy)
- Install: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@supabase/supabase-js`, `@supabase/ssr`, `resend`, `@react-email/components`, `framer-motion`
- Tailwind config with pastel palette (white-dominant, bright pastel accents: soft pink #FFB5C5, mint #B5E8CC, lavender #D4C5F9, peach #FFD4B5, sky #B5DAF9)
- `.gitignore` (node_modules, .next, .open-next, .dev.vars, .env*)
- `.dev.vars` template (empty, gitignored)
- `cloudflare-env.d.ts` via `wrangler types`
- `git init`

**Acceptance criteria:**
- `npm run dev` starts Next.js dev server on localhost:3000 without errors
- `npm run preview` builds with OpenNext and serves via wrangler locally without errors
- `wrangler types` generates `cloudflare-env.d.ts` with `CloudflareEnv` interface
- Tailwind pastel palette tokens defined and usable
- `.dev.vars` is gitignored; no secrets in repo

**QA happy:** Run `npm run dev`, open http://localhost:3000, see default page with Tailwind pastel styling. Evidence: `evidence/t1-1-dev-server.png`
**QA failure:** Delete `wrangler.jsonc`, run `npm run preview` → build fails with clear error. Evidence: `evidence/t1-1-no-wrangler.txt`

**Commit:** `feat: initialize Next.js + Cloudflare Workers (OpenNext) project scaffold`

---

#### T1.2: Set up Supabase project + clients + env vars
**References:**
- Supabase dashboard: https://supabase.com/dashboard (region: ap-south-1 Mumbai)
- Supabase SSR helper: `@supabase/ssr` for Next.js App Router
- Env vars on Cloudflare: https://developers.cloudflare.com/workers/configuration/environment-variables/

**What to build:**
- Create Supabase project (region: ap-south-1 Mumbai — closest to Kolkata)
- `lib/supabase/client.ts` — browser client (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `lib/supabase/server.ts` — server client via `@supabase/ssr` with cookie handling
- `lib/supabase/admin.ts` — service-role client (SERVER ONLY, never in client components)
- `lib/supabase/middleware.ts` — session refresh middleware
- `supabase/` directory for SQL migrations
- Env vars in `.dev.vars`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

**Acceptance criteria:**
- Browser, server, admin clients all connect to Supabase
- Middleware refreshes session cookies
- No Supabase keys hardcoded in source
- `.dev.vars` has all 3 env vars (gitignored)

**QA happy:** Server component queries `SELECT 1` via server client → returns result. Evidence: `evidence/t1-2-supabase-connect.txt`
**QA failure:** Remove NEXT_PUBLIC_SUPABASE_URL from `.dev.vars` → client throws `TypeError: supabaseUrl is required`. Evidence: `evidence/t1-2-missing-url.txt`

**Commit:** `feat: set up Supabase clients (browser, server, admin) + env var scaffolding`

---

#### T1.3: Create full database schema via SQL migration
**References:**
- Supabase SQL migrations: `supabase/migrations/` directory
- Research findings (bg_2de5c286): `realtime.broadcast_changes()` for alarm trigger
- Decisions ledger: all schema decisions from batches 1–4

**What to build:**
Create `supabase/migrations/00001_initial_schema.sql` with tables:
- `profiles` (id uuid → auth.users, role user_role enum, full_name, phone, email, timestamps)
- `categories` (id, name, sort_order, is_active, timestamps)
- `menu_items` (id, category_id, name, description, base_price_cents, price_model enum, price_options jsonb, addons jsonb, variants jsonb, decoration_tiers jsonb, size_options jsonb, min_order_qty, dietary_tags text[], image_url, is_sold_out, is_active, sort_order, requires_custom_notice, timestamps)
- `site_settings` (singleton id=1: bakery_name, about_narrative, contact info, whatsapp_number, address, google_maps URLs, notice rules [global_notice_hours=12, bulk_threshold=10, bulk_notice_hours=24, custom_cake_notice_days=5], weekly_hours jsonb, holidays date[], delivery config, payment config [razorpay_active=false, kyc_pending_mode=true], footer/legal URLs, timestamps)
- `promo_banners` (id, title, body_text, cta_text, cta_link, poster_image_url, position enum, start/end_date, is_dismissible, is_active, sort_order, timestamps)
- `gallery_photos` (id, image_url, caption, sort_order, is_active, timestamp)
- `orders` (id, human_id text unique, customer_id nullable, kind enum, status enum, fulfillment enum, guest fields, delivery fields, requested_slot, payment fields, razorpay fields, total_cents, custom cake fields, acknowledged_at/by, email tracking, notes, timestamps)
- `order_items` (id, order_id, menu_item_id, name, unit_price_cents, quantity, selected_size/variant/addons/decoration jsonb, line_total_cents, timestamp)
- `custom_cake_inquiries` (id, order_id nullable, customer info, cake_type, flavor/weight/decoration/message, reference_image_url, description, requested_date, status, quote_cents, staff_notes, timestamps)
- ENUMs: order_kind, order_status, fulfillment_type, user_role, price_model, payment_status, payment_method, banner_position
- Indexes on all foreign keys + commonly filtered columns

Create `supabase/migrations/00002_realtime_setup.sql`:
- `alter publication supabase_realtime add table public.orders`
- `broadcast_new_order()` function calling `realtime.broadcast_changes('orders', ...)`
- `orders_broadcast_insert` trigger AFTER INSERT

Create `supabase/migrations/00003_updated_at_triggers.sql`:
- Auto-updating `updated_at` triggers for all tables

**Acceptance criteria:**
- All tables, enums, indexes, constraints created
- `site_settings` singleton row exists (id=1) with default values
- `orders` in `supabase_realtime` publication
- `broadcast_new_order` trigger fires on INSERT
- `updated_at` auto-updates on row update

**QA happy:** Query `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` → returns all 9 tables. Evidence: `evidence/t1-3-schema-tables.txt`
**QA failure:** `INSERT INTO menu_items (name, base_price_cents) VALUES ('Test', -100)` → check constraint rejects negative price (add `check (base_price_cents >= 0)` if not present). Evidence: `evidence/t1-3-constraint-test.txt`

**Commit:** `feat: create full database schema (tables, enums, indexes, realtime trigger)`

---

#### T1.4: Set up RLS policies for all tables
**References:**
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime authorization: https://supabase.com/docs/guides/realtime/authorization
- Research findings: broadcast requires RLS on `realtime.messages`

**What to build:**
Create `supabase/migrations/00004_rls_policies.sql`:
- Enable RLS on all 9 tables
- Helper functions: `is_staff()` (role in admin/staff), `is_admin()` (role=admin)
- `profiles`: users read/update own; staff read all; admin update all
- `categories`: public read active; staff read all; admin write all
- `menu_items`: public read active; staff read all; admin write all
- `site_settings`: public read; admin write
- `promo_banners`: public read active+within date range; admin write all
- `gallery_photos`: public read active; admin write all
- `orders`: customer read own; staff read all + update; admin write all; **anyone insert** (guest checkout)
- `order_items`: staff read all; admin write all; customer read own order's items; **anyone insert**
- `custom_cake_inquiries`: staff read all; admin write all; **anyone insert**
- `realtime.messages`: staff can receive 'orders' broadcast (RLS on realtime.messages)

**Acceptance criteria:**
- Anonymous: can SELECT active menu_items/categories/banners/gallery/settings; CANNOT SELECT orders; CAN INSERT orders/order_items/inquiries
- Staff: can SELECT/UPDATE all orders, order_items, inquiries, profiles; can receive realtime broadcast
- Admin: full CRUD on all tables
- `is_staff()` and `is_admin()` helper functions work
- Realtime broadcast on 'orders' channel authorized for staff only

**QA happy:** Staff user SELECT FROM orders → returns rows. Evidence: `evidence/t1-4-rls-staff.txt`
**QA failure:** Anon key SELECT FROM orders → returns 0 rows (RLS blocks). Evidence: `evidence/t1-4-rls-anon-blocked.txt`

**Commit:** `feat: set up RLS policies for all tables with role-based access control`

---

#### T1.5: Set up Supabase Storage buckets + policies + upload helpers
**References:**
- Supabase Storage: https://supabase.com/docs/guides/storage
- Decisions ledger: 5 buckets — menu-items, gallery, promo-banners, custom-cake-refs, site-assets

**What to build:**
Create `supabase/migrations/00005_storage_buckets.sql`:
- 4 public buckets: menu-items, gallery, promo-banners, site-assets
- 1 private bucket: custom-cake-refs
- Policies: admin can upload/delete to all; public can read public buckets; staff can read custom-cake-refs

Create `lib/storage/upload-helper.ts` — server-side upload to Supabase Storage, returns public URL (public buckets) or signed URL (private buckets). Image optimization hints (`?width=800&quality=80`).

Create `lib/storage/signed-upload.ts` — generates signed upload URL for custom-cake-refs bucket (for guest uploads without auth).

**Acceptance criteria:**
- All 5 buckets created (4 public, 1 private)
- Admin can upload to all; public reads public buckets; staff reads private bucket
- Anon cannot upload to public buckets
- `upload-helper.ts` returns valid URL after upload
- `signed-upload.ts` generates time-limited signed URL

**QA happy:** Upload test image to menu-items as admin → public URL works. Evidence: `evidence/t1-5-upload-success.txt`
**QA failure:** Anon upload to menu-items → rejected by RLS. Evidence: `evidence/t1-5-anon-upload-blocked.txt`

**Commit:** `feat: set up Supabase Storage buckets (5) with RLS policies + upload helpers`

---

#### T1.6: Set up Supabase Auth — roles, seeded accounts, profile triggers, route protection
**References:**
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Auth with Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Decisions ledger: 1 admin + 1 staff seeded; profiles extends auth.users

**What to build:**
- `supabase/migrations/00006_auth_setup.sql` — `handle_new_user()` trigger: auto-creates profile with role='customer' on signup
- `lib/auth/seed-accounts.ts` — one-time script: creates 1 admin + 1 staff via `admin.createUser()`, sets their roles. Idempotent. Reads from env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_STAFF_EMAIL, SEED_STAFF_PASSWORD
- `lib/auth/role-check.ts` — `getUserRole()`, `isStaff()`, `isAdmin()`, `requireStaff()` (redirect), `requireAdmin()` (redirect)
- `middleware.ts` — refreshes session, protects /admin/* (staff+) and /account/* (authenticated)
- `app/login/page.tsx` — minimal login page (email+password, Supabase auth, role-based redirect)

**Acceptance criteria:**
- New signup auto-creates profile with role='customer'
- Seed script creates 1 admin + 1 staff, idempotent
- `requireStaff()` / `requireAdmin()` redirect non-authorized to /login
- Middleware protects /admin/* and /account/*
- Login page authenticates and redirects by role
- No hardcoded credentials

**QA happy:** Run seed → 2 accounts created. Login as admin → redirected to /admin. Evidence: `evidence/t1-6-seed-and-login.txt`
**QA failure:** Login as customer → access /admin → redirected to /login. Evidence: `evidence/t1-6-customer-blocked.txt`

**Commit:** `feat: set up Supabase Auth with role-based profiles, seeded admin+staff, route protection`

---

#### T1.7: Set up Resend email infrastructure (client, templates, webhook config)
**References:**
- Resend + Cloudflare Workers: https://resend.com/docs/send-with-cloudflare-workers
- Resend + Next.js: https://resend.com/docs/send-with-nextjs
- React Email: https://react.email/docs
- Resend webhooks: https://resend.com/docs/dashboard/webhooks/introduction
- Research findings (bg_2de5c286): svix verification, raw body, IP allowlist, lazy-init client, idempotency keys

**What to build:**
- Create Resend account, verify sending domain (DNS: DKIM/SPF/DMARC on Cloudflare)
- Cloudflare secrets: RESEND_API_KEY, RESEND_WEBHOOK_SECRET; var: STAFF_NOTIFY_EMAIL
- `lib/email/client.ts` — lazy-init Resend client (inside handler, not module scope)
- `lib/email/templates/` — 6 React Email templates (pastel styled, SAVOR branded):
  - `OrderConfirmationCustomer.tsx`, `OrderAlertStaff.tsx`, `CustomCakeInquiryCustomer.tsx`, `CustomCakeInquiryStaff.tsx`, `OrderStatusUpdate.tsx`, `OrderMissedAlert.tsx`
- `lib/email/send.ts` — `sendOrderEmails(order)` (parallel customer+staff, idempotency keys), `sendInquiryEmails(inquiry)`, `sendStatusUpdate(order, status)`, `sendMissedOrderAlert(order)`
- Configure Resend webhook in dashboard → `/api/webhooks/resend`, events: delivered/bounced/complained/failed
- Add Resend IPs to Cloudflare WAF allowlist: 44.228.126.217, 50.112.21.217, 52.24.126.164, 54.148.139.208, 2600:1f24:64:8000::/52

**Acceptance criteria:**
- Sending domain verified (DNS records in Cloudflare)
- RESEND_API_KEY + RESEND_WEBHOOK_SECRET as Cloudflare secrets (not in source)
- All 6 templates created with React Email, pastel styling
- `sendOrderEmails` sends to customer + staff in parallel with idempotency keys
- `getResend()` lazy-initializes
- Resend webhook configured; IPs allowlisted in Cloudflare WAF

**QA happy:** Call `sendOrderEmails(mockOrder)` → Resend dashboard shows 2 sent emails. Evidence: `evidence/t1-7-emails-sent.png`
**QA failure:** Invalid RESEND_API_KEY → error returned, logged, no crash. Evidence: `evidence/t1-7-invalid-key.txt`

**Commit:** `feat: set up Resend email infrastructure (client, 6 templates, webhook config)`

---

#### T1.8: Finalize Cloudflare Workers config + env vars + bundle verification
**References:**
- Cloudflare Workers config: https://developers.cloudflare.com/workers/configuration/
- Research findings (bg_2de5c286): nodejs_compat, compat_date, OpenNext, bundle size < 10MB

**What to build:**
- Finalize `wrangler.jsonc` with all bindings + vars
- Set all Cloudflare secrets via `wrangler secret put`: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_WEBHOOK_SECRET, CRON_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- Set vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, STAFF_NOTIFY_EMAIL
- `.dev.vars.example` with all var names (no values)
- `README.md` with setup instructions (env vars, seed script, deploy commands, DNS records)
- Verify `npm run preview` works with `.dev.vars`
- Run `wrangler deploy --dry-run --outdir bundled/` → verify bundle < 10MB compressed

**Acceptance criteria:**
- `wrangler.jsonc` fully configured
- All secrets set (not in source)
- `.dev.vars.example` exists, gitignored
- `npm run preview` works locally
- `wrangler deploy --dry-run` succeeds, bundle < 10MB
- README documents all env vars + setup + deploy

**QA happy:** `npm run preview` with `.dev.vars` → site loads on localhost:8787, Supabase connects. Evidence: `evidence/t1-8-preview-success.png`
**QA failure:** `wrangler deploy --dry-run` → if bundle > 10MB, document which packages to lazy-load. Evidence: `evidence/t1-8-bundle-size.txt`

**Commit:** `feat: finalize Cloudflare Workers config (wrangler.jsonc, secrets, env vars, DNS docs)`

---

### Wave 2 — Storefront Public Pages

#### T2.1: Build layout shell (header, footer, mobile nav, UI primitives)
**References:**
- 21st.dev: search "navbar", "footer", "mobile menu", "responsive layout"
- Tailwind mobile-first: https://tailwindcss.com/docs/responsive-design
- Framer Motion: https://www.framer.com/motion/
- Design decisions: white-dominant, pastel accents (#FFB5C5, #B5E8CC, #D4C5F9, #FFD4B5, #B5DAF9)

**What to build:**
- `app/layout.tsx` — root layout (HTML/body, Tailwind globals, Supabase session provider, metadata)
- `app/(storefront)/layout.tsx` — storefront layout with header + footer + WhatsApp float
- `components/layout/Header.tsx` — sticky header: pastel logo "SAVOR", nav links (Home, Menu, About), mobile hamburger. Framer Motion slide-down on scroll
- `components/layout/Footer.tsx` — footer: bakery name, address, contact, WhatsApp link, hours summary from site_settings
- `components/layout/MobileNav.tsx` — slide-in drawer with Framer Motion
- `components/ui/Container.tsx`, `Button.tsx` (primary=pink, secondary=mint, outline=lavender), `Card.tsx`, `Badge.tsx` (dietary: eggless=pink, GF=mint, keto=lavender, veg=green, non-veg=red-orange)
- `lib/data/site-settings.ts` — server-side cached fetch of site_settings
- `app/globals.css` — white bg, pastel CSS variables, font stack (Inter)

**Acceptance criteria:**
- Header sticky, hamburger works, nav links route correctly
- Footer shows bakery name, address, contact, WhatsApp, hours
- All pastel palette (no default Tailwind blue/gray)
- Mobile-first: correct at 375px, tablet 768px, desktop 1280px
- Framer Motion respects prefers-reduced-motion
- site_settings fetched server-side, cached

**QA happy:** Open at 375px → header hamburger, footer contact, pastel colors. Evidence: `evidence/t2-1-mobile-shell.png`
**QA failure:** prefers-reduced-motion: reduce → animations disabled. Evidence: `evidence/t2-1-reduced-motion.png`

**Commit:** `feat: build storefront layout shell (header, footer, mobile nav, UI primitives)`

---

#### T2.2: Build About page (brand narrative, gallery grid, Google Map, contact card)
**References:**
- 21st.dev: search "gallery grid", "masonry", "map embed"
- Google Maps embed: https://developers.google.com/maps/documentation/embed/embedding-map
- Decisions: gallery admin-uploadable, no photos at launch (empty state)

**What to build:**
- `app/(storefront)/about/page.tsx` — About page (server component, fetches site_settings + gallery_photos)
- `components/about/BrandNarrative.tsx` — renders site_settings.about_narrative in Card, Framer Motion fade-in
- `components/about/GalleryGrid.tsx` — responsive grid (2/3/4 cols), 21st.dev image grid; empty state "Photos coming soon" if no photos
- `components/about/LocationMap.tsx` — Google Maps iframe (site_settings.google_maps_embed_url) + "Get Directions" button (site_settings.google_maps_directions_url, new tab). Placeholder if URL null.
- `components/about/QuickContact.tsx` — contact card: address, phone, email, WhatsApp button, hours summary from weekly_hours

**Acceptance criteria:**
- Narrative renders from site_settings
- Gallery shows photos or empty state
- Map iframe loads (or placeholder if URL null)
- "Get Directions" opens new tab
- Contact card shows all info + hours
- Mobile-responsive 375px→1280px

**QA happy:** Navigate /about → narrative, gallery (empty state), map, contact card. Evidence: `evidence/t2-2-about-page.png`
**QA failure:** google_maps_embed_url=null → "Map coming soon" placeholder, no crash. Evidence: `evidence/t2-2-no-map.png`

**Commit:** `feat: build About page (brand narrative, gallery grid, Google Map, contact card)`

---

#### T2.3: Build Menu hub page (search, category filter, dietary badges, item cards)
**References:**
- 21st.dev: search "product card", "search bar", "filter chips", "food menu"
- Supabase select with filters: https://supabase.com/docs/reference/javascript/select
- Decisions: 6 categories, ~60 items, 3 pricing models, dietary tags, min order qty, sold-out toggle

**What to build:**
- `app/(storefront)/menu/page.tsx` — Menu hub (server component, fetches categories + menu_items)
- `lib/data/menu.ts` — `getCategories()`, `getMenuItems()` (active, sorted, cached)
- `components/menu/MenuSearch.tsx` — debounced search (name + description), 21st.dev search bar
- `components/menu/CategoryFilter.tsx` — horizontal scrollable pills (All + 6 categories), active=pastel fill, Framer Motion layout animation
- `components/menu/DietaryFilter.tsx` — toggleable badges (Eggless, GF, Keto, Veg, Non-Veg), AND logic
- `components/menu/MenuItemCard.tsx` — 21st.dev product card:
  - Name, description (truncated), price display by model (flat: "₹45", weight_tiers: "from ₹900", base_half_kg: "₹760 (½kg basic)")
  - Dietary badges, min order qty note ("Min. 4 pcs"), sold-out overlay (greyed + badge, no add-to-cart)
  - "Add to Cart" button (pastel primary)
- `components/menu/MenuGrid.tsx` — responsive grid (1/2/3 cols), Framer Motion stagger on filter change
- `hooks/useMenuFilter.ts` — combines search + category + dietary, memoized
- Empty state: "No items match your filters" + reset button

**Acceptance criteria:**
- All active categories + items load from Supabase
- Search filters by name+description (debounced 200ms)
- Category filter shows/hides items
- Dietary filter ANDs across selected tags
- Price display matches price_model
- Sold-out items greyed with badge, no add-to-cart
- Min order qty note shows when > 1
- Responsive 1/2/3 columns
- Framer Motion stagger on filter change
- Empty state when no matches

**QA happy:** /menu → all 6 categories, ~60 items. Search "chocolate" → filtered. Click "Eggless" → only eggless. Evidence: `evidence/t2-3-menu-filter.png`
**QA failure:** All items sold out → all greyed with "Sold Out" badges, no add-to-cart buttons. Evidence: `evidence/t2-3-all-sold-out.png`

**Commit:** `feat: build Menu hub page (search, category filter, dietary badges, item cards)`

---

#### T2.4: Build promotional banner display system
**References:**
- 21st.dev: search "hero banner", "alert banner", "carousel"
- promo_banners schema (T1.3), RLS: public reads active+within date range (T1.4)

**What to build:**
- `lib/data/banners.ts` — `getActiveBanners(position?)`: queries active banners within date range, cached
- `components/banners/HeroBanner.tsx` — large card, optional poster image bg, title/body/CTA, Framer Motion fade+scale
- `components/banners/MenuTopBanner.tsx` — compact pastel strip, dismissible (localStorage)
- `components/banners/SiteWideStrip.tsx` — thin strip above header, pastel bg, dismissible
- `components/banners/BannerCarousel.tsx` — auto-rotate 5s if multiple banners same position, Framer Motion slide, manual dots
- `hooks/useDismissedBanners.ts` — tracks dismissed banner IDs in localStorage
- Integrate: SiteWideStrip in storefront layout above header, HeroBanner on homepage, MenuTopBanner on menu page

**Acceptance criteria:**
- Active banners within date range display in configured positions
- Expired/not-started banners do NOT display
- Dismissible banners stay dismissed (localStorage)
- Multiple banners same position auto-rotate as carousel
- Poster image shows as bg with pastel overlay; no image = pastel gradient
- CTA links to configured URL
- SiteWideStrip on all pages, HeroBanner on homepage, MenuTopBanner on menu

**QA happy:** Create 2 active homepage_hero banners → homepage shows carousel. Evidence: `evidence/t2-4-banner-carousel.png`
**QA failure:** Banner end_date=yesterday → not displayed. Evidence: `evidence/t2-4-expired-banner.png`

**Commit:** `feat: build promotional banner display system (hero, menu-top, site-wide strip, carousel)`

---

#### T2.5: Build floating WhatsApp widget + homepage
**References:**
- WhatsApp wa.me links: https://faq.whatsapp.com/5913398998672934/
- 21st.dev: search "floating action button", "FAB"
- Decisions: wa.me/919836537447, floating bottom-right

**What to build:**
- `components/widgets/WhatsAppFloat.tsx` — fixed bottom-right: green WhatsApp SVG icon, Framer Motion pulse animation, click opens wa.me/919836537447 in new tab, tooltip "Chat with us!", z-index above content below modals, respects reduced-motion
- `app/(storefront)/page.tsx` — homepage: HeroBanner, "Welcome to SAVOR" tagline + CTA to /menu, featured items (top 4-6 by sort_order), About preview (2-3 sentences + link), Custom Cake CTA ("Build your custom cake" → custom cake page)
- WhatsAppFloat in storefront layout (all pages)

**Acceptance criteria:**
- WhatsApp button fixed bottom-right on all storefront pages
- Click opens wa.me link in new tab
- Pulse animation, disabled with reduced-motion
- Tooltip on hover
- Homepage: hero, welcome, featured items, about preview, custom cake CTA
- All mobile-responsive, pastel-themed

**QA happy:** Scroll homepage → button stays fixed. Click → new tab opens wa.me. Evidence: `evidence/t2-5-whatsapp-click.png`
**QA failure:** Reduced-motion → no pulse. Evidence: `evidence/t2-5-reduced-motion.png`

**Commit:** `feat: build floating WhatsApp widget + homepage (hero, featured, about preview, custom cake CTA)`

---

### Wave 3 — Menu CMS + Cart + Checkout

#### T3.1: Build cart state management with localStorage persistence
**References:**
- React Context + useReducer for cart state
- Decisions: cart persists in localStorage for glitch recovery
- Cart item model: weight tiers, addons, variants, qty, bulk detection, decoration tiers

**What to build:**
- `types/cart.ts` — CartItem interface (id, menuItemId, name, priceModel, unitPriceCents, quantity, selectedSize, selectedVariant, selectedAddons[], selectedDecoration, lineTotalCents, requiresCustomNotice, minOrderQty, image_url) + CartState (items, fulfillment, requestedSlot, guestInfo)
- `lib/cart/CartContext.tsx` — React Context with useReducer: ADD_ITEM, UPDATE_QTY, REMOVE_ITEM, CLEAR_CART, SET_FULFILLMENT, SET_SLOT, SET_GUEST_INFO, HYDRATE_FROM_STORAGE. Persists to localStorage key `savor-cart` on every change. Hydrates on mount. SSR-safe.
- `hooks/useCart.ts` — convenience hook: items, totalCents, itemCount, hasBulkItems, requiresCustomNotice, addItem, updateQty, removeItem, clearCart, fulfillment, setFulfillment
- `components/cart/CartProvider.tsx` — wraps app in CartContext (root layout)

**Acceptance criteria:**
- Add item → updates state + localStorage
- Reload → cart restored from localStorage
- Remove/clear → updates state + localStorage
- lineTotalCents computed correctly per item
- totalCents = sum of all lineTotalCents
- hasBulkItems detects qty > bulk_threshold
- SSR-safe (no hydration errors)

**QA happy:** Add 5x cupcake @₹45 + 1x cheesecake ½kg @₹1000 → total ₹1225. Reload → restored. Evidence: `evidence/t3-1-cart-persistence.txt`
**QA failure:** Corrupt localStorage (`savor-cart`="{invalid") → no crash, cart empty, console warning. Evidence: `evidence/t3-1-corrupted-storage.txt`

**Commit:** `feat: build cart state management with localStorage persistence + cart types`

---

#### T3.2: Build cart math + validation utilities with unit tests
**References:**
- Vitest: https://vitest.dev/
- Decisions: 3 pricing models, addons, variants, decoration tiers, min order qty, bulk detection, 3 notice rules (12h global, 24h bulk, 5d custom)

**What to build:**
- `lib/cart/math.ts` — pure functions:
  - `computeLineTotal(item)` — (unitPrice + variantDelta + sum(addons) + decorationDelta) * qty
  - `computeCartTotal(items)` — sum of lineTotalCents
  - `getItemUnitPrice(menuItem, selectedSize?)` — resolves base_price or price_options
  - `getAddonSum(addons)`, `getVariantDelta(menuItem, variant)`, `getDecorationDelta(menuItem, decoration)`
  - `detectBulk(items, threshold)` — returns items where qty > threshold
  - `formatPrice(cents)` — "₹{cents/100}" (handles ₹45.50)
- `lib/cart/validation.ts` — pure functions:
  - `validateMinOrderQty(item)` — qty >= minOrderQty
  - `validateNoticeWindow(slot, noticeHours)` — slot >= now + noticeHours
  - `validateBulkNotice(slot, bulkItems, bulkNoticeHours)` — slot >= now + bulkNoticeHours if bulk items
  - `validateCustomNotice(slot, hasCustom, customNoticeDays)` — slot >= now + customNoticeDays if custom items
  - `validateOperatingHours(slot, weeklyHours, holidays)` — checks day open + time within hours + not holiday
  - `getEarliestValidSlot(noticeHours, bulkNoticeHours, hasBulk, customNoticeDays, hasCustom, weeklyHours, holidays)` — computes earliest valid pickup/delivery datetime:
    1. Applicable notice = MAX(globalNoticeHours, bulkNoticeHours IF hasBulk, customNoticeDays*24 IF hasCustom) — windows STACK by taking max (bulk+custom = max(12h, 24h, 120h) = 5 days)
    2. earliest = now + applicableNotice
    3. If earliest falls on closed day (weekly_hours) or holiday → skip forward to next open day
    4. If earliest time is before open-from → set to open-from; if after open-to → skip to next open day at open-from
    5. Keep skipping forward through multi-day closures (extended holidays) until an open day is found
    6. Return final valid datetime
- `lib/cart/__tests__/math.test.ts` — 10+ test cases covering all 3 pricing models, addons, variants, decoration, bulk detection, cart total, formatPrice
- `lib/cart/__tests__/validation.test.ts` — 10+ test cases: notice windows (global/bulk/custom individually + combined), operating hours (closed day, holiday, outside hours), earliest valid slot computation

**Acceptance criteria:**
- All pure functions correct for 3 pricing models
- Addon/variant/decoration deltas computed correctly
- Bulk detection at boundary (qty=threshold → NOT bulk; qty=threshold+1 → bulk)
- All 3 notice windows validated independently + combined (max)
- Operating hours: closed days, holidays, outside-hours all blocked
- getEarliestValidSlot skips to next open day
- All unit tests pass (`npm run test`)

**QA happy:** `npm run test` → all math + validation tests pass. Evidence: `evidence/t3-2-tests-pass.txt`
**QA failure:** Change bulk_threshold to 5, run detectBulk test with qty=8 → test correctly identifies as bulk at new threshold. Evidence: `evidence/t3-2-threshold-change.txt`

**Commit:** `feat: build cart math utilities + validation logic with comprehensive unit tests`

---

#### T3.3: Build menu item detail modal + add-to-cart interaction
**References:**
- 21st.dev: search "product detail", "modal", "drawer", "quantity selector"
- Cart math from T3.2, cart state from T3.1

**What to build:**
- `components/menu/MenuItemDetail.tsx` — modal/drawer:
  - Item name, description, dietary badges
  - Size selector (if weight_tiers or size_options): radio/pills, price updates dynamically
  - Variant selector (if variants): dropdown/pills, price updates with delta
  - Addon selector (if addons): checkboxes, price updates with sum
  - Decoration tier selector (if decoration_tiers): radio (Basic/Premium/Luxury), price updates
  - Quantity stepper: min = min_order_qty, shows "Min. {N} pcs"
  - Live price display: updates as selections change
  - "Add to Cart" button: disabled if qty < min_order_qty, "Added!" confirmation (1.5s)
  - Sold-out: "Sold Out" shown, no add-to-cart
  - Mobile: bottom sheet (swipe to dismiss), desktop: centered modal
- `components/menu/AddToCartButton.tsx` — flat items with no options → adds directly; otherwise opens modal
- `hooks/useAddToCart.ts` — wraps CartContext.addItem with CartItem construction + lineTotalCents via math.ts

**Acceptance criteria:**
- Flat items no options → direct add, no modal
- Items with options → modal opens with selectors
- Size/variant/addon/decoration selection updates live price
- Quantity enforces min_order_qty
- Add to cart: correct item + lineTotalCents
- "Added!" confirmation shows
- Sold-out: no add-to-cart
- Mobile bottom sheet, desktop modal
- Pastel-themed

**QA happy:** Cheesecake → modal → 1kg + Biscoff addon → ₹2,080 → Add → cart updated. Evidence: `evidence/t3-3-add-cheesecake.txt`
**QA failure:** Cupcake min_order_qty=4 → stepper blocked at 4. Evidence: `evidence/t3-3-min-qty-block.txt`

**Commit:** `feat: build menu item detail modal with size/variant/addon/decoration selectors + add-to-cart`

---

#### T3.4: Build checkout flow (fulfillment + date/time picker + validation + guest info)
**References:**
- 21st.dev: search "checkout form", "date picker", "time slot", "stepper"
- Cart validation from T3.2, site_settings (weekly_hours, holidays, notice rules) from T1.3
- Decisions: guest checkout, pickup vs delivery, operating-hours blocking, notice enforcement, bulk/custom layering

**What to build:**
- `app/(storefront)/checkout/page.tsx` — checkout page
- `components/checkout/FulfillmentSelector.tsx` — two cards: Pickup / Delivery. Delivery disabled if site_settings.delivery_enabled=false. Pastel fill on select.
- `components/checkout/DateTimePicker.tsx` — custom date/time picker:
  - Date selector: greys out closed days (weekly_hours), holidays, past dates
  - Time selector: 30-min slots from open-from to open-to for selected day
  - Earliest selectable = getEarliestValidSlot() from T3.2
  - Warning: "Items requiring 24h notice — earliest is {date}" if bulk items
  - Warning: "Custom cakes require 5 days advance — earliest is {date}" if custom items
  - Mobile: native date/time input fallback
- `components/checkout/GuestInfoForm.tsx` — name (required), phone (required, Indian format), email (required, validated), if delivery: address (required, textarea) + landmark (optional). "Create account to track orders" checkbox.
- `components/checkout/OrderSummary.tsx` — cart items with selections, quantities, line totals, grand total. Remove button per item. Edit link to menu.
- `components/checkout/PlaceOrderButton.tsx` — disabled if cart empty / fulfillment not selected / datetime invalid / guest info incomplete. Loading state during submission.
- `hooks/useCheckoutValidation.ts` — combines all validations, returns { isValid, errors[] }

**Acceptance criteria:**
- Empty cart → "Your cart is empty" + link to menu
- Pickup → no address fields; Delivery → address + landmark appear
- Date picker greys closed days + holidays
- Time picker shows slots within operating hours
- Earliest datetime respects max(global_notice, bulk_notice if bulk, custom_notice if custom)
- Warning messages for bulk/custom items
- Guest form validates required fields, phone format, email format
- Place Order disabled until all validations pass
- Mobile-responsive, pastel-themed

**QA happy:** 5 cupcakes (no bulk) → Pickup → earliest = now+12h → select date+time → fill info → Place Order enabled. Evidence: `evidence/t3-4-checkout-valid.txt`
**QA failure:** 15 cupcakes (bulk, threshold=10) → earliest = now+24h → try 12h away → "Bulk orders require 24h advance notice". Evidence: `evidence/t3-4-bulk-blocked.txt`

**Commit:** `feat: build checkout flow (fulfillment selector, date/time picker with validation, guest info form)`

---

#### T3.5: Build order submission API + confirmation page + idempotency
**References:**
- Supabase insert: https://supabase.com/docs/reference/javascript/insert
- Order schema from T1.3, human-readable ID SAV-YYMMDD-NNNN
- Decisions: guest checkout, idempotent creation, email on order

**What to build:**
- `lib/orders/human-id.ts` — generates SAV-YYMMDD-NNNN using a **Postgres sequence** (definitive, not "or retry loop"):
  - Create sequence: `CREATE SEQUENCE public.order_daily_seq CYCLE MAXVALUE 9999;`
  - On insert: `SELECT nextval('public.order_daily_seq')`, pad to 4 digits, combine with YYMMDD. Reset sequence at midnight via a cron or on first insert of new day (check if date changed since last insert, if so `ALTER SEQUENCE ... RESTART`).
  - This is race-safe (Postgres sequences are atomic).
- `app/api/orders/route.ts` — POST (Edge runtime):
  1. Parse body (cart items, fulfillment, requestedSlot, guestInfo)
  2. Server-side re-validation (never trust client) — notice windows (MAX of global + bulk-if-applicable + custom-if-applicable), operating hours, min order qty
  3. Check Idempotency-Key header → return cached response if duplicate
  4. Generate human_id via Postgres sequence (race-safe)
  5. INSERT into orders (status='pending', payment_status='unpaid')
  6. INSERT all order_items
  7. If custom_inquiry/custom_full: INSERT into custom_cake_inquiries
  8. Fire-and-forget: sendOrderEmails(order) via Promise.all
  9. Return 201 { orderId, humanId, totalCents, items: [...] } — **include full order data in response** so the confirmation page has everything without needing a separate GET
  10. Rate limiting: max 5 orders per IP per 10 min
  - Errors: 500 with generic message (no stack trace)
- `app/api/orders/[id]/route.ts` — GET (order by UUID):
  - **If authenticated** (customer_id matches auth.uid): return order (RLS allows)
  - **If staff/admin**: return order (RLS allows)
  - **If guest (no auth)**: verify via query params `?email={guest_email}&phone={guest_phone}` — server-side (service-role client) checks that guest_email AND guest_phone match the order before returning. This is the **guest order retrieval path** (RLS blocks anon SELECT, so this endpoint uses the admin client with explicit verification).
  - If no match → 404 "Order not found"
- `app/(storefront)/orders/lookup/page.tsx` — **"Find My Order" page for guests**: form with email + phone → calls `GET /api/orders?email=X&phone=Y` (or a dedicated lookup endpoint) → shows order details. Accessible without login. This solves the gap where guests can't read their orders via RLS.
- `app/(storefront)/checkout/confirmation/page.tsx` — confirmation page: receives full order data from POST 201 response (orderId, humanId, totalCents, items, fulfillment, slot). Displays: order ID, items, total, fulfillment, slot, "What happens next?" explainer, payment info (Pay on pickup or Razorpay link), "Back to Menu", "Find My Order" link (to /orders/lookup for future reference), clears cart, Framer Motion success animation. **Stores orderId in localStorage** so guest can later retrieve via "Find My Order" if they reload.

**Acceptance criteria:**
- POST valid data → 201 with orderId + humanId + full order data (items, total, fulfillment, slot)
- Order + order_items inserted in Supabase
- human_id format SAV-YYMMDD-NNNN, sequence increments (Postgres sequence, race-safe)
- Emails sent (fire-and-forget, doesn't block response)
- Idempotency: same key → cached response, no duplicate
- Server validation catches invalid data (notice violation, closed day, min order qty)
- Notice validation: takes MAX of global(12h) + bulk(24h if bulk items) + custom(5d if custom items)
- Rate limit: 6th request in 10 min → 429
- Confirmation page renders full order details from POST response (no additional GET needed)
- Cart cleared after confirmation
- Guest can retrieve order later via "Find My Order" page (email + phone verification)
- Guest order retrieval: GET with email+phone matching → returns order; non-matching → 404
- No stack traces in errors

**QA happy:** Submit valid order → 201 → confirmation shows SAV-260819-0001. Check Supabase → order exists. Evidence: `evidence/t3-5-order-success.txt`
**QA failure:** Submit with slot only 6h ahead (noticeHours=12) → 400 "Orders require at least 12 hours advance notice". Evidence: `evidence/t3-5-notice-violation.txt`

**Commit:** `feat: build order submission API (idempotent, validated, email-triggering) + confirmation page`

---

### Wave 4 — Order Management + Realtime Alarm + Notifications

#### T4.1: Build Supabase Realtime Broadcast subscription for admin tabs
**References:**
- Supabase Broadcast: https://supabase.com/docs/guides/realtime/broadcast
- Supabase Realtime authorization: https://supabase.com/docs/guides/realtime/authorization
- Research (bg_2de5c286): broadcast_changes() via trigger (set up in T1.3), private channels, RLS on realtime.messages (T1.4), worker:true + heartbeatCallback for background tabs, Broadcast Replay for missed events

**What to build:**
- `lib/realtime/client-config.ts` — Supabase client with realtime options: `worker: true` (survives background tab throttling), `heartbeatCallback` (reconnects on disconnect)
- `lib/realtime/orders-channel.ts` — `subscribeToOrders(onNewOrder)`: subscribes to 'orders' private channel, broadcast event 'INSERT', calls onNewOrder with order data. Status handling: SUBSCRIBED → syncMissedOrders(), CHANNEL_ERROR/TIMED_OUT/CLOSED → scheduleReconnect()
- `lib/realtime/sync-missed.ts` — catch-up: on SUBSCRIBED, fetch orders created after lastSeenOrderId (localStorage), replay alarm for each, update lastSeenOrderId
- `lib/realtime/replay.ts` — Broadcast Replay config: `broadcast: { replay: { since: Date.now() - 60_000, limit: 25 } }`, dedup by checking `payload.meta.replayed === true` + comparing order IDs against already-alarmed set

**Acceptance criteria:**
- Admin tab subscribes to 'orders' channel on mount
- New order INSERT → broadcast → onNewOrder fires with order data
- Background tab (worker:true) maintains heartbeat, doesn't silently disconnect
- On reconnect → syncMissedOrders fetches orders since lastSeenOrderId
- Broadcast Replay delivers missed messages (replayed flag)
- Dedup prevents double-alarming (replay + live + sync)
- Channel is private (staff auth required — RLS enforced)

**QA happy:** Open admin tab, submit order from another browser → admin tab receives broadcast within ~1s. Evidence: `evidence/t4-1-broadcast-received.txt`
**QA failure:** Background admin tab 5 min, submit order → tab still receives broadcast (worker:true). If not, on foreground → syncMissedOrders catches up. Evidence: `evidence/t4-1-background-recovery.txt`

**Commit:** `feat: build Supabase Realtime Broadcast subscription for admin tabs (worker, heartbeat, replay, catch-up)`

---

#### T4.2: Build admin alarm client (Web Audio + Notification + title flash + badge + cross-tab)
**References:**
- Research (bg_2de5c286): Web Audio beep, Notification API, title flashing, navigator.setAppBadge, BroadcastChannel
- MDN Notification API, Web Audio API, BroadcastChannel
- Decisions: sound + desktop notification + red badge; email fallback if no ack in 30s

**What to build:**
- `lib/alarm/audio.ts` — `beep(durationMs=350, freq=880)`: AudioContext (lazy, unlocked on gesture), oscillator→gain→destination, square wave, envelope. `unlockAudio()`: resumes AudioContext (from user gesture).
- `lib/alarm/notification.ts` — `requestNotificationPermission()` (from gesture), `showOrderNotification(order)`: Notification with order ID/total/slot, requireInteraction:true, onclick→focus+stopFlashing
- `lib/alarm/title-flash.ts` — `flashTitle(text='🔔 NEW ORDER')`: interval swapping document.title. `stopFlashing()`: restore original. Only when tab not visible.
- `lib/alarm/badge.ts` — `setBadge()` / `clearBadge()` via navigator.setAppBadge/clearAppBadge (feature-detected)
- `lib/alarm/cross-tab.ts` — BroadcastChannel('orders-alarm'): `notifySiblingTabs(order)` posts to channel, `listenSiblingTabs(onOrder)` listens. Purpose: tab 1 receives WS → forwards to tabs 2/3/4.
- `lib/alarm/trigger.ts` — `triggerAlarm(order)`: beep (if not visible) + showOrderNotification + flashTitle + setBadge. `stopAlarm()`: stopFlashing + clearBadge.
- `components/admin/AlarmUnlock.tsx` — "Enable alarm sound" button on first admin login (if permission not granted). On click: requests Notification permission + unlocks AudioContext. Persists state in localStorage. Green checkmark when enabled.
- `hooks/useAlarm.ts` — subscribes to Realtime + BroadcastChannel, calls triggerAlarm on new order, calls stopAlarm on visibilitychange to visible, returns { isAlarmEnabled, enableAlarm, stopAlarm }

**Acceptance criteria:**
- Beep plays when alarm fires (if tab not visible)
- Desktop notification shows order details, stays until clicked
- Title flashes between "🔔 NEW ORDER" and original when not visible
- App badge set on alarm, cleared on tab visible
- Cross-tab: tab 1 receives WS → tab 2 also alarms via BroadcastChannel
- AlarmUnlock button on first login, disappears when granted
- stopAlarm on tab visible
- Feature-detected (no crash if APIs unavailable)

**QA happy:** Admin tab (alarm unlocked), submit order → beep + notification + title flash + badge. Click notification → stops. Evidence: `evidence/t4-2-alarm-triggered.png`
**QA failure:** Notification.permission='denied' → beep + title flash + badge (no desktop notification), no crash. Evidence: `evidence/t4-2-no-notification-permission.txt`

**Commit:** `feat: build admin alarm client (Web Audio beep, Notification, title flash, badge, cross-tab, unlock flow)`

---

#### T4.3: Build 30s ack watchdog (Cloudflare Cron → email fallback) + admin acknowledge button
**References:**
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Decisions: email fallback if no admin acks in 30s
- Resend sendMissedOrderAlert from T1.7, orders.acknowledged_at from T1.3

**What to build:**
- `wrangler.jsonc` — add cron trigger: `"triggers": { "crons": ["*/1 * * * *"] }` (every minute)
- `app/api/cron/ack-watchdog/route.ts` — GET handler (Edge):
  1. Verify CRON_SECRET header (Authorization: Bearer)
  2. Query Supabase (service-role): orders WHERE acknowledged_at IS NULL AND created_at < now() - 30s AND staff_email_sent_at IS NULL
  3. For each: sendMissedOrderAlert(order) + UPDATE staff_email_sent_at = now()
  4. Return 200
- `app/api/orders/[id]/ack/route.ts` — POST: updates acknowledged_at = now() + acknowledged_by = auth uid (staff/admin only)
- `components/admin/AckButton.tsx` — "Acknowledge Order" button on order dashboard. On click: calls ack API → updates acknowledged_at. Button turns green "Acknowledged ✓".

**Acceptance criteria:**
- Cron runs every minute
- Orders unacked >30s → fallback email to staff
- No duplicate fallback (staff_email_sent_at guard)
- Admin ack button updates acknowledged_at
- Acked orders not picked up by watchdog
- CRON_SECRET protects endpoint
- Email subject: "🚨 UNACKNOWLEDGED ORDER: SAV-XXXXXX-NNNN — Please check now"

**QA happy:** Submit order, don't open admin tab → after ~1 min, staff email receives "UNACKNOWLEDGED ORDER" alert. Evidence: `evidence/t4-3-watchdog-email.txt`
**QA failure:** Submit order, open admin tab, click "Acknowledge" within 30s → no fallback email. Evidence: `evidence/t4-3-acked-no-fallback.txt`

**Commit:** `feat: build 30s ack watchdog (Cloudflare Cron + email fallback) + admin acknowledge button`

---

#### T4.4: Build Resend webhook handler (delivery, bounce, complaint + dedup)
**References:**
- Resend webhooks: https://resend.com/docs/dashboard/webhooks/introduction
- Resend webhook verification: https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
- Research (bg_2de5c286): svix headers, raw body required, IP allowlist
- Research (bg_96037fdc): `export const dynamic='force-dynamic'`, raw body before JSON parse

**What to build:**
- `supabase/migrations/00007_webhook_dedup.sql` — `processed_webhooks` table (event_id text PK, source text, processed_at timestamptz)
- `app/api/webhooks/resend/route.ts` — POST (Edge, force-dynamic):
  1. `const payload = await req.text()` (raw body FIRST)
  2. Extract svix-id, svix-timestamp, svix-signature headers
  3. Verify signature via `resend.webhooks.verify({ payload, headers, webhookSecret })`
  4. Check processed_webhooks for svix-id → skip if already processed (dedup)
  5. Handle events: email.delivered → update orders.email_status; email.bounced → suppress address + broadcast alert to admin; email.complained → suppress; email.failed → alert admin; email.delivery_delayed → log + watch
  6. Insert svix-id into processed_webhooks
  7. Return 200 (fast, < 5s)

**Acceptance criteria:**
- POST with raw body, signature verified
- Invalid signature → 400
- Valid events processed (delivered/bounced/complained/failed/delayed)
- Dedup: same svix-id twice → second ignored
- Bounced/complained emails suppressed
- Failed email triggers admin alert (Realtime broadcast)
- 200 returned within 5s
- `export const dynamic = 'force-dynamic'`

**QA happy:** Send test webhook from Resend dashboard → verifies, processes, 200. Evidence: `evidence/t4-4-webhook-success.txt`
**QA failure:** Wrong signature → 400 "Invalid signature". Evidence: `evidence/t4-4-bad-signature.txt`

**Commit:** `feat: build Resend webhook handler (signature verification, dedup, event processing)`

---

#### T4.5: Build admin order dashboard (list, filters, detail, ack, status update, realtime)
**References:**
- Realtime subscription from T4.1, alarm from T4.2, ack button from T4.3
- Orders + order_items schema from T1.3
- 21st.dev: search "dashboard", "data table", "order list"
- RBAC: staff + admin (middleware from T1.6)

**What to build:**
- `app/admin/orders/page.tsx` — order dashboard (server component): fetches all orders (sorted by created_at desc), renders list with filters (status, fulfillment, date range)
- `components/admin/OrderList.tsx` — order cards: human_id (bold), created time, status badge (color-coded), customer name+phone, fulfillment icon + slot, total, ack status (red "Unacknowledged" pulsing / green "Acknowledged ✓"), click to expand
- `components/admin/OrderDetail.tsx` — expanded view: all order items with selections + line totals, grand total, customer info, delivery address, requested slot, status dropdown (pending→confirmed→paid→in_progress→ready→fulfilled / cancelled), Acknowledge button, "Mark as Paid" button (for offline UPI custom cakes), staff notes textarea, "Send Status Update" button (emails customer)
- `components/admin/OrderFilters.tsx` — status dropdown, fulfillment toggle, date picker
- `hooks/useRealtimeOrders.ts` — subscribes to Realtime 'orders' channel, merges new orders into list, plays alarm on new order
- `components/admin/NewOrderToast.tsx` — Framer Motion slide-in toast: "New order received!" + order ID + total. Auto-dismiss 10s (alarm continues until ack/visible).
- Status update API: `app/api/orders/[id]/status/route.ts` — PUT (staff+), updates order status
- Mark paid API: `app/api/orders/[id]/mark-paid/route.ts` — PUT (staff+), sets payment_status='paid', payment_method='upi_manual'

**Acceptance criteria:**
- Order dashboard shows all orders sorted newest first
- Filters work (status, fulfillment, date range)
- New order via Realtime → appears at top + alarm fires + toast shows
- Acknowledge → badge green, alarm stops
- Status dropdown updates order in Supabase
- "Mark as Paid" sets payment_status='paid' for offline UPI
- Staff notes save
- "Send Status Update" emails customer
- Order detail shows all items with selections + line totals
- Mobile-responsive (admin may use tablet)

**QA happy:** /admin/orders → order list. Submit order from customer → new order at top with red "Unacknowledged" + alarm + toast. Click "Acknowledge" → green, alarm stops. Evidence: `evidence/t4-5-order-dashboard.png`
**QA failure:** Customer tries /admin/orders → redirected to /login. Evidence: `evidence/t4-5-customer-blocked.txt`

**Commit:** `feat: build admin order dashboard (list, filters, detail, ack, status update, realtime, toast)`

---

### Wave 5 — Admin Panel (Full CMS)

#### T5.1: Build admin layout shell + auth guard + navigation
**References:**
- RBAC from T1.6 (requireStaff, requireAdmin, middleware)
- 21st.dev: search "admin dashboard layout", "sidebar", "tab navigation"

**What to build:**
- `app/admin/layout.tsx` — auth guard (requireStaff), sidebar (desktop) / bottom nav (mobile), top bar (logo, "Admin Panel", user email, logout, AlarmUnlock button), pastel admin theme
- `components/admin/Sidebar.tsx` — nav: Orders, Menu Items, Categories, Promo Banners, Gallery, Site Settings, Custom Cake Inquiries, Account. Active route = pastel fill. Collapsible desktop, hidden mobile.
- `components/admin/MobileBottomNav.tsx` — fixed bottom nav for mobile admin (icons only)
- `components/admin/AdminHeader.tsx` — top bar: user info, logout, alarm status indicator
- `app/admin/page.tsx` — redirect to /admin/orders

**Acceptance criteria:**
- Non-authenticated → /login; Customer → /login; Staff → /admin/orders + allowed pages; Admin → all /admin/*
- Sidebar nav routes correctly
- Mobile bottom nav works
- Logout signs out + redirects
- AlarmUnlock in header if not enabled

**QA happy:** Login as admin → sidebar with all nav items. Click "Menu Items" → /admin/menu-items. Evidence: `evidence/t5-1-admin-nav.png`
**QA failure:** Login as staff → /admin/site-settings → admin-only page shows "Admin access required" or redirect. Evidence: `evidence/t5-1-staff-settings-block.txt`

**Commit:** `feat: build admin layout shell (sidebar, mobile nav, auth guard, header with alarm unlock)`

---

#### T5.2: Build menu items CRUD (create, edit, delete, sold-out toggle, price models, addons, variants, image upload)
**References:**
- menu_items schema from T1.3, RLS: admin write (T1.4)
- 21st.dev: search "data table", "form", "CRUD", "toggle switch", "image upload"
- Decisions: everything editable; 3 pricing models; addons; variants; decoration tiers; min order qty; dietary tags; sold-out toggle

**What to build:**
- `app/admin/menu-items/page.tsx` — list: table of all items (name, category, price, price model, sold-out toggle, active toggle, sort order). Search by name, filter by category. "Add New Item" button. Row actions: Edit, Delete (confirm modal), Duplicate.
- `components/admin/MenuItemForm.tsx` — create/edit form:
  - Name (required), Category (dropdown), Description (textarea)
  - Price model (radio: flat / weight_tiers / base_half_kg)
  - Base price (number, in rupees → stored as cents)
  - Price options (if weight_tiers): dynamic {label, price} rows (add/remove)
  - Size options (if base_half_kg): dynamic {label, price_delta} rows
  - Decoration tiers (if base_half_kg): dynamic {label, price_delta} rows
  - Addons: dynamic {name, price, is_active} rows
  - Variants: dynamic {name, price_delta} rows
  - Min order qty (number, default 1)
  - Dietary tags (multi-select: eggless, GF, keto, veg, non-veg + custom tag input)
  - Image upload (optional, Supabase Storage 'menu-items' bucket, preview, remove)
  - Requires custom notice (checkbox — true for frosted sponge cakes → 5-day rule)
  - Sort order, Is active (toggle)
  - Save / Cancel
- `app/admin/menu-items/[id]/page.tsx` — edit page (pre-fills form)
- `app/api/admin/menu-items/route.ts` — POST (create), GET (list) — admin only
- `app/api/admin/menu-items/[id]/route.ts` — GET, PUT, DELETE — admin only
- `components/admin/SoldOutToggle.tsx` — instant toggle: PATCH is_sold_out, optimistic UI, green=available / red=sold out, no reload
- `components/admin/DeleteConfirmModal.tsx` — reusable: "Are you sure? This cannot be undone." Cancel/Delete. Pastel warning.
- `components/admin/ImageUploader.tsx` — reusable: drag-drop + click to browse, preview, remove, uploads to specified bucket, file validation (image only, max 5MB, jpg/png/webp)

**Acceptance criteria:**
- List shows all items with correct data
- Create form: all fields work, price model switchers show/hide relevant fields
- Dynamic rows (price options, addons, variants, decoration tiers): add/remove works
- Image upload: drag-drop, preview, remove, uploads to Storage
- Save → creates in Supabase, redirect to list with success toast
- Edit → pre-fills all fields including jsonb arrays
- Delete → confirm modal → deletes
- Sold-out toggle → instant update, no reload, optimistic UI
- Dietary tags: multi-select + custom tag
- All API routes require admin auth

**QA happy:** "Add New Item" → fill form (name="Test Cake", price=500, flat, eggless) → Save → appears in list. Toggle sold-out → red. Evidence: `evidence/t5-2-menu-crud.txt`
**QA failure:** Delete → confirm modal → Cancel → item NOT deleted. Evidence: `evidence/t5-2-delete-cancel.txt`

**Commit:** `feat: build menu items CRUD (create, edit, delete, sold-out toggle, price models, addons, variants, image upload)`

---

#### T5.3: Build categories CRUD
**References:**
- categories schema from T1.3, RLS: admin write (T1.4)
- Reuse DeleteConfirmModal from T5.2

**What to build:**
- `app/admin/categories/page.tsx` — list: name, sort order, active toggle, item count, edit/delete
- `app/admin/categories/new/page.tsx` + `[id]/page.tsx` — create/edit form: name, sort_order, is_active
- `app/api/admin/categories/route.ts` — POST, GET
- `app/api/admin/categories/[id]/route.ts` — GET, PUT, DELETE
- Delete guard: if category has items, warning "This category has {N} items. Delete anyway? (Items will be uncategorized.)"

**Acceptance criteria:**
- List shows all categories with item counts
- Create/edit/delete work
- Delete with items → warning → items become uncategorized (category_id = null)
- Active toggle + sort order work

**QA happy:** Create "Test Category" → appears. Edit name → updated. Evidence: `evidence/t5-3-category-crud.txt`
**QA failure:** Delete category with 5 items → warning → confirm → deleted, 5 items category_id=null. Evidence: `evidence/t5-3-category-delete-with-items.txt`

**Commit:** `feat: build categories CRUD (create, edit, delete with item guard, active toggle)`

---

#### T5.4: Build promo banners CRUD
**References:**
- promo_banners schema from T1.3, RLS: admin write (T1.4)
- Decisions: title, body, CTA, poster image, start/end date, position, dismissible
- Reuse ImageUploader, DeleteConfirmModal from T5.2

**What to build:**
- `app/admin/banners/page.tsx` — list: title, position, date range, active toggle, edit/delete
- `app/admin/banners/new/page.tsx` + `[id]/page.tsx` — form: title (required), body_text, cta_text + cta_link, poster image upload (to 'promo-banners' bucket), position (dropdown: homepage_hero / menu_top / site_wide_strip), start_date, end_date, is_dismissible, is_active, sort_order
- Live preview: mini preview of banner appearance as admin fills form
- `app/api/admin/banners/route.ts` — POST, GET
- `app/api/admin/banners/[id]/route.ts` — GET, PUT, DELETE

**Acceptance criteria:**
- List shows all banners with position, date range, active status
- Create form: all fields, image upload to promo-banners bucket
- Live preview shows banner appearance
- Date range enforced (expired not shown on storefront — verified in T2.4)
- Active toggle: instant
- Delete with confirm modal

**QA happy:** Create "Diwali Special - 20% off" → homepage_hero, start=now, end=+7d, poster uploaded → appears on storefront. Evidence: `evidence/t5-4-banner-create.txt`
**QA failure:** Create banner with end_date=yesterday → created but NOT shown on storefront. Evidence: `evidence/t5-4-banner-expired.txt`

**Commit:** `feat: build promo banners CRUD (create, edit, delete, image upload, live preview, date range)`

---

#### T5.5: Build gallery management (multi-upload, caption, reorder, delete)
**References:**
- gallery_photos schema from T1.3, Storage 'gallery' bucket from T1.5
- Reuse ImageUploader, DeleteConfirmModal from T5.2

**What to build:**
- `app/admin/gallery/page.tsx` — grid view (4 cols desktop, 2 cols mobile): thumbnail, caption, sort order, active toggle, delete
- Multi-file upload: drag multiple images → upload all to 'gallery' bucket → insert rows. Progress per file. Caption per image (optional).
- `app/api/admin/gallery/route.ts` — POST (upload), GET (list)
- `app/api/admin/gallery/[id]/route.ts` — PUT (caption/sort/active), DELETE (remove from DB + Storage)
- Drag-to-reorder (updates sort_order)
- Active toggle per photo

**Acceptance criteria:**
- Grid shows all photos
- Multi-file upload works (multiple images at once)
- Caption editable per photo
- Delete removes from DB + Storage
- Reorder updates sort_order
- Active toggle hides/shows on storefront About page
- Progress indicator during upload

**QA happy:** Upload 3 photos → all in grid + About page. Delete one → removed. Evidence: `evidence/t5-5-gallery-upload.txt`
**QA failure:** Upload .pdf → rejected "Please upload an image file". Evidence: `evidence/t5-5-reject-pdf.txt`

**Commit:** `feat: build gallery management (multi-upload, caption, reorder, active toggle, delete)`

---

#### T5.6: Build site settings editor (6 tabs: general, location, notice rules, operating hours, delivery, payment)
**References:**
- site_settings schema from T1.3 (singleton id=1), RLS: admin write (T1.4)
- Decisions: everything editable; notice rules; contact; WhatsApp; delivery config; payment mode

**What to build:**
- `app/admin/settings/page.tsx` — tabbed settings page:
  - **General:** bakery_name, about_narrative (rich textarea), contact_email, contact_phone, whatsapp_number, address (line1, line2, city, state), footer_text, terms_url, refund_policy_url, privacy_policy_url
  - **Location:** google_maps_embed_url, google_maps_directions_url (with help text)
  - **Notice Rules:** global_notice_hours, bulk_threshold, bulk_notice_hours, custom_cake_notice_days (number inputs with helper text)
  - **Operating Hours:** weekly_hours editor (T5.7) + holidays editor (T5.7)
  - **Delivery:** delivery_enabled toggle, delivery_instructions textarea
  - **Payment:** razorpay_active toggle (disabled until KYC done), kyc_pending_mode toggle (when true: checkout shows "Pay on pickup / UPI manual")
- `app/api/admin/settings/route.ts` — GET (read), PUT (update, admin only)
- Success toast on save; helper text/tooltips per field

**Acceptance criteria:**
- All 6 tabs render with current values from site_settings
- Edit + Save → updates Supabase → reflects on storefront
- Change global_notice_hours 12→6 → checkout earliest slot updates
- Disable delivery → checkout only shows Pickup
- Toggle kyc_pending_mode → checkout shows/hides online payment
- Edit about narrative → reflects on About page
- Edit contact → reflects on footer + About page
- Edit Google Maps → reflects on About page

**QA happy:** Change bakery_name → Save → storefront header + footer update. Evidence: `evidence/t5-6-settings-update.txt`
**QA failure:** Invalid whatsapp_number (letters) → validation error, Save blocked. Evidence: `evidence/t5-6-invalid-whatsapp.txt`

**Commit:** `feat: build site settings editor (general, location, notice rules, delivery, payment — 6 tabs)`

---

#### T5.7: Build operating hours editor + holidays editor
**References:**
- site_settings.weekly_hours jsonb + holidays date[] from T1.3
- Decisions: full per-day customization (7-day open/closed + times + holiday dates)

**What to build:**
- `components/admin/OperatingHoursEditor.tsx` — 7 rows (Monday–Sunday): day name, Open/Closed toggle (switch), From time picker, To time picker. Closed → time pickers disabled/greyed. Default 09:00–18:00. Updates jsonb in real-time. Mini weekly schedule preview.
- `components/admin/HolidaysEditor.tsx` — calendar picker to add holiday dates, list of current holidays (sorted), remove button per holiday, "Add Holiday" → date picker. Upcoming holidays highlighted.
- Both integrated into "Operating Hours" tab of T5.6
- Helper text: "Closed days will be blocked at checkout."

**Acceptance criteria:**
- 7-day editor: toggle open/closed, set from/to times
- Closed days: time pickers disabled
- Holidays: add/remove dates
- Changes save → reflect on checkout date picker (closed days greyed)
- Mini preview shows current schedule

**QA happy:** Set Sunday Closed → Save → checkout greys all Sundays. Evidence: `evidence/t5-7-sunday-closed.txt`
**QA failure:** Add holiday for tomorrow → checkout greys tomorrow. Evidence: `evidence/t5-7-holiday-blocked.txt`

**Commit:** `feat: build operating hours editor (7-day open/closed + times) + holidays editor`

---

#### T5.8: Build custom cake inquiry management (review, quote, confirm, decline, mark paid)
**References:**
- custom_cake_inquiries schema from T1.3, orders schema (kind=custom_inquiry/custom_full)
- RLS: staff read, admin write (T1.4)
- Decisions: staff review feasibility, confirm/decline, offline UPI, staff marks paid

**What to build:**
- `app/admin/inquiries/page.tsx` — inquiry dashboard: list sorted by created_at desc, filter by status (submitted/reviewed/quoted/confirmed/declined). Card: customer name, phone, cake type, requested date, status badge.
- `app/admin/inquiries/[id]/page.tsx` — detail: customer info, cake type (configured: flavor/weight/decoration/message; fully_custom: reference image + description), requested date, workflow buttons:
  - "Mark as Reviewed" → status='reviewed'
  - "Set Quote" → input quote_cents → status='quoted' + email customer with quote + UPI instructions
  - "Confirm Order" → creates linked order (kind='custom_inquiry', status='confirmed', custom_cake_quote_cents) + status='confirmed'
  - "Decline" → status='declined' + email customer
  - "Mark as Paid" → linked order payment_status='paid', payment_method='upi_manual'
  - Staff notes textarea
- `app/api/admin/inquiries/route.ts` — GET (list)
- `app/api/admin/inquiries/[id]/route.ts` — GET, PUT (update status/quote/notes)
- `app/api/admin/inquiries/[id]/confirm/route.ts` — POST (create linked order)
- `app/api/admin/inquiries/[id]/decline/route.ts` — POST (decline + email)
- Email sending: on quote → customer email with amount + UPI; on confirm → customer confirmation; on decline → customer decline email

**Acceptance criteria:**
- Inquiry list shows all with status badges
- Detail shows all info including reference image (signed URL from custom-cake-refs bucket)
- Workflow: submitted→reviewed→quoted→confirmed/declined
- Setting quote emails customer with amount + UPI instructions
- Confirming creates linked order in orders table
- Marking paid updates linked order payment_status='paid'
- Declining emails customer
- Staff notes save
- Confirm/decline require admin; review/quote/mark-paid require staff+

**QA happy:** Submit inquiry → admin list. "Mark Reviewed" → "Set Quote ₹2000" → customer emailed → "Confirm" → linked order created → "Mark Paid" → payment_status='paid'. Evidence: `evidence/t5-8-inquiry-workflow.txt`
**QA failure:** Confirm without quote → "Please set a quote amount before confirming". Evidence: `evidence/t5-8-no-quote-error.txt`

**Commit:** `feat: build custom cake inquiry management (review, quote, confirm, decline, mark paid)`

---

#### T5.9: Build account/role management (change password, change email, admin manages staff)
**References:**
- profiles schema from T1.3, Supabase Auth admin API
- RLS: admin write (T1.4)
- Decisions: 1 admin + 1 staff; minimal management (email/password change)

**What to build:**
- `app/admin/account/page.tsx` — account management:
  - Current user info (email, role)
  - "Change Password" form (current password, new password, confirm) — Supabase Auth `updateUser({ password })`
  - "Change Email" form — Supabase Auth `updateUser({ email })` (sends confirmation to new email)
  - Admin-only: "Staff Account" management — current staff email, "Change Staff Email" (admin API), "Reset Staff Password" (admin.generateLink('recovery', email))
  - Logout button
- `app/api/admin/account/route.ts` — GET (current user), PUT (update own password/email)
- `app/api/admin/staff-account/route.ts` — PUT (admin updates staff email), POST (admin triggers staff password reset) — admin only

**Acceptance criteria:**
- Current user can change own password (with current password verification)
- Current user can change own email (confirmation flow)
- Admin can change staff email
- Admin can trigger staff password reset email
- Staff cannot access admin-only staff management section
- All changes update Supabase Auth

**QA happy:** Admin changes own password → can login with new. Admin triggers staff reset → staff receives email. Evidence: `evidence/t5-9-account-management.txt`
**QA failure:** Staff tries staff-account management → blocked by requireAdmin(). Evidence: `evidence/t5-9-staff-blocked.txt`

**Commit:** `feat: build account/role management (change password, change email, admin-manages-staff)`

---

### Wave 6 — Payments + Resilience + Deploy + Verification

#### T6.1: Build Razorpay create-order API (Edge function, test mode)
**References:**
- Razorpay Orders API: https://razorpay.com/docs/api/orders/
- Razorpay Standard Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- Research (bg_96037fdc): test keys rzp_test_, HMAC-SHA256, Edge runtime + Web Crypto, Basic auth

**What to build:**
- Cloudflare secrets: RAZORPAY_KEY_ID (rzp_test_...), RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- `app/api/payments/create-order/route.ts` — POST (Edge runtime):
  1. Receive: orderId (our UUID), totalCents
  2. Verify order exists in Supabase + payment_status='unpaid'
  3. Call Razorpay Orders API: `POST https://api.razorpay.com/v1/orders` — amount=totalCents (paise), currency=INR, receipt=humanId, payment_capture=1
  4. Auth: Basic auth with RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET (base64)
  5. Return: { razorpayOrderId, amount, currency, keyId }
  6. Update order: razorpay_order_id, payment_status='pending'
  7. Error: 502 "Payment service unavailable. Please try again or choose Pay on Pickup."
  8. Rate limit: max 10 create-order per session per 10 min

**Acceptance criteria:**
- POST valid orderId+total → Razorpay order created, returns razorpayOrderId
- Order in Supabase updated with razorpay_order_id + payment_status='pending'
- Invalid orderId → 404
- Razorpay API failure → 502 with user-friendly message
- Test mode keys used (rzp_test_)

**QA happy:** Create order → call create-order → get razorpayOrderId. Check Razorpay dashboard → order exists. Evidence: `evidence/t6-1-create-order.txt`
**QA failure:** Invalid RAZORPAY_KEY_SECRET → 502 "Payment service unavailable". Evidence: `evidence/t6-1-razorpay-down.txt`

**Commit:** `feat: build Razorpay create-order API (Edge function, test mode, Supabase sync)`

---

#### T6.2: Build Razorpay checkout integration (checkout.js modal + KYC-pending fallback)
**References:**
- Razorpay checkout.js: https://checkout.razorpay.com/v1/checkout.js
- Research (bg_96037fdc): `new Razorpay({key, order_id, ...}).open()`
- Decisions: KYC-pending fallback mode (admin toggle)

**What to build:**
- `lib/razorpay/checkout.ts` — `openRazorpayCheckout({ keyId, razorpayOrderId, amountCents, customerName, email, phone, onSuccess, onFailure })`: loads checkout.js, opens modal with prefill, handler calls onSuccess(paymentId, signature) or onFailure
- `components/checkout/PaymentSection.tsx` — checkout payment step:
  - If razorpay_active=true: "Pay Online" button → calls /api/payments/create-order → opens Razorpay modal → on success calls /api/payments/verify → redirect to confirmation. On failure: error + retry + "Pay on Pickup" option.
  - If kyc_pending_mode=true: "Pay on Pickup / UPI Manual" only. "Place Order" → order with payment_status='unpaid', payment_method='cash_on_pickup'. Shows UPI ID for manual payment.
  - If both: radio (Pay Online / Pay on Pickup)
- Add `<Script src="https://checkout.razorpay.com/v1/checkout.js" />` to layout

**Acceptance criteria:**
- razorpay_active=true → "Pay Online" opens Razorpay modal with correct amount + prefill
- Modal shows UPI/Card/NetBanking (test mode)
- On success: verification → confirmation page shows "Paid"
- On dismiss: error + retry + "Pay on Pickup"
- kyc_pending_mode=true → only "Pay on Pickup / UPI" shown
- UPI ID displayed for manual payment
- Both modes: order created with correct payment_status/method

**QA happy:** razorpay_active=true → "Pay Online" → modal → test card → success → confirmation "Paid". Evidence: `evidence/t6-2-razorpay-checkout.png`
**QA failure:** kyc_pending_mode=true → only "Pay on Pickup" → place order → confirmation "Pay ₹X on pickup". Evidence: `evidence/t6-2-kyc-pending.png`

**Commit:** `feat: build Razorpay checkout integration (modal, prefill, KYC-pending fallback mode)`

---

#### T6.3: Build Razorpay webhook handler (signature verification, idempotent processing)
**References:**
- Razorpay webhooks: https://razorpay.com/docs/webhooks/
- Research (bg_96037fdc): HMAC-SHA256 over raw body, X-Razorpay-Signature header, webhook secret, raw body before JSON parse, Edge + Web Crypto
- Research: whitelist Razorpay IPs in Cloudflare WAF, export const dynamic='force-dynamic'

**What to build:**
- `app/api/webhooks/razorpay/route.ts` — POST (Edge, force-dynamic):
  1. `const rawBody = await req.text()` (raw body FIRST)
  2. Extract X-Razorpay-Signature header
  3. Compute HMAC-SHA256 over rawBody using RAZORPAY_WEBHOOK_SECRET (Web Crypto API: crypto.subtle.importKey + sign)
  4. Compare signatures (constant-time if possible) → 400 if mismatch
  5. Parse JSON, check processed_webhooks for event_id → skip if duplicate
  6. Handle `payment.captured` or `payment.authorized`: update order payment_status='paid', razorpay_payment_id, razorpay_signature. Broadcast to admin tabs via Realtime.
  7. Handle `payment.failed`: update order payment_status='failed'. Alert admin.
  8. Handle `refund.processed`: update order payment_status='refunded'.
  9. Insert event_id into processed_webhooks
  10. Return 200 within 5s (fast return, async processing via ctx.waitUntil if needed)
- `app/api/payments/verify/route.ts` — POST: client-side verification after checkout modal success. Receives { orderId, razorpayPaymentId, razorpaySignature }. Verifies signature server-side. Updates order. Returns success/failure. (This is the client-side confirmation path; the webhook is the server-side backup.)
- Whitelist Razorpay webhook IPs in Cloudflare WAF

**Acceptance criteria:**
- Webhook: raw body → HMAC-SHA256 verification → reject invalid (400)
- Valid payment.captured → order payment_status='paid', broadcast to admin
- payment.failed → payment_status='failed', alert admin
- refund.processed → payment_status='refunded'
- Dedup: same event_id twice → second ignored
- 200 returned within 5s
- Client-side verify endpoint also works (for immediate confirmation)
- Razorpay IPs whitelisted in Cloudflare WAF

**QA happy:** Send test webhook from Razorpay dashboard → verifies, processes, order payment_status='paid'. Evidence: `evidence/t6-3-webhook-success.txt`
**QA failure:** Wrong signature → 400. Evidence: `evidence/t6-3-bad-signature.txt`

**Commit:** `feat: build Razorpay webhook handler (HMAC-SHA256 verification, idempotent, payment status sync)`

---

#### T6.4: Build refund/cancellation flow + resilience hardening
**References:**
- Razorpay Refunds API: https://razorpay.com/docs/api/refunds/
- Decisions: wrong-button guards, cart localStorage recovery, idempotent order creation, rate limiting

**What to build:**
- `app/api/orders/[id]/refund/route.ts` — POST (admin only): calls Razorpay Refunds API with razorpay_payment_id, updates order payment_status='refunded'. Confirm modal in admin UI.
- `components/admin/RefundButton.tsx` — "Refund Payment" button with confirm modal: "Are you sure you want to refund ₹{amount} to the customer? This cannot be undone." Calls refund API.
- `components/admin/CancelOrderButton.tsx` — "Cancel Order" button with confirm modal: "Are you sure? The customer will be notified." Sets status='cancelled', emails customer.
- **Failed payment retry flow:** `app/api/orders/[id]/retry-payment/route.ts` — POST (Edge): for orders with payment_status='failed' or 'unpaid' and razorpay_order_id set, creates a new Razorpay order and returns checkout details so customer can retry. Accessible by guest (email+phone verification) or authenticated customer. `components/checkout/RetryPaymentButton.tsx` — shown on order confirmation/lookup page if payment failed: "Retry Payment" → calls retry endpoint → opens Razorpay modal.
- Resilience hardening across the app:
  - **Cart recovery:** cart already persists in localStorage (T3.1). Add a "Your cart was restored" toast on hydrate if items exist.
  - **Order resubmit:** if /api/orders returns 5xx, show "Something went wrong. Your order was not placed. Please try again." with retry button. Cart remains intact.
  - **Confirm modals:** all destructive actions (delete item, delete category, delete banner, delete gallery photo, cancel order, refund, sold-out toggle on popular item) show confirm modal.
  - **Sold-out items:** shown greyed with "Sold Out" badge, NOT hidden (customer sees what's available but can't order).
  - **Rate limiting:** order API (5 per IP / 10 min), create-order API (10 per session / 10 min). Implement via Cloudflare WAF rate rules or in-memory counter.
  - **Double-submit guard:** Place Order button disabled + loading spinner during submission. Idempotency-Key generated per attempt.
  - **Network error handling:** all fetch calls have try/catch with user-friendly error messages. No unhandled promise rejections.
  - **processed_webhooks cleanup:** the ack-watchdog cron (T4.3, runs every minute) also deletes processed_webhooks rows older than 30 days: `DELETE FROM processed_webhooks WHERE processed_at < now() - interval '30 days'`. Prevents unbounded table growth.

**Acceptance criteria:**
- Admin can refund Razorpay payments via confirm modal
- Admin can cancel orders via confirm modal (customer emailed)
- Cart restored on reload with "Your cart was restored" toast
- Order submission failure → error message + retry, cart intact
- All destructive actions have confirm modals
- Sold-out items greyed, not hidden
- Rate limiting active on order + payment APIs
- Double-submit prevented (button disabled during submission)
- All network errors caught with user-friendly messages

**QA happy:** Admin clicks "Refund" → confirm modal → confirm → order payment_status='refunded', customer sees refund in Razorpay. Evidence: `evidence/t6-4-refund-success.txt`
**QA failure:** Submit order, network drops → "Something went wrong" error + retry button. Cart still has items. Evidence: `evidence/t6-4-network-error.txt`

**Commit:** `feat: build refund/cancellation flow + resilience hardening (confirm modals, cart recovery, rate limiting)`

---

#### T6.5: Seed menu data from client's real menu
**References:**
- Client's real menu (pasted in Batch 3 answers, stored in draft)
- menu_items + categories schema from T1.3
- Decisions: 6 categories, ~60 items, 3 pricing models, addons, variants, min order qty, dietary tags

**What to build:**
- `supabase/migrations/00008_seed_menu.sql` — inserts all categories + menu items from client's menu:
  - **Tea Cakes** (14 items, flat pricing): Plain Vanilla 340, Chocolate 385, Carrot 360, Marble 385, Banana 360, Choco-chip 395, Lemon & Poppy Seed 400, Banana & Walnut 390, Dates & Walnut 390, Chocolate & Walnut 465, Walnut 440, Very Berry 460, Banana Honey & Oatmeal 540, Rich Fruit Cake 540, Rich Fruit Cake (rum) 560
  - **Cheesecakes** (6 items, weight_tiers pricing + addons): Classic NY Baked (½kg 1000 / 1kg 2000), Classic Vanilla No-Bake (½kg 900 / 1kg 1800), Thai Mango Coconut (½kg 950 / 1kg 1900), Triple Layer Chocolate (½kg 950 / 1kg 1900), Strawberry (½kg 900 / 1kg 1800), Chocolate & Raspberry (½kg 1000 / 1kg 1900). Addons for all: Compote Berries, Fresh Fruits, Chocolate Ganache, Lotus Biscoff, Salted Caramel (admin sets prices). Min order qty: 1.
  - **Cupcakes/Muffins/Brownies** (10 items, flat pricing): Vanilla 45, Chocolate 50, Coffee 50, Marble 50, Blueberry/Funfetti/Red Velvet/Fresh Fruit 50, Gourmet 70 (4 variants: Lemon Curd & Blueberry, Hazelnut + Choc Mousse, Cream Cheese + Choc Ganache, Raspberry + Choc Ganache), Cloud Cakes 150, Gooey Brownies 60, Layered Brownies 100. Min order qty: 4 (6 for mini).
  - **High Tea Nibbles** (18 items, flat pricing, veg/non-veg tags): Cucumber & Mint Sandwich 50, Tomato Cucumber & Cheese 50, Chicken Honey Mustard 60, Chicken Tikka 60, Chicken Coleslaw 60, Chicken Kheema Buns 40, Chicken Tikka Buns 40, Chicken Patties 40, Mixed Veg Patties 35, Mini Pizza Veg 50, Mini Pizza Non-Veg 60, Mini Choc Doughnuts 35, Choc Doughnut 50, Cinnamon Roll 50, Berry Cream Cheese Buns 50, Mini Marbled Swiss Rolls 40, Lamingtons 40, Korean Buns 90, Mini Korean Buns 45. Min order qty: 4.
  - **Desserts** (12 items, flat pricing): Tiramisu Tub 300, Cold Cheesecake Cup 60, Pannacotta Cup (Vanilla/Blueberry/Strawberry/Coffee/Coconut/Thai Mango — 6 variants) 60 each, Thai Mango Pudding 60, Tartlettes (Fresh Fruits/Lemon Curd 60, Choc Sea Salt/Choc Strawberry 70). Min order qty: 4 for cups/tarts.
  - **Frosted Sponge Cakes** (18 items, base_half_kg pricing + decoration tiers + requires_custom_notice=true): Vanilla 760, Funfetti 810, Chocolate 860, Choconilla 860, Black/White Forest 860, Red Velvet CC 860, Butterscotch Praline 860, Berries & Cream 860, Refreshing Fruit 860, Coffee 860, Choc & Oreo 860, Choc Truffle 910, Choc Truffle Raspberry 960, Nutty Truffle 960, Tiramisu Alcohol 960, Spiced Carrot CC 960, Choc Hazelnut 1010, Sinful Choc Indulgence 1010. Size options: ½kg (+0), 1kg (+10000), 2kg (+30000). Decoration tiers: Basic (+0), Premium (+5000), Luxury (+10000). requires_custom_notice=true (5-day rule). dietary_tags: ['eggless'] for all. Note in description: "Our cakes are eggless. Keto and Gluten-free available on request."
- All prices stored as cents (multiply rupees by 100)
- All items get is_active=true, is_sold_out=false, sort_order sequential within category

**Acceptance criteria:**
- All 6 categories created with correct names + sort order
- All ~78 items created with correct names, prices (in cents), pricing models, addons, variants, min order qty, dietary tags
- Cheesecakes have weight_tiers price_options + 5 addon options
- Gourmet Cupcakes have 4 variants
- Pannacotta has 6 variants
- Frosted Sponge Cakes have base_half_kkg pricing + size_options + decoration_tiers + requires_custom_notice=true
- High Tea items have veg/non-veg dietary tags
- Menu page displays all items correctly with proper price formatting

**QA happy:** Navigate to /menu → see all 6 categories, all items with correct prices. Cheesecake shows "from ₹900", cupcake shows "₹45", frosted cake shows "₹760 (½kg basic)". Evidence: `evidence/t6-5-seeded-menu.png`
**QA failure:** Query `SELECT count(*) FROM menu_items WHERE is_active=true` → should be ~78. If not, identify missing items. Evidence: `evidence/t6-5-item-count.txt`

**Commit:** `feat: seed menu data from client's real menu (6 categories, ~78 items, all pricing models)`

---

#### T6.6: Deploy to Cloudflare Workers staging + domain/DNS setup + Resend domain verification
**References:**
- Cloudflare Workers deploy: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Resend domain verification: https://resend.com/docs/dashboard/domains/introduction
- Research (bg_2de5c286): opennextjs-cloudflare build && deploy, staging + production environments

**What to build:**
- Register domain (guide client through Cloudflare Registrar or GoDaddy/Namecheap)
- Configure DNS in Cloudflare:
  - A record: domain → Cloudflare Workers (proxy enabled)
  - CNAME: staging → Cloudflare Workers (proxy enabled)
  - MX + TXT records for Resend sending domain (mail.savor.example) — DKIM, SPF, DMARC
- Deploy to staging: `npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy --env staging`
  - wrangler.jsonc: add `env.staging` with staging vars
  - Staging URL: staging.savor.example
- Verify on staging:
  - Site loads on HTTPS
  - Supabase connects (env vars set for staging)
  - Login works (admin/staff)
  - Menu displays seeded data
  - Cart + checkout flow works
  - Admin panel accessible
  - Realtime alarm fires on new order
  - Resend emails sent (test to real email)
  - Razorpay test mode checkout works
- Deploy to production: `npx opennextjs-cloudflare deploy --env production`
  - Production URL: savor.example (or www.savor.example)
  - Swap test Razorpay keys for live keys (after KYC approval)
  - Set production Cloudflare secrets

**Acceptance criteria:**
- Domain registered + DNS configured in Cloudflare
- Resend sending domain verified (DKIM/SPF/DMARC)
- Staging site loads on HTTPS (staging.savor.example)
- All flows work on staging: login, menu, cart, checkout, admin, alarm, email, Razorpay test
- Production site loads on HTTPS (savor.example)
- Production uses live Razorpay keys (after KYC) OR kyc_pending_mode=true (before KYC)
- No errors in Cloudflare Workers logs

**QA happy:** Open staging.savor.example → site loads, HTTPS, menu displays, login works, place test order → alarm fires, emails sent. Evidence: `evidence/t6-6-staging-verify.png`
**QA failure:** DNS not propagated → site doesn't load → wait 5 min, retry. If still failing, check Cloudflare DNS records. Evidence: `evidence/t6-6-dns-issue.txt`

**Commit:** `ci: deploy to Cloudflare Workers (staging + production) + DNS + Resend domain verification`

---

#### T6.7: E2E test suite (Playwright) for critical user flows
**References:**
- Playwright: https://playwright.dev/
- Critical flows: order placement, admin alarm, sold-out toggle, bulk rule, custom cake inquiry, checkout datepicker, promo banner, admin login + menu edit, Razorpay test checkout

**What to build:**
- `playwright.config.ts` — Playwright config with baseURL (staging URL for E2E, or localhost:3000 for local)
- `e2e/order-placement.spec.ts` — full order flow: browse menu → add item to cart → checkout → fill guest info → place order → confirmation page
- `e2e/admin-alarm.spec.ts` — login as admin → open order dashboard → submit order from another context → alarm fires (check title change, notification mock)
- `e2e/sold-out-toggle.spec.ts` — admin toggles item sold-out → storefront shows item greyed with "Sold Out" badge → customer can't add to cart
- `e2e/bulk-rule.spec.ts` — add 15x item (threshold=10) → checkout → date picker earliest = now+24h → try earlier date → blocked
- `e2e/custom-cake-inquiry.spec.ts` — submit custom cake inquiry with image → admin sees inquiry → review → quote → confirm → mark paid
- `e2e/checkout-closed-day.spec.ts` — set Sunday closed in admin settings → checkout date picker greys Sundays
- `e2e/promo-banner.spec.ts` — admin creates banner → storefront shows banner → set end_date to past → banner disappears
- `e2e/razorpay-test-checkout.spec.ts` — place order with "Pay Online" → Razorpay test modal opens → (mock or skip actual payment in CI)
- `e2e/admin-menu-edit.spec.ts` — admin login → edit menu item price → storefront reflects new price

**Acceptance criteria:**
- All 9 E2E test files created
- `npx playwright test` runs all tests
- Order placement test passes (full flow from browse to confirmation)
- Admin alarm test passes (alarm fires on new order)
- Sold-out toggle test passes (item greyed, no add-to-cart)
- Bulk rule test passes (24h notice enforced)
- Custom cake inquiry test passes (full lifecycle)
- Closed day test passes (Sunday greyed in datepicker)
- Promo banner test passes (banner appears/disappears by date)
- Razorpay test checkout: modal opens (mock or skip payment in CI)
- Admin menu edit test passes (price change reflects on storefront)

**QA happy:** `npx playwright test` → all 9 tests pass. Evidence: `evidence/t6-7-e2e-pass.txt`
**QA failure:** Bulk rule test: add 15 items, try 12h-ahead date → test expects blocking error. If date picker allows it, test fails → bug found, fix validation. Evidence: `evidence/t6-7-bulk-rule-bug.txt`

**Commit:** `test: add Playwright E2E test suite for 9 critical user flows`

---

## Final verification wave

Runs in parallel after ALL todos complete. ALL must APPROVE before declaring done. Surface results and wait for user's explicit okay.

- **F1: Plan compliance audit** — verify every todo's acceptance criteria was met, every referenced file exists, every schema table/policy was created. Cross-check against this plan file.
- **F2: Code quality review** — run code-reviewer agent on full diff. Check for: no hardcoded secrets, no `any` types, no missing error handling, no oversized files (>400 lines), proper TypeScript types throughout, Tailwind classes consistent with pastel palette.
- **F3: Real manual QA** — Playwright browser screenshots of: storefront (mobile + desktop), menu with filters, checkout flow, admin dashboard with alarm firing, admin CMS panels (menu, banners, gallery, settings, inquiries). Verify pastel theme, mobile responsiveness, no broken layouts.
- **F4: Scope fidelity** — verify every IN-scope item is implemented and every OUT-scope item is NOT implemented. Check for scope creep (unrequested features added).

---

## Commit strategy

- Atomic commits per todo: `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci)
- Each wave ends with a squash-merge or sequential commits on the main branch
- Final commit before deploy: `chore: final pre-deploy verification`
- Deploy commit: `ci: deploy to Cloudflare Workers (staging)` then `ci: deploy to Cloudflare Workers (production)`

---

## Success criteria

1. Customer can browse the seeded menu, filter by category/dietary tags, search by name, add items to cart (with size/variant/addon/decoration selections), choose pickup or delivery, select a valid date/time (respecting notice windows + operating hours), and place a pre-order.
2. Admin/staff receive a realtime alarm (sound + notification + title flash + badge) when a new order arrives. If no admin acks in 30s, a fallback email is sent.
3. Admin can edit EVERY section of the website from the admin panel: menu items (CRUD + sold-out toggle), categories, promo banners (CRUD + images), gallery (upload/delete), site text, site settings (notice rules, operating hours, holidays, contact, WhatsApp, delivery, payment mode), custom cake inquiries (review/quote/confirm/decline), orders (view/ack/status update/mark paid), and account (change email/password).
4. Promo banners display on the storefront in their configured positions, auto-expire based on date range, and can be dismissed by customers.
5. Custom cake inquiries flow: customer submits (configured or fully-custom with image) → staff reviews → staff sets quote → customer emailed → staff confirms → staff marks paid (offline UPI).
6. Razorpay checkout works in test mode (UPI/Card/NetBanking). KYC-pending fallback mode allows the site to launch without gateway approval.
7. Resend emails: customer receives order confirmation, staff receives order alert, delivery/bounce/complaint webhooks processed with signature verification + dedup.
8. Cart persists in localStorage (survives page reload). Idempotent order creation (no duplicate orders on double-submit). Rate limiting on order API. RLS on every table.
9. Site is deployed to Cloudflare Workers (staging + production), HTTPS works, custom domain connected, Resend sending domain verified.
10. All unit tests pass, all E2E tests pass, all 4 final verification wave checks approve.
11. Guest customers can retrieve their orders via "Find My Order" page (email + phone verification) without needing an account.
12. Failed payments can be retried via a "Retry Payment" button on the order confirmation/lookup page.

---

## Gap analysis (self-review — Metis subagent unavailable due to billing)

Metis gap analysis subagent could not be spawned (billing constraint). Self-review performed by planner with full context. Findings and fixes:

### CRITICAL — Fixed
1. **Guest order retrieval:** RLS allows anyone to INSERT orders but only authenticated customers/staff can SELECT. A guest who places an order couldn't read it back later. **Fix:** (a) POST /api/orders now returns full order data in the 201 response (confirmation page doesn't need a GET), (b) added "Find My Order" page (/orders/lookup) with email+phone verification using service-role client, (c) GET /api/orders/[id] now supports guest access via email+phone query params. (Updated T3.5)

### HIGH — Fixed
2. **Notice window stacking:** Cart with BOTH bulk items (24h) AND custom items (5d) — the plan didn't explicitly state how windows combine. **Fix:** getEarliestValidSlot now explicitly takes MAX of all applicable windows (global + bulk-if-applicable + custom-if-applicable). Documented in T3.2 + T3.5 acceptance criteria.
3. **Notice window pushing to closed day:** If the notice window pushes the earliest slot to a closed day or outside operating hours, the skip logic wasn't fully specified. **Fix:** getEarliestValidSlot now has explicit 6-step algorithm: compute max notice → add to now → skip closed days/holidays → adjust to within operating hours → skip through multi-day closures. (Updated T3.2)
4. **Failed payment retry:** No path for a customer whose payment failed to retry later. **Fix:** Added retry-payment API endpoint + RetryPaymentButton component to T6.4.
5. **Order human_id race condition:** "Postgres sequence or retry loop" was ambiguous. **Fix:** Definitively specified Postgres sequence (CREATE SEQUENCE ... CYCLE MAXVALUE 9999) — atomic, race-safe. (Updated T3.5)

### MEDIUM — Noted (no fix needed, conscious decisions)
6. **Staff PII access:** Staff can read customer name, phone, email, address via RLS. This is INTENDED — staff need this info to fulfill orders (contact customer for delivery, custom cake quotes). Not a gap.
7. **Multi-menu separation:** Brief mentions "Daily Menu" vs "Pre-Order Menu" as separate menus. Since the entire site is pre-orders only (per user decision), all standard items are pre-orders. The "Daily Menu" = the menu hub page; "Custom Cake Builder" = the custom cake inquiry flow; "Pre-Order Menu" = same menu hub (everything requires advance notice). No separate UI needed — covered by the existing design.
8. **Prep buffer:** Brief mentions "preparation buffer windows." The 12h global notice IS the prep buffer. Covered.
9. **processed_webhooks cleanup:** No explicit cleanup mechanism. **Fix:** Added to T6.4 — ack-watchdog cron also deletes webhooks >30 days old.

### LOW — Noted
10. **Schema evolution:** Singleton site_settings (id=1) could be hard to migrate if columns change. Mitigation: Supabase migrations are versioned; ALTER TABLE adds columns without breaking existing rows. Acceptable risk for a small bakery.
11. **Resend domain placeholder:** Domain not yet registered, so Resend sending domain can't be verified until T6.6. Mitigation: T1.7 sets up the infrastructure; actual verification happens in T6.6 after domain registration. Dev uses Resend's default sending domain (onboarding@resend.dev) for testing.
