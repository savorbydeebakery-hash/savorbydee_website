# CI / Deploy

`deploy.yml` runs on push to `master`, on PRs to `master` (checks only), and on
manual dispatch where you pick staging or production.

Order: **check → deploy → verify**. The deploy job `needs: check`, so a failing
typecheck, lint or unit test cannot reach Cloudflare. After deploying, the
E2E suite runs against the deployed URL rather than a local build.

## Required GitHub secrets

Repo → Settings → Secrets and variables → Actions → **Secrets**:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Edit Cloudflare Workers template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers → Account ID in the right sidebar |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `ADMIN_EMAIL` | the E2E admin login |
| `ADMIN_PASSWORD` | the E2E admin password |

## Required GitHub variable

Same page, **Variables** tab:

| Variable | Value |
|---|---|
| `DEPLOY_URL` | `https://savor-bakery-staging.savor-bakery.workers.dev` |

## What is NOT in here

Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`CRON_SECRET`, the Razorpay keys) stay as Worker secrets set with
`wrangler secret put`. They are read at runtime, not build time, so CI never
needs them and they should not be added above.
