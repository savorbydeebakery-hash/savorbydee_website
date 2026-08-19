# savor-bakery — Planning Draft (resume point)

## Intent
- intent: clear
- review_required: false
- adopt_default_filter: OFF (user explicitly asked to be interviewed: "ask me questions to understand me better")
- classification: Architecture (greenfield full-stack: storefront + CMS + RBAC + payments + realtime + admin)
- status: interviewing

## Request summary
Build SAVOR bakery pre-order website (client: Doretta Blah, near Laban Police Station, WhatsApp +91 98365 37447).
Stack: Next.js frontend, Supabase backend, Cloudflare Pages hosting, Resend email.
UI: bright pastel accents, white-dominant, mobile-first, simple, modular, interactive, 21st.dev components, /webdev skill.
Features:
- About page (brand narrative, gallery grid, location + Google Map + direction buttons)
- Main Menu & Ordering Hub (search, category filter, dietary badges)
- Dynamic promo/announcement banners (admin-editable, offers/posters, holiday hours)
- Floating WhatsApp widget -> +91 98365 37447
- Smart Live Menu (realtime sold-out toggle) + multi-menu (Daily / Custom Cake Builder / Pre-Order with cutoffs)
- Order mgmt: pickup vs delivery, delivery time slots, prep buffer; delivery location emailed to staff (for now)
- Notifications: email receipt to customer + email alert to staff (Resend) + REALTIME ALARM to whoever has admin panel open on new order
- 3-level RBAC: admin (full), staff (orders + stock + delivery status), customer (account, order history, saved addresses)
- Payment gateway: UPI (GPay/PhonePe/Paytm), Card, NetBanking (activated on KYC approval) + fallback
- Admin panel edits EVERYTHING: photos upload, text edit, cards/menu items CRUD, promo banners/offers/posters sections, bulk rule config, delivery config, roles
- Bulk order rule: >10 pieces of an item -> bulk, cannot order without 24-48h prior notice
- Pre-orders only (no instant same-day checkout; pickup or delivery chosen at checkout)
- Staged build; worst-case scenarios as priority (what breaks, wrong button, glitch recovery)

## Workspace
- cwd: C:\Users\cloud\OneDrive\Desktop\Hybrid_Second_Brain\clients website\SAVOR
- git: no (greenfield)
- contents: only .codegraph/ (inactive index)
- no shell tool available in planner env -> plan/draft files hand-built with `write` (scaffold script not runnable here); template headers replicated verbatim from ulw-plan skill.

## Components ledger (topology lock)
1. storefront-frontend — public pages (about, menu hub, promo banners, whatsapp widget). outcome: browseable mobile-first site.
2. menu-cms — smart live menu + multi-menu config (daily/custom cake/pre-order) + sold-out toggle. outcome: staff edit menu in realtime.
3. order-management — cart, fulfillment (pickup/delivery), delivery location capture, bulk-order rule enforcement. outcome: valid pre-orders submitted.
4. notifications — email receipts (customer) + email alerts (staff) via Resend + realtime alarm (audio+notification+badge) + fallback. outcome: no order missed.
5. rbac — admin/staff/customer roles + auth. outcome: correct access per role.
6. payments — gateway integration (UPI/card/netbanking) + KYC-pending fallback. outcome: secure checkout.
7. admin-panel — full content CMS: photos, text, cards, menu CRUD, promo banners/offers/posters, bulk rule config, delivery config, roles. outcome: client self-manages entire site.
8. hosting-infra — Cloudflare Pages deploy, DNS, env vars, domain. outcome: live HTTPS site.
9. resilience — worst-case handling: gateway down, no admin online, wrong-button guards, glitch recovery, RLS, abuse. outcome: graceful failures.

## Decisions ledger

### Batch 2 (answered)
- payment-gateway = Razorpay (primary). KYC docs needed before live mode: proprietor PAN + Aadhaar + cancelled cheque + FSSAI + Shop&Establishment (Kolkata Municipal Corp) + GSTIN if >₹20L. Site needs T&C/Refund/Privacy pages before KYC submission. Test mode (rzp_test_ keys) for dev.
- photo-storage = Supabase Storage (1GB free, $0.021/GB/mo after, reuses Supabase RLS for auth, image-render pipeline for transforms). Buckets: menu-items, gallery, promo-banners, custom-cake-refs, site-assets (logo etc). Public-read buckets for menu/gallery/banners (signed URLs optional); private bucket for custom-cake-refs (staff-only read).
- delivery-area = Pure capture, staff decides. No geofence, no radius. Customer enters address free-text (+ optional what3words/landmark). Staff receive via email + admin panel and decide feasibility per-order. => orders.delivery_address is nullable text; orders.fulfillment='pickup'|'delivery'; if delivery, address + landmark + phone required.
- domain = Need to register one (plan includes domain registration guidance). English-only site (no i18n infra). Resend sending domain will be a subdomain of the registered domain (e.g. mail.savor.example) for DKIM/SPF/DMARC.
- custom-cake-flow = INQUIRY → staff quote (not direct pay). Customer submits flavor/weight/custom text/reference image + delivery date. Staff review feasibility, email/WhatsApp a quote + payment link. PLUS a "fully custom cake" option where customer uploads an image of the cake they want + optional description; staff check feasibility and confirm if feasible. => orders table has a `kind` enum: 'daily' | 'preorder' | 'custom_inquiry' | 'custom_full'; custom_inquiry/custom_full have status lifecycle: submitted → reviewed → quoted → confirmed/paid → in_progress → ready → fulfilled (or cancelled/declined).
- new-order-alarm = Sound + desktop Notification + red badge; email fallback if no admin acknowledges in 30s. NO WhatsApp fallback (all notifications via email). => implement Web Audio beep + Notification API + title/badge flash on realtime broadcast; 30s ack watchdog via Supabase + a Cloudflare Queue/Cron that checks unacked orders and emails staff.
- bulk-rule = threshold=10, notice=24h, BOTH admin-editable (stored in site_settings). Cart blocks checkout for bulk items unless pickup/delivery date is >= notice window ahead.
- checkout-account = Guest checkout allowed; account optional. Guest gives phone + email; can optionally sign up to track orders + save addresses. => orders table has nullable customer_id; guest fields: name, phone, email, address (if delivery).

### Batch 2 (answered)
- payment-gateway = Razorpay (primary). KYC docs needed before live mode: proprietor PAN + Aadhaar + cancelled cheque + FSSAI + Shop&Establishment (Kolkata Municipal Corp) + GSTIN if >₹20L. Site needs T&C/Refund/Privacy pages before KYC submission. Test mode (rzp_test_ keys) for dev.
- photo-storage = Supabase Storage (1GB free, $0.021/GB/mo after, reuses Supabase RLS for auth, image-render pipeline for transforms). Buckets: menu-items, gallery, promo-banners, custom-cake-refs, site-assets (logo etc). Public-read buckets for menu/gallery/banners (signed URLs optional); private bucket for custom-cake-refs (staff-only read).
- delivery-area = Pure capture, staff decides. No geofence, no radius. Customer enters address free-text (+ optional what3words/landmark). Staff receive via email + admin panel and decide feasibility per-order. => orders.delivery_address is nullable text; orders.fulfillment='pickup'|'delivery'; if delivery, address + landmark + phone required.

### Batch 4 (answered)
- toppings-pricing = Admin-priced add-ons. Admin sets a price for each topping (e.g. Lotus Biscoff +₹80). Cart computes total automatically. Customer sees full total before checkout. => menu_items.addons jsonb = [{name, price_cents, is_active}]; cart line items include selected addon IDs + prices.
- frosted-sponge-cakes = Cart with size + decoration options (priced). Customer picks size (½kg/1kg/2kg) + decoration tier (basic/premium/luxury) in cart, each admin-set price. Cart computes total. Only FULLY CUSTOM (customer's own image) routes to inquiry flow. => menu_items with price_model='base_half_kg' have price_options for sizes + a decoration_tiers jsonb [{label, price_delta_cents}]; 'fully custom' is a separate flow (orders.kind='custom_full').
- photos = NO photos for menu items at launch. Menu is text + 21st.dev UI components (clean, component-driven presentation). Admin panel STILL supports photo uploads for: gallery (About page), promo banners/posters, custom-cake reference images, site assets (logo), and OPTIONALLY menu item photos (admin can add later). The capability exists everywhere; we just don't block launch on having photos.
- staging = Include staging URL (reversible, low-cost, best practice). User didn't explicitly decline; adopt as default. staging.savor.example on Cloudflare Workers for review before live deploy.
- seats = 1 admin + 1 staff at launch (seeded accounts). Customers = everyone else (guest or signed up). NO full staff-management UI. Admin panel includes minimal "change staff email/password" controls but not a seats dashboard. => profiles table: role enum ('admin'|'staff'|'customer'); seed 1 admin + 1 staff row at build.
- order-ids = Readable format SAV-YYMMDD-NNNN (e.g. SAV-260819-0001). Displayed to staff + customer. Internal UUID remains the PK. => orders.human_id text generated via a daily sequence (Postgres sequence or computed in app).

### Adopted defaults (best-practice, reversible — announced in brief)
- test-strategy = tests-after: Playwright E2E for critical flows (order placement, admin alarm, checkout, sold-out toggle, bulk rule enforcement, custom cake inquiry) + unit tests for cart math (price computation with weight tiers + addons + variants + bulk detection) + validation logic (notice window, operating hours, min order qty). Agent-executed QA always included per todo.
- whatsapp-widget = Simple wa.me link (https://wa.me/919836537447) opening in a new tab/app. Floating button bottom-right. Matches "floating WhatsApp chat button configured to open a direct chat with +91 98365 37447."
- allergen-warnings = Folded into dietary_tags (eggless/GF/keto/veg/non-veg). No separate allergen system (user didn't request). Admin can add custom tags per item.
- gallery = About page gallery grid, admin-uploadable photos via Supabase Storage (gallery bucket). Client will upload bakery/goods/ambiance photos post-launch via admin panel.
- promo-banners = Admin-editable promotional/announcement section. Admin can create banners with: title, body text, CTA text, optional uploaded poster/banner image, start/end date (auto-expire), dismissible toggle, position (homepage hero / menu top / site-wide strip). Multiple active banners supported. This satisfies "sections for advertisements which I can edit via admin panel so I can give new offers daily."
- pre-order-lead-time = Global min notice 12h for ALL pre-orders, admin-editable. Layered ON TOP of bulk rule.
- operating-hours = Block closed days at checkout. Admin gets FULL customization: (a) per-day-of-week open/closed toggle (7 days), (b) open-from / open-to time per open day, (c) specific-date closed overrides (holidays). Checkout datepicker greys out closed days + outside-hours slots. Stored in site_settings (weekly_hours jsonb + holidays date[]).
- custom-cake-payment = OFFLINE / UPI manual. Staff email/WhatsApp the customer a quote; customer pays via UPI manually; staff mark order paid in admin panel. NO Razorpay payment link generator. Razorpay is only for the standard menu pre-orders (daily + pre-order menus).
- initial-menu = CLIENT PROVIDES REAL MENU (already pasted). I seed it during build. Admin edits thereafter.

### Real menu structure (parsed from client paste — informs schema)
Categories: Tea Cakes | Cheesecakes | Cupcakes/Muffins/Brownies | High tea nibbles | Desserts | Frosted Sponge Cakes

Pricing models present:
1. FLAT per-piece (cupcakes 45/-, sandwiches 50/-, patties 40/-, brownies 60/-, cloud cakes 150/-)
2. PER-WEIGHT TIERS (cheesecakes: ½kg + 1kg prices)
3. BASE-FOR-½KG-BASIC-DESIGN (frosted sponge cakes: price for ½kg basic; custom decoration costs extra)

Item-level features present:
- Toppings/add-ons with "charges applicable" (cheesecake toppings: Compote Berries/Fresh Fruits/Chocolate ganache/Lotus Biscoff/Salted Caramel)
- Variants (Gourmet Cupcakes: 4 variants; Pannacotta: 3 flavors)
- Min order quantity per item (4 pieces standard; 6 for mini cupcakes/muffins)
- Dietary tags: eggless (default for cakes), Keto available, Gluten-free available, Veg/Non-veg (sandwiches/patties/pizza)
- Descriptions (some items have rich descriptions, some don't)

CRITICAL notice rules (layered, all admin-editable):
1. Global min notice: 12h (all pre-orders)
2. Bulk rule: +24h for >10 pcs of an item
3. Custom cake rule: 5 DAYS advance for customized cakes (from the frosted sponge cake note: "Orders for customized cakes needs to be placed atleast 5 days in advance")

=> menu_items schema: id, category_id, name, description, base_price_cents, price_model ('flat'|'weight_tiers'|'base_half_kg'), price_options jsonb (e.g. [{label:'½kg',price_cents:100000},{label:'1kg',price_cents:200000}]), addons jsonb ([{name,price_cents}]), variants jsonb ([{name,price_delta_cents}]), min_order_qty int default 1, dietary_tags text[], image_url, is_sold_out bool, sort_order, is_active, created_at, updated_at.
=> categories schema: id, name, sort_order, is_active.
=> site_settings: bulk_threshold int default 10, bulk_notice_hours int default 24, global_notice_hours int default 12, custom_cake_notice_days int default 5, weekly_hours jsonb, holidays date[], delivery_config jsonb, contact info, whatsapp number, etc. ALL admin-editable.
- bulk-rule = threshold=10, notice=24h, BOTH admin-editable (stored in a site_settings table). Cart blocks checkout for bulk items unless pickup/delivery date is >= notice window ahead.
- checkout-account = Guest checkout allowed; account optional. Guest gives phone + email; can optionally sign up to track orders + save addresses. => orders table has nullable customer_id; guest fields: name, phone, email, address (if delivery).

### Research-verified facts (from bg_96037fdc, bg_2de5e286)
- payment-gateway-recommendation = Razorpay (primary). Cashfree = strong runner-up (1.95% standard, 15-min instant settlement). PayU = skip. Owner decision pending.
- payment-kyc-docs = proprietor PAN + Aadhaar + cancelled cheque (name must match PAN exactly) + FSSAI (mandatory for food) + Shop & Establishment cert (Kolkata Municipal Corp) + GSTIN if turnover >₹20L (West Bengal not special-category). T&C/Refund/Privacy pages required on site before KYC.
- payment-webhook = HMAC-SHA256 over raw body; Edge runtime + Web Crypto API on Cloudflare; `req.text()` before `req.json()`; `export const dynamic='force-dynamic'`; whitelist gateway IPs in Cloudflare WAF; idempotent DB write keyed on event id.
- hosting-path = Next.js App Router on Cloudflare WORKERS via @opennextjs/cloudflare (NOT legacy @cloudflare/next-on-pages). Needs nodejs_compat flag, compat_date >= 2024-09-23. Build: `opennextjs-cloudflare build && deploy`.
- supabase-realtime = Use Broadcast via `realtime.broadcast_changes()` in a Postgres trigger (recommended over postgres_changes for fan-out). RLS on realtime.messages for private channels. heartbeatCallback + worker:true for background admin tabs. Broadcast Replay (72h, max 25 msgs) for missed events. Also implement lastSeenOrderId catch-up endpoint as belt-and-suspenders.
- resend = RESEND_API_KEY as Cloudflare secret. to: up to 50 addresses. 10 req/s rate limit. Idempotency keys (24h, pattern name/id). svix webhook signature verification on raw body. Retry 5s/5m/30m/2h/5h/10h. Need verified sending domain (DKIM/SPF/DMARC).
- cloudflare-limits = 30s CPU default (5 min max configurable), 128MB memory, 6 simultaneous connections, 10MB compressed bundle. fetch() wait = wall time, not CPU time. Lazy-init Resend client inside handler.
- browser-alarm = Notification.requestPermission() must be in user gesture; AudioContext suspended on iOS Safari until user gesture (unlock button on first admin login). BroadcastChannel for cross-tab fan-out. navigator.setAppBadge for PWA badge.

## Approval gate
status: plan-written (approved by user: "yes go ahead and write plab")
pending action: none (plan written to .omo/plans/savor-bakery.md)
approach: 6-wave staged build on Next.js App Router + Supabase + Cloudflare Workers (OpenNext) + Resend + Razorpay. 39 todos across 6 waves. Each todo has references, acceptance criteria, happy+failure QA, commit line.
metis: FAILED (bg_d1a71444 timed out 30min; retry failed — billing constraint, no payment method). Self-review performed by planner with full context. 1 CRITICAL + 4 HIGH fixed in plan (guest order retrieval, notice stacking, closed-day skip, failed payment retry, human_id race). 4 MEDIUM noted (staff PII intended, multi-menu covered, prep buffer=global notice, webhooks cleanup added). 2 LOW noted (schema evolution, Resend domain placeholder). All fixes applied to .omo/plans/savor-bakery.md.
review_required: false (CLEAR intent, no high-accuracy modifier requested)
