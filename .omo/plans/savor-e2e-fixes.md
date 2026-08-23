# SAVOR E2E Fix Plan — 9/9 Passing

## Status
- 5/9 passing: bulk-rule, checkout-closed-day, custom-cake-inquiry, sold-out-toggle, promo-banner
- 4/9 failing: admin-alarm, admin-menu-edit, order-placement, razorpay-test-checkout

## Root Causes

### 1. Admin tests — wrong credentials (2 failures)
**Files:** `e2e/admin-alarm.spec.ts`, `e2e/admin-menu-edit.spec.ts`

The test fallbacks use `admin@savorbakery.in` / `Savor@2026` (then I changed to `L2lir5kVjYCadOWm`). Neither is correct.

**Correct credentials (confirmed by user):**
- Email: `cloudlyconfusing@gmail.com` (primary admin)
- Alt: `savorbydeebakery@gmail.com`
- Password: `admin123` for both

**Fix:** Update both test files:
```ts
const adminEmail = process.env.ADMIN_EMAIL ?? "cloudlyconfusing@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
```

Also update the login wait pattern. Current code uses `Promise.all([waitForURL, click])` which is correct, but ensure the `waitForURL` pattern matches `/\/admin/` (the login form redirects to `/admin` by default, middleware then allows access).

### 2. Order-placement & razorpay — missing checkout step navigation (2 failures)
**Files:** `e2e/order-placement.spec.ts`, `e2e/razorpay-test-checkout.spec.ts`

The checkout page (`app/cart/checkout/page.tsx`) is a **4-step flow**:
1. `review` — cart review, click "Continue →"
2. `fulfillment` — select pickup/delivery + datetime-local slot, click "Continue →"
3. `details` — **guest form** (Full Name, Phone Number, Email Address), click "Continue →"
4. `confirm` — summary, click "Place Order"

The tests navigate to `/cart/checkout` and immediately try `page.getByLabel(/name/i).fill(...)` — but they're still on the `review` step. The "Full Name" Input only renders when `step === "details"`.

**Fix for order-placement.spec.ts** — after `await expect(page).toHaveURL(/\/cart\/checkout/);`:
```ts
// Step 1: Review → Continue
await page.getByRole("button", { name: /continue/i }).click();

// Step 2: Fulfillment — select pickup, fill slot, Continue
// Pickup is the default selection (first button)
await page.locator("input[type='datetime-local']").fill(
  new Date(Date.now() + 48 * 3600_000).toISOString().slice(0, 16)
);
await page.getByRole("button", { name: /continue/i }).click();

// Step 3: Details — fill guest form (NOW visible)
await page.getByLabel(/name/i).fill("E2E Test Customer");
await page.getByLabel(/phone/i).fill("9836537447");
await page.getByLabel(/email/i).fill("e2e@example.com");
await page.getByRole("button", { name: /continue/i }).click();

// Step 4: Confirm — place order
await page.getByRole("button", { name: /place order/i }).click();
await expect(page.getByText(/SAV-/)).toBeVisible({ timeout: 15_000 });
```

**Fix for razorpay-test-checkout.spec.ts** — same checkout navigation, then:
```ts
// Razorpay not set up — test already has fallback for UPI text
const payOnline = page.getByRole("button", { name: /pay online/i });
if (await payOnline.isVisible().catch(() => false)) {
  await payOnline.click();
  await expect(page.frameLocator("iframe[src*='razorpay']").first().locator("body"))
    .toBeVisible({ timeout: 15_000 });
} else {
  // KYC-pending mode — UPI fallback shown instead
  await expect(page.getByText(/upi/i).first()).toBeVisible();
}
```

Note: User confirmed "razorpay hasn't been set up yet" — so the test should hit the `else` branch (UPI fallback). This is already handled by the test's existing fallback logic.

### 3. Cloudflare deploy — no API token (hard blocker)
**Search locally for the token:**
- Check `.dev.vars` file
- Check environment variables: `echo $env:CLOUDFLARE_API_TOKEN`
- Check `wrangler.jsonc` for any stored token
- Check `~/.wrangler/config/default.toml` (wrangler login cache)
- Try `npx wrangler whoami` to see if already authenticated

If token found: deploy. If not: user must provide it or run `wrangler login`.

## Execution Steps

1. **Fix admin credentials** in `e2e/admin-alarm.spec.ts` and `e2e/admin-menu-edit.spec.ts`
2. **Fix checkout navigation** in `e2e/order-placement.spec.ts` and `e2e/razorpay-test-checkout.spec.ts`
3. **Search for Cloudflare token** locally (.dev.vars, env vars, wrangler config)
4. **Kill wrangler dev** → rebuild OpenNext → restart wrangler dev on port 8787
5. **Run 9 E2E tests** with:
   ```
   $env:E2E_BASE_URL="http://127.0.0.1:8787"
   $env:ADMIN_EMAIL="cloudlyconfusing@gmail.com"
   $env:ADMIN_PASSWORD="admin123"
   npx playwright test
   ```
6. **Iterate** until 9/9 pass (check traces/screenshots for remaining failures)
7. **Commit** all fixes: `git add -A && git commit -m "fix: E2E label association, menu client, checkout navigation, admin credentials"`
8. **Deploy** (if token found): create R2 bucket + KV namespace, set secrets, `wrangler deploy`
9. **Write HANDOFF.md** — document Tokyo region deviation, credential status, build gotchas, Windows EPERM workaround

## Files to modify
- `e2e/admin-alarm.spec.ts` — credentials + login wait (already partially done)
- `e2e/admin-menu-edit.spec.ts` — credentials + login wait (already partially done)
- `e2e/order-placement.spec.ts` — add checkout step navigation
- `e2e/razorpay-test-checkout.spec.ts` — add checkout step navigation

## Already-applied fixes (committed to working tree, not yet committed to git)
- `components/ui/input.tsx` — auto-generate id from label (Input, Textarea, Select)
- `components/menu-client.tsx` — new client component with search/filter/cards + ItemDetailModal
- `app/menu/page.tsx` — expanded query + MenuClient render
- `app/custom-cake/page.tsx` — "Flavor Preference" → "Flavour Preference"
- `components/item-detail-modal.tsx` — aria-labels on quantity buttons
- `components/ui/modal.tsx` — role="dialog" + aria-modal="true"
- `lib/cart/types.ts` — added category_id + dietary_tags to MenuItemForCart
- `lib/cart/math.test.ts` — added category_id to fixtures
- `e2e/bulk-rule.spec.ts` — modal quantity flow
- `e2e/order-placement.spec.ts` — modal confirm step (needs MORE: checkout steps)
- `e2e/razorpay-test-checkout.spec.ts` — modal confirm step (needs MORE: checkout steps)
- `e2e/checkout-closed-day.spec.ts` — modal confirm step
- `e2e/admin-alarm.spec.ts` — modal confirm step + credentials (needs credential fix)
- `e2e/admin-menu-edit.spec.ts` — credentials (needs credential fix)
- `open-next.config.ts` — webpack buildCommand workaround

## Verification
- tsc --noEmit: 0 errors ✅
- eslint: 0 errors ✅
- vitest: 48/48 pass ✅
- OpenNext build: success ✅ (4.73 MB server handler)
- Playwright: 5/9 pass (need 4 more)
