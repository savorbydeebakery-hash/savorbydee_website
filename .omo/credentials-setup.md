# SAVOR Bakery — Credentials Setup Guide

> **Last updated**: 2026-08-23
> **IMPORTANT**: This file is git-tracked. NEVER put raw secret values here.
> All secrets live in `.dev.vars` (gitignored) or `wrangler secret put` (production).
> **Token storage confirmed**: Cloudflare API token = `$env:CLOUDFLARE_API_TOKEN` + `.dev.vars` (gitignored). GitHub remote has NO token embedded. Never commit secrets.

---

## Credentials Provided by Client

| Service | Status | Notes |
|---------|--------|-------|
| Supabase CLI token | ✅ Provided | In `.dev.vars` as `SUPABASE_ACCESS_TOKEN` |
| Resend API key | ✅ Provided | In `.dev.vars` as `RESEND_API_KEY` |
| GitHub repo | ✅ Provided | `https://github.com/savorbydeebakery-hash/savorbydee_website` |
| Cloudflare API token | ✅ Provided | In `.dev.vars` as `CLOUDFLARE_API_TOKEN` |
| Razorpay test keys | ❌ NOT YET | Need `rzp_test_*` keys from Razorpay dashboard |
| Staff notify email | ❌ NOT YET | Email for order alarm notifications |

---

## Cloudflare API Token — Instructions for Client

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"** → **"Create Custom Token"**
3. Set these exact permissions:

| Resource | Permission | Level |
|----------|-----------|-------|
| Account → Workers Scripts | Edit |
| Account → Workers R2 Storage | Edit |
| Account → Workers KV Storage | Edit |
| Account → Account Settings | Read |
| Zone → Zone | Read |
| Zone → DNS | Edit |
| Zone → Workers Routes | Edit |

4. **Account Resources**: Include your specific account
5. **Zone Resources**: Include the specific zone (your domain, e.g. `savorbakery.in`)
6. Click **"Continue to summary"** → **"Create Token"**
7. Copy the token and paste it into `.dev.vars` as `CLOUDFLARE_API_TOKEN`

---

## Still Needed from Client

1. **Staff notification email** — the email address where new-order alarms will be sent (e.g. `orders@savorbakery.in`). Put in `.dev.vars` as `STAFF_NOTIFY_EMAIL`.

2. **Razorpay test keys** — go to https://dashboard.razorpay.com/app/keys, get the Test key ID (`rzp_test_...`) and Test key secret. Put in `.dev.vars` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

3. **Seed admin/staff account credentials** — choose an email + password for the admin account and a staff account. Put in `.dev.vars` as `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_STAFF_EMAIL`, `SEED_STAFF_PASSWORD`.

4. **Resend sending domain** — verify your domain (e.g. `savorbakery.in`) in the Resend dashboard so emails can be sent from `orders@savorbakery.in`. Add the DNS records Resend provides.

5. **Resend webhook secret** — after setting up the webhook endpoint in Resend dashboard (pointing to `https://your-domain/api/webhooks/resend`), copy the webhook signing secret into `.dev.vars` as `RESEND_WEBHOOK_SECRET`.

---

## Supabase Project Setup (for build agent with shell access)

Once the build agent has shell access, run these commands:

```bash
# 1. Login with the CLI token
npx supabase login --token sbp_***redacted***

# 2. Create project (Mumbai region for lowest latency to Kolkata)
npx supabase projects create savor-bakery --region ap-south-1

# 3. Get the project URL and API keys
npx supabase projects api-keys --project-ref <project-ref>
# Copy the anon key and service_role key into .dev.vars

# 4. Apply migrations
npx supabase db push --project-ref <project-ref>

# 5. Run seed script
npx tsx scripts/seed-admin.ts
```

---

## File Locations

- `.dev.vars` — ALL secrets (gitignored, safe)
- `.dev.vars.example` — template with empty values (git-tracked, safe)
- `wrangler.jsonc` — Worker config (non-secret env vars only; secrets via `wrangler secret put`)
- `.omo/credentials-setup.md` — THIS FILE (instructions only, no secrets)
