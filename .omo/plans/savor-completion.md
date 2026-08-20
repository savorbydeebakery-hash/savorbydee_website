# savor-completion - Work Plan

## TL;DR (For humans)

### What you'll get
SAVOR bakery site taken from "code-complete but uncommitted + unverified" to **staging-deployed, E2E-verified, and F1-F4 approved**, with a clean git history and a client handoff checklist for the only remaining mile. Concretely: all Waves 2-6 work committed in logical commits, all 44 lint errors fixed, a live Supabase project provisioned (Mumbai) with 7 migrations applied and admin/staff seeded, a Cloudflare Workers staging deploy live on a `*.workers.dev` URL, the 9 Playwright E2E specs run green against staging, and the 4-part final verification wave all approving.

### Why this approach
- **Commit as-built baseline FIRST, then fix lint on top** so cleanup is one reviewable diff and a bad fix is revertible. Wave-level commits (not 33 per-todo - that code was written together so per-todo atomic is now busywork; not 1 giant squash - unreviewable), reusing the exact commit messages in `.omo/plans/savor-bakery.md`.
- **Provision live infra with the already-provided tokens** - the client explicitly handed over a Supabase CLI token, Cloudflare API token, and Resend key for the build agent to use (`.omo/credentials-setup.md`: "Once the build agent has shell access, run these commands"). Staging is reversible. This unblocks E2E + F3 manual QA without waiting on the client.
- **Only the production mile is genuinely client-gated**: domain registration, Razorpay live keys, staff notify email value, Resend domain verification. Everything else a worker with shell can do now.
- **Default staging seed credentials** (strong generated values, documented for rotation) so E2E admin-dependent specs and login flow can run.
- **5 phases with strict downward dependencies**: baseline -> lint -> live DB -> staging deploy -> E2E+verification -> handoff.

### What it will NOT do
- No production go-live (staging only; production = client-gated Phase 5 handoff).
- No custom domain registration (owner-decision + purchase - client-gated).
- No Razorpay LIVE keys / real money (test-mode keys client-gated; E2E uses KYC-pending UPI fallback or mocks the modal).
- No Resend verified sending domain (needs registered domain - client-gated); staging uses Resend default `onboarding@resend.dev` sender.
- No per-todo atomic commits for already-written Waves 2-6 code (wave-level logical commits instead).
- No scope changes / new features / refactor beyond lint fixes - this plan ONLY completes + verifies the existing `.omo/plans/savor-bakery.md` scope.

### Effort
~11 todos across 5 phases. The lint todo and the provision/deploy todos carry the real effort.

### Risk
- Commit grouping ambiguity - mitigated by grouping on primary owning feature dir; acceptance is "working tree clean + build passes after each commit", not wave-purity.
- Supabase CLI token may be expired/revoked - mitigated by `supabase projects list` smoke test before `create`; if dead, halt Phase 2 and surface to user.
- Cloudflare bundle size (10MB compressed) - mitigated by `wrangler deploy --dry-run` size check before real deploy.
- E2E flakiness against live staging - mitigated by `--retries=2` and treating the Razorpay spec as best-effort.
- Lint fix may introduce a regression - mitigated by `npm run build && npm test` after the lint commit.

### Decisions
All adopted defaults + credentials reality recorded in `.omo/drafts/savor-completion.md`.

---

## Scope

### IN
- Commit all uncommitted Waves 2-6 work in wave-level logical commits using the plan's existing commit messages.
- Fix all 44 lint ERRORS (root-cause) + trivial warnings; reach `npm run lint` -> 0 errors.
- Provision a live Supabase project (ap-south-1 Mumbai) using the provided CLI token; apply all 7 migrations; run `seed-admin.ts` with default staging creds; verify tables + RLS + seed login.
- Create Cloudflare KV namespace (replace placeholder ID in `wrangler.jsonc`); set available Cloudflare secrets + vars; deploy to staging (`*.workers.dev`); verify staging loads + connects + login works.
- Run the 9 Playwright E2E specs against staging; collect evidence.
- Run the F1-F4 final verification wave; collect evidence; reach all-approve.
- Write a client handoff checklist (update `.omo/credentials-setup.md` + new `HANDOFF.md`) listing every remaining client-gated item with exact instructions.

### OUT (Must-NOT-Have)
- Production deploy to a custom domain (client-gated).
- Domain registration / DNS for a real domain (client-gated).
- Razorpay LIVE keys / KYC submission / real payment capture (client-gated).
- Resend sending-domain DNS verification (DKIM/SPF/DMARC) (client-gated - needs domain).
- Any new feature, scope change, or non-lint refactor.
- Re-running / rewriting the savor-bakery plan (it stands as source of truth).
- Cleaning up the duplicate boulder `works` entries (optional housekeeping).

---

## Verification strategy

Agent-executed QA per todo (happy + failure, exact command + evidence path). Zero human-intervention. Inherits the savor-bakery tests-after strategy:

1. Build + unit tests after every commit: `npm run build` (23 routes) + `npm test` (48/48 Vitest) stay green.
2. Lint gate: `npm run lint` -> 0 errors after Phase 1.
3. Live DB smoke: SQL queries verifying 9 tables + RLS + seed rows after Phase 2.
4. Staging HTTP smoke: `curl` staging URL -> 200; login reachable after Phase 3.
5. E2E: `npx playwright test` against staging after Phase 4.
6. F1-F4: parallel final verification wave, all must approve.

---

## Execution strategy

5 phases, strictly downward. Each phase = implementation + agent-executed QA in one todo batch.

```
Phase 0 (Baseline commits - no deps)
  v
Phase 1 (Lint cleanup)  <-  needs clean baseline to diff against
  v
Phase 2 (Provision live Supabase + migrate + seed)  <-  uses provided Supabase token
  v
Phase 3 (Cloudflare staging deploy)  <-  needs live Supabase env vars from Phase 2
  v
Phase 4 (E2E + F1-F4 verification)  <-  needs staging URL + seed creds
  v
Phase 5 (Client handoff doc - the final mile)  <-  documents only
```

**Worktree discipline**: single worktree (`master`, already exists), atomic commits per todo. **All commands run in a worker session with shell access** (the planner env has no shell; execution belongs to `/start-work`).

---

## Todos

<!-- Each todo has: References, What to build, Acceptance criteria, QA happy + failure paths, Commit line. -->
<!-- SOURCE OF TRUTH for commit messages + per-todo file paths: .omo/plans/savor-bakery.md (T1.3-T6.7). -->

### Phase 0 - Baseline Commits (preserve as-built Waves 2-6)

#### T0.1: Commit remaining Wave 1 infra + Wave 2 storefront
**References:** savor-bakery plan T1.3-T1.8, T2.1-T2.5 commit lines; `git status`.
**What to build:**
- Run `git status` to enumerate every dirty/untracked path (only 4 commits exist: Wave 1 T1.1/T1.2 + 1 refactor; everything else is uncommitted).
- Stage + commit in logical groups, reusing the EXACT commit messages from the savor-bakery plan per todo. Order: Wave 1 remaining infra (migrations 00001-00006, lib/storage, lib/email, resend webhook, seed-admin, lib/auth, login, wrangler.jsonc/.dev.vars.example/typegen) then Wave 2 storefront (components/layout, components/ui, app/layout.tsx, lib/data, app/globals.css, app/about, app/menu, components/promo-banner, lib/data/banners, components/whatsapp-widget, app/page.tsx).
- Use the savor-bakery plan's per-todo `**Commit:**` lines verbatim as commit messages.
**Acceptance criteria:**
- No Wave 1/Wave 2 files remain uncommitted.
- `git log` shows new commits in order on `master`.
- After EACH commit: `npm run build` passes (no broken intermediate state).
**QA happy:** `git log --oneline -15` shows new commits; `git status` clean for these files; `npm run build` -> Compiled successfully. Evidence: `evidence/c0-1-commits.txt`
**QA failure:** A staged file breaks build -> `npm run build` fails -> unstage, fix, re-stage. Evidence: `evidence/c0-1-rollback.txt`
**Commit:** (the savor-bakery plan's T1.3-T1.8 + T2.1-T2.5 commit lines)

---

#### T0.2: Commit Wave 3 (cart + checkout + orders)
**References:** savor-bakery plan T3.1-T3.5 commit lines; `git status`.
**What to build:** Stage + commit per the plan's T3.1-T3.5 messages: cart state (`lib/cart/store.ts`,`types.ts`), cart math+validation+tests (`lib/cart/math.ts`,`validation.ts`,`*.test.ts`), item detail modal (`components/item-detail-modal.tsx`), checkout (`app/cart/*`), order submission API + confirmation (`app/api/orders/*`, `app/orders/*`).
**Acceptance criteria:** Wave 3 files committed; `npm run build` passes after each; `npm test` -> 48/48 pass after the cart commit.
**QA happy:** `git status` clean for Wave 3; `npm test` -> 48 passed. Evidence: `evidence/c0-2-commits.txt`
**QA failure:** Staging cart files breaks a test -> run `npm test` after staging, fix before commit. Evidence: `evidence/c0-2-test-break.txt`
**Commit:** (the savor-bakery plan's T3.1-T3.5 commit lines)

---

#### T0.3: Commit Wave 4 (realtime + alarm + order dashboard)
**References:** savor-bakery plan T4.1-T4.5 commit lines; `git status`.
**What to build:** Stage + commit per the plan's T4.1-T4.5 messages: realtime (`lib/realtime/*`), alarm (`lib/alarm/*`), ack watchdog (`app/api/cron/ack-watchdog/*`), resend webhook (if not committed in T0.1 - dedup via `git status`), admin order dashboard (`app/admin/orders/*`). NOTE: `app/admin/layout.tsx` + `app/admin/page.tsx` belong to Wave 5 (T0.4).
**Acceptance criteria:** Wave 4 files committed; `npm run build` passes after each.
**QA happy:** `git log` shows Wave 4 commits; `git status` clean for Wave 4 paths. Evidence: `evidence/c0-3-commits.txt`
**QA failure:** Missing `lib/realtime/use-orders-realtime.ts` -> `git status` still dirty -> add it. Evidence: `evidence/c0-3-missing.txt`
**Commit:** (the savor-bakery plan's T4.1-T4.5 commit lines)

---

#### T0.4: Commit Wave 5 (admin panel full CMS)
**References:** savor-bakery plan T5.1-T5.9 commit lines; `git status`.
**What to build:** Stage + commit per the plan's T5.1-T5.9 messages: admin layout+dashboard (`app/admin/layout.tsx`,`app/admin/page.tsx`), menu items CRUD, categories CRUD, promo banners CRUD, gallery management, site settings editor, operating+holidays editor (if separate, else folded into T5.6 commit), custom cake inquiry mgmt (`app/admin/custom-cakes/*`,`app/custom-cake/*`), account/role mgmt (`app/admin/accounts/*`). Include `app/api/admin/*` routes if present.
**Acceptance criteria:** All `app/admin/*` committed (except orders); `npm run build` passes after each.
**QA happy:** `git status` -> no uncommitted `app/admin/*` files. Evidence: `evidence/c0-4-commits.txt`
**QA failure:** `app/admin/page.tsx` has known `Date.now()` lint error -> commit anyway (lint is Phase 1); build still passes. Evidence: `evidence/c0-4-build-passes.txt`
**Commit:** (the savor-bakery plan's T5.1-T5.9 commit lines)

---

#### T0.5: Commit Wave 6 (payments + resilience + seed + e2e) -> working tree FULLY clean
**References:** savor-bakery plan T6.1-T6.5, T6.7 commit lines; `git status`.
**What to build:** Stage + commit per the plan's T6.1-T6.7 messages: razorpay create-order (`app/api/razorpay/create-order/*`), checkout+verify (`components/retry-payment-button.tsx`,`app/api/razorpay/verify/*`), webhook+refund (`app/api/webhooks/razorpay/*`,`app/api/razorpay/refund/*`), resilience hardening (any uncommitted resilience-specific files - many items already in prior waves' files), seed menu (`supabase/migrations/00008_seed_menu.sql`), E2E suite (`e2e/*`,`playwright.config.ts`). Add `build-log.txt`,`test-log.txt`,`lint-log.txt` to `.gitignore` if not already; do NOT commit logs.
**Acceptance criteria:** `git status` -> "nothing to commit, working tree clean" (FULLY clean); `npm run build` passes; `npm test` -> 48/48 pass.
**QA happy:** `git status` -> working tree clean; `npm run build` -> Compiled successfully; `npm test` -> 48 passed. Evidence: `evidence/c0-5-clean.txt`
**QA failure:** Stray untracked build-log/test-log/lint-log -> add to `.gitignore`, don't commit. Evidence: `evidence/c0-5-gitignore.txt`
**Commit:** `chore: gitignore build/test/lint logs` + (the savor-bakery plan's T6.1-T6.5,T6.7 commit lines)

---

### Phase 1 - Lint Cleanup (F2 readiness)

#### T1.1: Fix all 44 lint errors -> `npm run lint` 0 errors
**References:** `lint-log.txt` (full error list with file:line:col + rule); savor-bakery plan F2 gate ("no `any` types, no missing error handling, proper TS types").
**What to build:** Fix every ERROR by root cause (NOT eslint-disable unless justified):
1. `react-hooks/set-state-in-effect` (8 errors) - `app/admin/{accounts,banners,categories,custom-cakes,gallery,menu-items,settings}/page.tsx`, `app/orders/[humanId]/page.tsx`, `components/item-detail-modal.tsx`, `lib/realtime/use-orders-realtime.ts`. Root cause: `useEffect(() => { fetchX() })` where fetchX calls `setLoading(true)` synchronously before the first await. Fix: initialize loading/selection state in `useState(initializer)` so the effect does NOT call setState synchronously; only setState after `await`. For item-detail-modal, compute initial selections eagerly in `useState(() => initFromItem(item))`. For use-orders-realtime, init `orders` to `[]` and only setOrders after async fetch resolves.
2. `@typescript-eslint/no-explicit-any` (~12 errors) - `app/admin/menu-items/page.tsx` (5), `app/admin/settings/page.tsx` (2), `app/api/orders/route.ts` (3), `components/retry-payment-button.tsx` (3), `lib/cart/validation.test.ts` (3). Fix: define/reuse `PriceOption`,`Addon`,`Variant`,`DecorationTier` (some exist in `lib/cart/types.ts`); type test mocks with `Partial<...>`; define request-body types for API routes; define `RazorpayOrderResponse` for retry-payment-button.
3. `react/no-unescaped-entities` (~9 errors) - `app/admin/custom-cakes/page.tsx`, `app/admin/page.tsx`, `app/cart/checkout/page.tsx` (2), `app/custom-cake/page.tsx`, `app/login/page.tsx`, `app/orders/[humanId]/page.tsx`, `app/page.tsx`, `components/retry-payment-button.tsx` (2), `components/whatsapp-widget.tsx`. Fix: `'` -> `&apos;`, `"` -> `&quot;`.
4. `react-hooks/immutability` (1) - `app/orders/[humanId]/page.tsx:53` `fetchOrder` accessed before declared. Fix: move `const fetchOrder = useCallback(...)` ABOVE the effect that calls it; add to dep array.
5. `react-hooks/purity` (1) - `app/admin/page.tsx:13` `Date.now()` in render. Fix: move `new Date(Date.now() + 86400000)` into useMemo/effect-set state, or compute inside the fetch effect.
6. `react/no-html-link-for-pages` (1) - `app/login/page.tsx:93` `<a href="/">`. Fix: `<Link href="/">` from `next/link`.
7. `react-hooks/preserve-manual-memoization` + stopAlarm-before-declared (2) - `lib/alarm/alarm-client.ts:117,125`. Fix: move `stopAlarm` declaration above `triggerAlarm`; add to dep array; let React Compiler own memoization or restructure.
8. Trivial warnings (23) - unused imports (`Clock`,`Star`,`Check`,`X`,`Plus`,`BellOff`,`Badge`,`Calendar`,`Smartphone`,`PriceOption`,`Addon`,`useEffect`,`DEFAULT_NOTICE_RULES`,`amount`,`err`,`rules`): remove the unused imports/vars. `'amount' assigned but never used` (razorpay webhook): prefix with `_` or remove.
**Acceptance criteria:** `npm run lint` -> 0 errors (warnings acceptable if justified, target 0 warnings too). `npm run build` passes. `npm test` -> 48/48 pass.
**QA happy:** `npm run lint` -> 0 errors 0 warnings; `npm run build` -> Compiled successfully; `npm test` -> 48 passed. Evidence: `evidence/c1-1-lint-clean.txt`
**QA failure:** A lint fix breaks a test -> `npm test` fails -> revert that fix, re-do without changing behavior. Evidence: `evidence/c1-1-test-break.txt`
**Commit:** `fix: resolve all lint errors (set-state-in-effect, any types, unescaped entities, immutability, purity)`

---

### Phase 2 - Provision Live Supabase + Migrate + Seed

#### T2.1: Create Supabase project + apply migrations + seed admin/staff
**References:** `.omo/credentials-setup.md` (Supabase section); provided Supabase CLI token `sbp_REDACTED`; `supabase/migrations/00001-00008`.
**What to build:**
1. Smoke-test the token: `npx supabase projects list` (using `SUPABASE_ACCESS_TOKEN` from `.dev.vars`). If it errors/empty -> token dead -> HALT, surface to user (do NOT proceed).
2. Create project: `npx supabase projects create savor-bakery --region ap-south-1` -> capture `<project-ref>`.
3. Get API keys: `npx supabase projects api-keys --project-ref <project-ref>` -> capture anon + service_role keys.
4. Write to `.dev.vars`: `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>`, `SUPABASE_SERVICE_ROLE_KEY=<service>`.
5. Link + apply migrations: `npx supabase link --project-ref <project-ref>` then `npx supabase db push --project-ref <project-ref>` (applies 00001-00008 incl. seed menu, RLS, storage, auth triggers, processed_webhooks, seed_menu).
6. Generate default staging seed creds: admin email `admin@savorbakery.in` + strong random 16-char password; staff email `staff@savorbakery.in` + strong random password. Write to `.dev.vars`: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_STAFF_EMAIL`, `SEED_STAFF_PASSWORD`.
7. Run seed: `npx tsx scripts/seed-admin.ts` (creates 1 admin + 1 staff, sets roles; idempotent).
8. Set `STAFF_NOTIFY_EMAIL=admin@savorbakery.in` in `.dev.vars` (staging fallback for ack-watchdog email).
**Acceptance criteria:**
- Supabase project exists in ap-south-1; `projects list` shows it.
- All 7 migrations applied: `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` -> 9 tables + order_daily_seq.
- RLS on: anon `SELECT FROM orders` -> 0 rows; staff `SELECT FROM orders` -> rows (once an order exists).
- Singleton `site_settings` row id=1 exists; 6 categories + 78 menu_items exist (`SELECT count(*) FROM menu_items WHERE is_active=true` -> ~78).
- Seed: 2 profiles (1 admin, 1 staff) with correct roles; admin can log in via Supabase Auth.
**QA happy:** `npx supabase projects list` shows savor-bakery; admin login via `/login` -> redirected to `/admin`. Evidence: `evidence/c2-1-supabase-live.txt`
**QA failure:** `db push` fails on a migration -> read the SQL error, fix the migration file, re-run `db push`. Evidence: `evidence/c2-1-migration-fail.txt`
**Commit:** `chore: document live supabase project provisioning (creds in .dev.vars, not committed)`

---

### Phase 3 - Cloudflare Staging Deploy

#### T3.1: Create KV namespace + set secrets + deploy staging
**References:** `wrangler.jsonc`; provided `CLOUDFLARE_API_TOKEN`; OpenNext build `npm run deploy:staging`.
**What to build:**
1. `npx wrangler kv namespace create SAVOR_KV` -> capture the namespace ID.
2. Edit `wrangler.jsonc`: replace the placeholder KV namespace ID with the real one.
3. Set staging secrets (one per prompt): `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging`, `RESEND_API_KEY --env staging`, `CRON_SECRET --env staging` (generate a random CRON_SECRET). (Razorpay secrets SKIP - client-gated; the KYC-pending UPI fallback path will be active.)
4. Set staging vars in `wrangler.jsonc` `env.staging.vars`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STAFF_NOTIFY_EMAIL=admin@savorbakery.in`.
5. Bundle size check: `npx opennextjs-cloudflare build` then inspect `.open-next/` size; if compressed > 10MB, lazy-load heavy deps (resend/@react-email) inside handlers.
6. Dry-run: `npx wrangler deploy --dry-run --env staging` -> verify success + bundle size.
7. Deploy: `npm run deploy:staging` -> capture the `*.workers.dev` staging URL.
8. Whitelist Resend IPs in Cloudflare WAF (staging optional): 44.228.126.217, 50.112.21.217, 52.24.126.164, 54.148.139.208, 2600:1f24:64:8000::/52.
**Acceptance criteria:**
- KV namespace created; `wrangler.jsonc` has real ID; build passes; dry-run < 10MB; `npm run deploy:staging` succeeds; staging URL returns HTTP 200.
- Staging connects to live Supabase (env vars set); `/login` -> admin login -> `/admin/orders` loads with realtime; `/menu` shows 78 seeded items; cart + checkout reachable.
**QA happy:** `curl -sI <staging-url>` -> 200; browser -> `/menu` shows items; login as seed admin -> `/admin`. Evidence: `evidence/c3-1-staging-live.png`
**QA failure:** Bundle > 10MB -> dry-run fails -> lazy-load `resend` inside the email send handler (move `import` into the function body), rebuild. Evidence: `evidence/c3-1-bundle-too-big.txt`
**Commit:** `ci: deploy to cloudflare workers staging (kv, secrets, *.workers.dev url)`

---

### Phase 4 - E2E + Final Verification Wave

#### T4.1: Run Playwright E2E against staging + F1-F4 verification
**References:** `e2e/*` (9 specs); `playwright.config.ts` (reads `E2E_BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`); savor-bakery plan F1-F4 + Success criteria.
**What to build:**
1. Set E2E env: `E2E_BASE_URL=<staging-url> ADMIN_EMAIL=admin@savorbakery.in ADMIN_PASSWORD=<seed-pw>`.
2. Run: `npx playwright test --retries=2`. The 9 specs: order-placement, admin-alarm, sold-out-toggle, bulk-rule, custom-cake-inquiry, checkout-closed-day, promo-banner, admin-menu-edit, razorpay-test-checkout. Treat `razorpay-test-checkout` as best-effort (KYC-pending UPI fallback path; real Razorpay modal needs client-gated test keys).
3. Collect Playwright HTML report + screenshots to `evidence/`.
4. **F1 Plan compliance audit**: verify every savor-bakery todo's acceptance criteria met + every referenced file exists + every schema table/policy created. Cross-check vs `.omo/plans/savor-bakery.md`.
5. **F2 Code quality review**: `npm run lint` -> 0 errors (done Phase 1); review diff for no hardcoded secrets, proper types, error handling, no oversized files (>400 lines). Run a read-only code review.
6. **F3 Real manual QA**: Playwright/browser screenshots of storefront (mobile+desktop), menu with filters, checkout flow, admin dashboard with alarm firing, admin CMS panels. Verify pastel theme, mobile responsiveness, no broken layouts.
7. **F4 Scope fidelity**: verify every IN-scope item implemented + every OUT-scope item NOT implemented (no scope creep).
**Acceptance criteria:**
- E2E: 8 of 9 specs green (razorpay best-effort). Playwright report saved.
- F1: every todo acceptance met; every file exists; schema complete. -> APPROVE.
- F2: 0 lint errors; no secrets in source; no `any`; no oversized files. -> APPROVE.
- F3: screenshots show correct pastel theme, mobile-responsive, no broken layouts. -> APPROVE.
- F4: IN-scope all present, OUT-scope all absent. -> APPROVE.
- All 4 must APPROVE to declare done.
**QA happy:** `npx playwright test` -> 8+ specs pass; F1-F4 all APPROVE. Evidence: `evidence/c4-1-e2e-report.html` + `evidence/c4-1-f1f2f3f4.txt`
**QA failure:** A spec fails (e.g. bulk-rule doesn't block) -> read trace, fix the validation bug in `lib/cart/validation.ts`, re-run that spec. If F2 finds a secret -> rotate + remove. Evidence: `evidence/c4-1-e2e-fail-trace.txt`
**Commit:** `test: run e2e suite against staging + final verification wave (f1-f4)`

---

### Phase 5 - Client Handoff Doc (the final mile)

#### T5.1: Write HANDOFF.md + update credentials-setup.md with the client-gated checklist
**References:** `.omo/credentials-setup.md`; this plan's OUT-scope (client-gated items).
**What to build:**
1. Create `HANDOFF.md` at repo root with:
   - **Staging access**: staging URL, seed admin email + temp password (INSTRUCT CLIENT TO ROTATE IMMEDIATELY via `/admin/accounts`), seed staff email.
   - **What's live**: staging site fully functional; 78-item menu seeded; admin CMS; realtime alarm; email (Resend default sender); KYC-pending UPI fallback payments.
   - **Client-gated final-mile checklist** (each with exact steps):
     a. Register a domain (Cloudflare Registrar / GoDaddy / Namecheap) -> add zone to Cloudflare.
     b. Provide Razorpay test keys (`rzp_test_*` from https://dashboard.razorpay.com/app/keys) -> set as Cloudflare staging+prod secrets `RAZORPAY_KEY_ID`,`RAZORPAY_KEY_SECRET` -> enable `razorpay_active` in site settings.
     c. Confirm/replace staff notification email (`STAFF_NOTIFY_EMAIL`) -> set Cloudflare var.
     d. Verify Resend sending domain (DKIM/SPF/DMARC DNS) on the registered domain -> set `RESEND_WEBHOOK_SECRET` -> configure Resend webhook endpoint `https://<domain>/api/webhooks/resend`.
     e. Collect Razorpay KYC docs (PAN + Aadhaar + cancelled cheque + FSSAI + Shop&Establishment + GSTIN if >20L) -> submit; site needs T&C/Refund/Privacy pages before KYC (verify they exist or are in scope).
     f. Production deploy: `npm run deploy:production` with prod secrets + custom domain routes in Cloudflare.
2. Update `.omo/credentials-setup.md`: mark Supabase token/Resend key/CF token/GitHub as DONE; mark Razorpay keys/staff email/seed creds/Resend webhook secret/domain as REMAINING with the staging defaults noted.
3. Rotate the staging seed passwords out of any committed file (they live only in `.dev.vars` - gitignored) - verify `git status` shows `.dev.vars` ignored.
**Acceptance criteria:**
- `HANDOFF.md` exists at repo root with staging access + complete client-gated checklist.
- `.omo/credentials-setup.md` updated with DONE/REMAINING statuses.
- No secrets in any git-tracked file (`.dev.vars` confirmed gitignored).
**QA happy:** `cat HANDOFF.md` shows full checklist; `git check-ignore .dev.vars` -> prints `.dev.vars` (ignored); `grep -r "sbp_8ff5" --exclude-dir=.git .` -> no token in tracked files. Evidence: `evidence/c5-1-handoff.txt`
**QA failure:** A secret found in a tracked file -> `git rm --cached` it, add to `.gitignore`, rotate the exposed value. Evidence: `evidence/c5-1-secret-leak.txt`
**Commit:** `docs: add HANDOFF.md + update credentials-setup (client-gated final-mile checklist)`

---

## Final verification wave (inherited from savor-bakery plan)

F1-F4 run in Phase 4 (T4.1). ALL must APPROVE before declaring done. This completion plan adds the staging-E2E + live-DB smoke layers on top of the original F1-F4.

---

## Commit strategy

- Atomic commits per todo: `<type>: <description>` (feat, fix, refactor, docs, test, chore, ci).
- Phase 0 reuses the savor-bakery plan's existing per-todo commit messages verbatim (source of truth).
- Phases 1-5 use new conventional commits per todo.

---

## Success criteria

1. `git status` -> working tree clean; `git log` shows ~30+ logical commits (Wave 1 baseline + Waves 2-6 + lint + provision + deploy + verification + handoff).
2. `npm run lint` -> 0 errors; `npm run build` -> passes; `npm test` -> 48/48 pass.
3. Live Supabase project exists (ap-south-1) with all migrations applied + admin/staff seeded + 78-item menu.
4. Cloudflare Workers staging deploy live on `*.workers.dev`; staging connects to live Supabase; admin login + realtime alarm work on staging.
5. 8+ of 9 Playwright E2E specs green against staging (razorpay best-effort).
6. F1-F4 all APPROVE.
7. `HANDOFF.md` documents staging access + the complete client-gated final-mile checklist; no secrets in tracked files.
8. The remaining client-gated items (domain, Razorpay live keys, staff email, Resend domain, production deploy) are clearly documented for the client - NOT blocked on the worker.

---

## Dependency matrix

| Todo | Depends on | Blocks |
|------|-----------|--------|
| T0.1-T0.5 | none (baseline) | T1.1 (clean diff) |
| T1.1 (lint) | T0.5 (clean baseline) | T4.1 F2 |
| T2.1 (supabase) | T1.1 (lint-clean build) | T3.1 (env vars), T4.1 (seed creds) |
| T3.1 (staging deploy) | T2.1 (live DB env vars) | T4.1 (staging URL) |
| T4.1 (E2E + F1-F4) | T3.1 (URL) + T2.1 (creds) | T5.1 (verification receipts) |
| T5.1 (handoff doc) | T4.1 (verification done) | nothing (terminal) |

---

## Notes

- The savor-bakery plan (`.omo/plans/savor-bakery.md`) remains the source of truth for the BUILD scope, commit messages, and per-todo file paths. This completion plan only sequences the COMPLETION + VERIFICATION + DEPLOY work on top of it; it does not redefine build scope.
- The planner env has no shell tool. ALL execution (git, supabase CLI, wrangler, playwright, npm) belongs to a worker session the user starts (e.g. `/start-work`). The planner has only read + write-plan-artifacts.
- Staging is fully reversible: a Supabase project can be deleted; a Cloudflare Worker can be deleted; KV namespace removed. No irreversible action is taken without the client (domain, Razorpay live, Resend domain).
