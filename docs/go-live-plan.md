# Go-live plan: how the site could break, and what to do about it

Written 27 October 2026, before live testing. Ordered by how badly each would
hurt on launch day. **Fixed** means done in code; **You** means it needs the
owner or Jeremy; **Watch** means there is nothing to build, just something to
keep an eye on.

## Must be done before launch

| # | What could go wrong | What it would cause | Fix | Status |
|---|---|---|---|---|
| 1 | **Pages fail under load (Cloudflare Error 1102).** The site runs on Cloudflare Workers' free plan, which allows 10 ms of CPU per request. Heavy pages already failed about 30% of loads on 11 Oct; lighter pages fixed most of it. A launch-day rush is exactly the load that brings it back. | Blank "Error 1102" pages, failed checkouts, orders lost. | Workers Paid plan (US$5/month). Check Cloudflare → Workers & Pages → **savor-bakery-staging** (the worker that actually serves savorbydee.in) → Metrics for errors first. | **You** |
| 2 | **No order email has ever been delivered.** Emails were sent from a domain that doesn't exist (savorbakery.in). | Staff only learn about orders from the Orders page or phone alerts. | Verify savorbydee.in in Resend (3 DNS records in Cloudflare), then on the savor-bakery-staging worker set `EMAIL_FROM` = `Savor by Dee <orders@savorbydee.in>` and `STAFF_NOTIFY_EMAIL` = the inbox that should get alerts. | **You** |
| 3 | **Staff phones don't alert until set up.** Each phone must turn notifications on once (Orders → "Order alerts on this device"). iPhones only allow it from the Home Screen app. | An order that nobody hears about. | Set up every staff phone with the Test button before launch; repeat if a phone is replaced or browser data is cleared. | Fixed in code (27 Oct). **No phone set up yet**, and delivery to a real phone not yet confirmed |
| 4 | **Personal UPI account for business payments.** Payments go to a personal Google Pay account. Banks watch personal accounts receiving many small payments from strangers and can limit or freeze them. Personal accounts also have daily receiving limits, and Google Pay's "pay" button may not open for personal accounts. | Payments failing at the busiest time, or the account frozen with money in it. | A free business UPI account (Google Pay for Business, PhonePe Business or Paytm Business) and its QR. Then change Settings → Payment → UPI ID. The site needs no code change. | **You** |
| 5 | **The "production" worker still serves an old copy of the site** at savor-bakery-production.savor-bakery.workers.dev. Nobody links to it, but anyone who finds it gets old code against the live database. | Old bugs reachable, confusing duplicate site. | Deploy current code to it too (CI + Deploy → environment: production), or delete it in Cloudflare. | **You** (Jeremy can do the deploy) |
| 6 | **Customers couldn't attach reference photos to custom cake requests** (only staff could upload). | Every custom cake request arrived without a photo. | Migration 00051 + admin page fix. | **Fixed** (27 Oct, SQL applied) |
| 7 | **Daily automatic test orders at 11:00 would buzz every staff phone.** | Staff ignore alerts ("it's just the test"), then miss a real one. | Fixture orders no longer ring or push. | **Fixed** (27 Oct). First check: the 28 Oct 11:00 run |

## Should be done soon after launch

| # | What could go wrong | What it would cause | Fix | Status |
|---|---|---|---|---|
| 8 | **Overselling Today's Menu.** An item with no count in Today's Stock has unlimited stock, and over-the-counter sales don't reduce the website's count. | Orders for bakes that are already gone. | Set Today's Stock every morning (it's in the daily routine); lower a count when selling over the counter. | **Watch** |
| 9 | **Storage filling up.** Gallery photos are stored at full phone size (about 3 MB each, roughly 310 MB for 100). The free Supabase plan includes 1 GB. | Uploads start failing. | Shrink photos before upload (can be built: resize in the browser to about 2000 px), or upgrade Supabase. | **Watch**, can build |
| 10 | **Supabase free-plan limits.** No downloadable backups, and photo resizing may be a paid feature. Resizing currently works, but if Supabase stops providing it, every product photo on the site would break at once. | Data loss with no backup; broken images site-wide. | Check the plan in Supabase → Billing. Export the database weekly, or move to Pro (US$25/month) once orders are steady. | **You** |
| 11 | **Nobody is told when the site is down.** The only check is the daily 11:00 test. | Hours of downtime before anyone notices. | Free uptime monitor (UptimeRobot or Cloudflare health check) on savorbydee.in, alerting Jeremy's phone. | **You** (5 minutes) |
| 12 | **Staff locked out of their account.** The site has no "Forgot password" link, and the built-in Supabase emails are rate-limited. | A staff member can't sign in at opening time. | An admin can send a sign-in link from Supabase → Authentication → Users. A "Forgot password" page can be built once email (#2) works. | **Watch**, can build |
| 13 | **Leftover accounts.** `staff@savorbakery.in` (setup leftover, unreachable email) and `staff@gmail.com` (demo, a real stranger's address) are still staff. `admin@savorbakery.in` is the test robot's admin login, with its password in GitHub secrets. | A login nobody controls getting into the admin. | Set the first two to Customer or delete them now. Keep the robot account, with a long password. | **You** (or ask Jeremy) |
| 14 | **Four old September orders still pending** (Jane, jeremy, abba, Gjgfh). | "Unacknowledged" never reads 0, so a real new one is easy to miss. | All test orders and custom cake requests deleted on 27 Oct (backup: `clients website/pre-launch-test-data-backup-2026-10-27.json`). | **Done** |

## Still to test before launch

| What | How | Why it matters |
|---|---|---|
| A notification arriving on a real phone | Android: Chrome → Orders → turn on notifications → Test alert → lock the phone. iPhone: Add to Home Screen first. | The server sends and Google accepts the push, but no notification could be confirmed in an automated browser. A real phone is the proof. |
| A real order with real money | Small order from a customer's phone, pay by UPI from a different phone, Mark as paid with the UTR, through to Fulfilled. | The whole money path, plus the alarm and push for a real order. |
| Emergency hours during opening hours | Dashboard → Close early (a time an hour away), try to book after it, then Back to normal hours. | Only tested at night on 27 Oct, when the shop was already closed. |
| A custom cake request with a photo | From the public form on a phone, then open it in Admin → Custom Cakes. | Customer uploads only started working on 27 Oct. |
| A real staff member's phone | Their own account set to Staff, alerts turned on. | So they see the staff menu and get their own alerts. |

## Already covered (and how)

- **Emergency closing / opening late:** Dashboard → Today's hours (admins). Applies to the banner, menu, checkout and order system at once, expires by itself, and lists orders booked for times that become closed. Nothing is cancelled automatically.
- **Paying the wrong amount, or reusing a screenshot or UTR:** staff type the amount and UTR. A UTR can only be used once (database rule), and "Mark as paid" stays locked until the bank-check box is ticked.
- **Customer pays late:** the 60-minute payment window shows as "Unpaid · overdue"; staff message or cancel.
- **Two people buying the last item:** stock is taken inside the database, so two checkouts in the same second can't both get it.
- **Closed days, holidays, notice periods, delivery hours:** enforced by the order system itself, not just the website. When a time is refused, checkout offers "Use earliest" and "Change date & time".
- **Staff changing things they shouldn't:** payment settings, roles, banners, gallery, Behind the Scenes, reviews, settings and custom cakes are admin-only in the database, not just hidden.
- **An unacknowledged order:** the Orders page alarm, a push to every staff phone, and a reminder push 5 minutes later if nobody has pressed Acknowledge.

## Launch-day checklist

1. Run migrations 00049–00051 in Supabase (SQL editor).
2. Upgrade Cloudflare Workers to Paid (#1); set up the email domain (#2).
3. Every staff phone: sign in → Orders → turn on sound and notifications → **Test alert**. On iPhone, add to the Home Screen first.
4. Clean up accounts (#13) and old orders (#14).
5. One real order, start to finish: place it, hear the alarm, pay ₹ from another phone, **Mark as paid** with the UTR, Confirmed → Ready → Fulfilled.
6. Set Today's Stock.
7. Keep Orders open on one device at the counter with **Keep screen on**.
