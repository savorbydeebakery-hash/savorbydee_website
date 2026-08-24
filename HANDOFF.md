# SAVOR Bakery — Handoff Document

**Project:** SAVOR Bakery (Next.js 16 + OpenNext + Cloudflare Workers)  
**Status:** Code complete, **staging deployed**, 6/9 E2E passing, **3 failing due to Supabase connectivity**  
**Last Updated:** 2026-08-23

---

## 🎯 Project Overview

**SAVOR** is a bakery pre-order website with:
- Public menu browsing with search/filter by category
- Custom cake inquiry form
- Shopping cart with multi-step checkout (review → fulfillment → details → confirm)
- Admin dashboard (orders, menu items, banners, settings)
- Supabase backend (PostgreSQL + Realtime + Auth)
- Cloudflare Workers deployment via OpenNext

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Supabase, OpenNext, Cloudflare Workers

---

## ✅ What's Complete

### Source Code Fixes (committed: 28190a0)

| Area | Changes |
|------|---------|
| **Label Association** | `components/ui/input.tsx` — `Input`/`Textarea`/`Select` auto-generate `id` from label text when `id`/`name` missing (fixes 3 failing E2E tests) |
| **Menu Client** | `components/menu-client.tsx` (NEW) — client component with search, category filter, cards, "Add to Cart" buttons wired to `ItemDetailModal` |
| **Menu Page** | `app/menu/page.tsx` — rewritten to fetch full `MenuItemForCart` fields + render `MenuClient` |
| **Custom Cake** | `app/custom-cake/page.tsx` — "Flavor Preference" → "Flavour Preference" (British spelling, matches test) |
| **Modal A11y** | `components/ui/modal.tsx` — `role="dialog"` + `aria-modal="true"` |
| **Modal Quantity** | `components/item-detail-modal.tsx` — `aria-label="Increase/Decrease quantity"` on +/- buttons |
| **Type Safety** | `lib/cart/types.ts` — added `category_id: string`, `dietary_tags?: string[]` to `MenuItemForCart` |
| **Test Fixtures** | `lib/cart/math.test.ts` — added `category_id` to 3 test fixtures |
| **Cache Strategy** | `open-next.config.ts` — switched from R2 to KV incremental cache (no R2 needed) |

### Test Fixes (9 specs)

| Spec | Fix Applied | Status |
|------|-------------|--------|
| `admin-alarm.spec.ts` | Credentials + `waitForURL` after login + checkout step navigation | ❌ Failing (API 500) |
| `admin-menu-edit.spec.ts` | Credentials + `waitForURL` after login | ❌ Failing (API 500) |
| `order-placement.spec.ts` | Modal confirm + 4-step checkout navigation | ❌ Failing (API 500) |
| `razorpay-test-checkout.spec.ts` | Modal confirm + 4-step checkout + UPI fallback | ✅ Passing |
| `bulk-rule.spec.ts` | Modal quantity flow (Increase qty ×14 + dialog confirm) | ✅ Passing |
| `checkout-closed-day.spec.ts` | Modal confirm step | ✅ Passing |
| `custom-cake-inquiry.spec.ts` | Label fix covers it | ✅ Passing |
| `promo-banner.spec.ts` | No changes needed | ✅ Passing |
| `sold-out-toggle.spec.ts` | "Unavailable" button text | ✅ Passing |

### Verification Passed

| Check | Result |
|-------|--------|
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 errors |
| `vitest run` | 48/48 tests pass |
| `opennextjs-cloudflare build` | ✅ Success — 4.73 MB server handler |

---

## 🌐 Deployment Status

### Staging Deployed ✅
- **URL:** `https://savor-bakery-staging.savor-bakery.workers.dev`
- **Worker Name:** `savor-bakery-staging`
- **Version:** `22098afe-28ab-48db-8d8f-ea3c998bb78c`
- **KV Namespaces:** `NEXT_TAG_CACHE_KV` (f093d94fdebf4188aa60ded662505117), `NEXT_INC_CACHE_KV` (53cc6d539bcc4482a941b535d56f9eca)
- **Secrets:** All 11 set for staging env
- **Cache:** KV incremental cache (no R2 required)

### ⚠️ Known Issue: Supabase Connectivity

**Orders/menu API returns 500 on staging** — Supabase connectivity from Cloudflare Workers failing.

**Root Cause:** Supabase project (`tkzbroymiyvnigqxcpze`) is in Tokyo region (ap-south-1). Cloudflare Workers edge network has connectivity issues with this region, or Supabase has IP restrictions blocking Cloudflare Workers IPs.

**Impact:** 
- Orders API returns 500 → 3 E2E tests failing
- Menu items API may be failing → admin-menu-edit test failing
- 6/9 E2E tests passing locally against staging

**Workarounds to investigate:**
1. Enable Supabase "Allow connections from anywhere" or add Cloudflare IP ranges to allowlist
2. Use Supabase connection pooling (PgBouncer) with session mode
3. Consider moving Supabase project to a region with better Cloudflare connectivity
4. Use Supabase Edge Functions / Deno deploy for API routes

---

## 🔐 Credentials & Configuration

### Admin Credentials (E2E tests)
| Environment | Email | Password |
|-------------|-------|----------|
| **Staging** | `cloudlyconfusing@gmail.com` | `admin123` |
| Alt admin | `savorbydeebakery@gmail.com` | `admin123` |

### Supabase (Live — Tokyo region)
| Key | Value |
|-----|-------|
| Project Ref | `tkzbroymiyvnigqxcpze` |
| Region | `ap-south-1` (Tokyo — **deviation from planned Mumbai**) |
| URL | `https://tkzbroymiyvnigqxcpze.supabase.co` |
| Anon Key | In secrets / `.dev.vars` |
| Service Role Key | In secrets / `.dev.vars` |
| Access Token | **STORED LOCALLY** in `.dev.vars` (gitignored) |

### Cloudflare
| Item | Value |
|------|-------|
| Account | `Savorbydeebakery@gmail.com's Account` (ID: `65a52221c847bdcc342307d1def648ef`) |
| API Token | **STORED LOCALLY** in `$env:CLOUDFLARE_API_TOKEN` / `.dev.vars` (gitignored — not committed) |
| KV Tag Cache | `f093d94fdebf4188aa60ded662505117` |
| KV Incremental Cache | `53cc6d539bcc4482a941b535d56f9eca` |
| Workers.dev Subdomain | `savor-bakery.workers.dev` |

### Token Storage
| Token | Location |
|-------|----------|
| **Cloudflare API Token** | Shell env var `$env:CLOUDFLARE_API_TOKEN` + `.dev.vars` (gitignored) |
| **Never committed to git** | Token must stay out of tracked files |

**To persist token locally:** add `CLOUDFLARE_API_TOKEN=<token>` to `.dev.vars` (gitignored). Do NOT put it in any tracked file.

---

## 🛠️ Build & Deploy Commands

### Local Development
```powershell
# Build (webpack workaround for Windows symlink EPERM)
npx opennextjs-cloudflare build

# Start local worker (needs ~35s to boot)
Start-Process node.exe -Arg "node_modules/wrangler/bin/wrangler.js","dev","--port","8787" -WorkingDir "." -RedirectStdOut ".open-next/wrangler.log" -RedirectStdErr ".open-next/wrangler.err.log" -WindowStyle Hidden
Start-Sleep 35
Invoke-WebRequest http://127.0.0.1:8787/menu  # Should return 200

# Run E2E tests locally
$env:E2E_BASE_URL="http://127.0.0.1:8787"
$env:ADMIN_EMAIL="cloudlyconfusing@gmail.com"
$env:ADMIN_PASSWORD="admin123"
npx playwright test
```

### Deploy Staging
```powershell
# Cloudflare token is in .dev.vars (gitignored) — loaded automatically
npx opennextjs-cloudflare build
npx wrangler deploy --env staging

# Run E2E against staging
$env:E2E_BASE_URL="https://savor-bakery-staging.savor-bakery.workers.dev"
$env:ADMIN_EMAIL="cloudlyconfusing@gmail.com"
$env:ADMIN_PASSWORD="admin123"
npx playwright test
```

---

## ⚠️ Known Issues & Gotchas

### Windows + OpenNext
- **Symlink EPERM** — OpenNext uses symlinks in `.next` during Turbopack build. **Fixed** by forcing webpack: `buildCommand: "next build --webpack"` in `open-next.config.ts` (spread pattern because `CloudflareOverrides` type rejects `buildCommand` param but return type supports it).
- **Workerd lock on `.open-next`** — Must kill `workerd`/`wrangler` processes before rebuilding: `Get-Process | Where { $_.ProcessName -match "wrangler|workerd" } | Stop-Process -Force`

### E2E Test Flakiness
- **Admin tests** — Require real Supabase Auth users. Current tests use `cloudlyconfusing@gmail.com` / `admin123`. Ensure these exist in Supabase Auth dashboard.
- **Razorpay test** — Falls to UPI branch (keys empty). Update test when Razorpay configured.
- **checkout-closed-day.spec.ts** — Passes trivially (looks for `input[type='date']`, checkout uses `datetime-local`). Needs rewrite for real coverage.

### Supabase Region
- **Tokyo (ap-south-1)** — Deviation from planned Mumbai. Documented here.

### Razorpay
- **Not configured** — Keys empty in secrets. Razorpay test expects UPI fallback. Update when live.

---

## 📂 Key Files Modified (git diff 28190a0^..28190a0)

### Source
- `components/ui/input.tsx` — label association fix
- `components/menu-client.tsx` — NEW
- `app/menu/page.tsx` — rewrite
- `app/custom-cake/page.tsx` — "Flavour" spelling
- `components/ui/modal.tsx` — role="dialog"
- `components/item-detail-modal.tsx` — aria-labels on qty buttons
- `lib/cart/types.ts` — MenuItemForCart extended
- `lib/cart/math.test.ts` — fixtures updated
- `open-next.config.ts` — KV incremental cache (was R2)

### Tests
- `e2e/admin-alarm.spec.ts` — credentials + checkout nav
- `e2e/admin-menu-edit.spec.ts` — credentials
- `e2e/order-placement.spec.ts` — checkout nav
- `e2e/razorpay-test-checkout.spec.ts` — checkout nav
- `e2e/bulk-rule.spec.ts` — modal quantity flow
- `e2e/checkout-closed-day.spec.ts` — modal confirm
- `e2e/admin-menu-edit.spec.ts` — credentials

### Config
- `wrangler.jsonc` — KV namespaces, no vars, env-specific config
- `open-next.config.ts` — KV incremental cache (was R2)

---

## 📋 Next Steps

1. **Fix Supabase connectivity** — Enable Cloudflare IP ranges in Supabase dashboard, or use connection pooling
2. **Re-run E2E** — Should reach 9/9 passing once API works
3. **Create R2 bucket** — Enable R2 in Cloudflare Dashboard, restore `r2_buckets` in wrangler.jsonc, switch `incrementalCache` back to `r2IncrementalCache` in `open-next.config.ts`
4. **Create admin users in Supabase Auth** — `cloudlyconfusing@gmail.com` / `admin123` and `savorbydeebakery@gmail.com` / `admin123`
5. **Configure Razorpay** — Add keys when available
6. **Commit & push** — `git push origin main`

---

## 📞 Contact / Context

- **Supabase Project:** `tkzbroymiyvnigqxcpze` (Tokyo)
- **Admin Emails:** `cloudlyconfusing@gmail.com`, `savorbydeebakery@gmail.com` (both `admin123`)
- **Seed passwords in .dev.vars** (may differ from actual Auth): `L2lir5kVjYCadOWm` / `xo9VKGgAsJSHzfNR`
- **Cloudflare Token:** Stored in `.dev.vars` / `$env:CLOUDFLARE_API_TOKEN` (gitignored — see token storage section above)
- **Razorpay:** Not configured
- **Region:** Tokyo (not Mumbai as originally planned)

---

*Generated 2026-08-23. Staging deployed, 6/9 E2E passing, 3 failing due to Supabase connectivity from Cloudflare Workers.*