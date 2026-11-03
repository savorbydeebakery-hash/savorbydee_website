# SAVOR E2E Execution Plan — FINAL

## CRITICAL: One remaining code fix needed

### Fix needed: admin-alarm.spec.ts customer context (CANNOT BE SKIPPED)
The admin-alarm test's customer context (lines 33-38) STILL skips checkout steps.
It goes: cart → checkout → fill name → place order.
It needs the SAME 4-step navigation as order-placement.

**Current code (lines 33-38):**
```ts
await customerPage.goto("/cart");
await customerPage.getByRole("button", { name: /checkout/i }).click();
await customerPage.getByLabel(/name/i).fill("Alarm Test");
await customerPage.getByLabel(/phone/i).fill("9836537447");
await customerPage.getByLabel(/email/i).fill("alarm@example.com");
await customerPage.getByRole("button", { name: /place order/i }).click();
```

**Replace with:**
```ts
await customerPage.goto("/cart");
await customerPage.getByRole("button", { name: /checkout/i }).click();

// Navigate checkout steps: review → fulfillment → details → confirm
await customerPage.getByRole("button", { name: /continue/i }).click();
await customerPage
  .locator("input[type='datetime-local']")
  .fill(new Date(Date.now() + 48 * 3600_000).toISOString().slice(0, 16));
await customerPage.getByRole("button", { name: /continue/i }).click();

await customerPage.getByLabel(/name/i).fill("Alarm Test");
await customerPage.getByLabel(/phone/i).fill("9836537447");
await customerPage.getByLabel(/email/i).fill("alarm@example.com");
await customerPage.getByRole("button", { name: /review order/i }).click();

await customerPage.getByRole("button", { name: /place order/i }).click();
```

---

## All code fixes ALREADY APPLIED to working tree (uncommitted)

### Source code fixes (need rebuild):
1. `components/ui/input.tsx` — auto-generate id from label via `idFromLabel()`
2. `components/menu-client.tsx` — NEW client component: search/filter/cards + ItemDetailModal, "Add to Cart" buttons
3. `app/menu/page.tsx` — expanded query (all MenuItemForCart fields) + renders MenuClient
4. `app/custom-cake/page.tsx` — "Flavor Preference" → "Flavour Preference"
5. `components/item-detail-modal.tsx` — aria-label="Increase/Decrease quantity" on +/- buttons
6. `components/ui/modal.tsx` — role="dialog" + aria-modal="true"
7. `lib/cart/types.ts` — added `category_id: string` + `dietary_tags?: string[]` to MenuItemForCart
8. `lib/cart/math.test.ts` — added `category_id: "cat-1"` to 3 test fixtures
9. `open-next.config.ts` — `buildCommand: "next build --webpack"` (Windows symlink EPERM fix)

### Test fixes (no rebuild needed):
10. `e2e/admin-alarm.spec.ts` — credentials → `cloudlyconfusing@gmail.com` / `admin123` + `waitForURL` after login + modal confirm step ✅
11. `e2e/admin-alarm.spec.ts` — **STILL NEEDS** customer context checkout step navigation (see above)
12. `e2e/admin-menu-edit.spec.ts` — credentials → `cloudlyconfusing@gmail.com` / `admin123` + `waitForURL` after login ✅
13. `e2e/order-placement.spec.ts` — modal confirm + 4-step checkout navigation (Continue→/datetime/Continue→/Review Order→/Place Order) ✅
14. `e2e/razorpay-test-checkout.spec.ts` — modal confirm + 4-step checkout navigation ✅
15. `e2e/bulk-rule.spec.ts` — modal quantity flow (Increase quantity ×14, dialog confirm) ✅
16. `e2e/checkout-closed-day.spec.ts` — modal confirm step ✅
17. `e2e/sold-out-toggle.spec.ts` — unchanged (already passing) ✅
18. `e2e/promo-banner.spec.ts` — unchanged (already passing) ✅
19. `e2e/custom-cake-inquiry.spec.ts` — unchanged (label fix covers it) ✅

---

## Execution commands (run in order)

### Step 1: Apply the one remaining fix
Edit `e2e/admin-alarm.spec.ts` lines 33-38 (customer context) — replace with the 4-step checkout navigation shown above.

### Step 2: Kill any stale wrangler dev
```powershell
Get-Process | Where-Object { $_.ProcessName -match "wrangler|workerd" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Remove-Item -Recurse -Force ".open-next" -ErrorAction SilentlyContinue
```

### Step 3: Rebuild OpenNext
```powershell
npx opennextjs-cloudflare build
```
Expected: "Worker saved in .open-next/worker.js 🚀"
Expected bundle: server handler ~4.7 MB, middleware ~0.65 MB

### Step 4: Start wrangler dev
```powershell
Start-Process -FilePath "node.exe" -ArgumentList "node_modules/wrangler/bin/wrangler.js","dev","--port","8787" -WorkingDirectory (Get-Location).Path -RedirectStandardOutput ".open-next/wrangler-dev.log" -RedirectStandardError ".open-next/wrangler-dev.err.log" -WindowStyle Hidden
Start-Sleep -Seconds 25
# Verify:
Invoke-WebRequest -Uri "http://127.0.0.1:8787/menu" -UseBasicParsing -TimeoutSec 15
# Expected: 200, ~144KB
```

### Step 5: Run E2E tests
```powershell
$env:E2E_BASE_URL="http://127.0.0.1:8787"
$env:ADMIN_EMAIL="cloudlyconfusing@gmail.com"
$env:ADMIN_PASSWORD="admin123"
npx playwright test
```

### Step 6: Iterate on failures
If tests fail, check:
```powershell
# Error contexts
Get-ChildItem test-results -Recurse -Filter "error-context.md" | ForEach-Object { Write-Host "=== $($_.Name) ==="; Get-Content $_.FullName -Tail 30 }

# Screenshots are in test-results/*/test-failed-1.png

# Wrangler errors
Get-Content ".open-next/wrangler-dev.err.log" -Tail 20
```

### Step 7: Commit
```powershell
git add -A
git commit -m "fix: E2E label association, menu client, checkout navigation, admin credentials, modal a11y"
```

### Step 8: Cloudflare deploy (BLOCKED — no token)
No Cloudflare API token found locally. Checked:
- `.dev.vars` — no token
- `wrangler.jsonc` — no token (KV id still "placeholder-kv-id")
- `.env.local` — no token
- `~/.wrangler/config/default.toml` — does not exist (wrangler login never run)

**To unblock:** Either:
- Run `npx wrangler login` (opens browser for OAuth)
- Or set `$env:CLOUDFLARE_API_TOKEN="..."` with a token from Cloudflare dashboard

Then:
```powershell
# Create KV namespace
npx wrangler kv namespace create NEXT_TAG_CACHE_KV
# Update wrangler.jsonc with real KV id

# Set secrets
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# ... etc for all secrets in .dev.vars

# Deploy
npx wrangler deploy
```

### Step 9: Write HANDOFF.md
Document: Tokyo region deviation, credential status, build gotchas (Windows EPERM, webpack workaround), test results.

---

## Test expectations after all fixes applied

| # | Test | Expected | Root cause fixed |
|---|------|----------|-----------------|
| 1 | admin-alarm | PASS | Credentials + checkout nav + modal confirm |
| 2 | admin-menu-edit | PASS | Credentials + waitForURL |
| 3 | bulk-rule | PASS (already) | Modal quantity flow |
| 4 | checkout-closed-day | PASS (already) | Modal confirm (trivially passes) |
| 5 | custom-cake-inquiry | PASS (already) | Label association + "Flavour" spelling |
| 6 | order-placement | PASS | Checkout 4-step navigation + modal confirm |
| 7 | promo-banner | PASS (already) | No changes needed |
| 8 | razorpay-test-checkout | PASS | Checkout 4-step navigation + UPI fallback |
| 9 | sold-out-toggle | PASS (already) | "Unavailable" button text (no add-to-cart) |

**Goal: 9/9 PASS**

---

## Credentials
- Admin: `cloudlyconfusing@gmail.com` / `admin123` (user-confirmed)
- Alt admin: `savorbydeebakery@gmail.com` / `admin123`
- Supabase project: `tkzbroymiyvnigqxcpze` (Tokyo region — deviation from planned Mumbai)
- Seed creds in .dev.vars: `admin@savorbakery.in` / `L2lir5kVjYCadOWm` (may not match actual auth users)

## Known issues
- Razorpay: NOT set up (empty keys in .dev.vars). Test falls to UPI fallback branch.
- Cloudflare: No API token. Deploy blocked.
- Windows: OpenNext EPERM on .open-next deletion — must kill wrangler/workerd first.
- Wrangler dev: Use `node.exe node_modules/wrangler/bin/wrangler.js dev --port 8787` (not npx.cmd which fails silently).
