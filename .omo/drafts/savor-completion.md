# savor-completion — Planning Draft (resume point)

## Intent
- intent: clear
- review_required: false
- adopt_default_filter: ON (normal CLEAR routing — user did NOT ask to be interviewed this session)
- classification: Completion (finish an already-coded-but-uncommitted-and-unverified greenfield full-stack site)
- status: approved (user: "approve" — plan locked, ready for worker execution)

## Request summary
"Read all md files, understand the contents, what was built, what is left. Then: plan."
The SAVOR bakery site is ~99% code-complete (39 todos across 6 waves, all files on disk, `next build` passes, 48 unit tests pass) BUT: only 4 git commits exist (Wave 1 only — Waves 2–6 are uncommitted working-tree changes), lint has 44 errors + 23 warnings, E2E specs (9) were never run, the final verification wave (F1–F4) never ran, and NOTHING has been runtime-verified against a live Supabase/Cloudflare/Razorpay/Resend backend. T6.6 (deploy) is the only todo explicitly marked BLOCKED.

## Workspace
- cwd: C:\Users\cloud\OneDrive\Desktop\Hybrid_Second_Brain\clients website\SAVOR
- git: yes, branch master, 4 commits (Wave 1 + 1 refactor). HEAD = 8d3bc364. Working tree dirty (Waves 2–6 uncommitted).
- planner env has NO shell tool → draft + plan hand-built with `write` (scaffold script not runnable here), template replicated from existing savor-bakery plan/draft.

## Credentials reality (from .omo/credentials-setup.md + .dev.vars.example)
- ✅ PROVIDED + usable by worker with shell: Supabase CLI token (sbp_*** redacted — in .dev.vars), Cloudflare API token (CLOUDFLARE_API_TOKEN), Resend API key (RESEND_API_KEY), GitHub repo.
- ❌ CLIENT-GATED (cannot be done by worker): Razorpay test keys (rzp_test_*), staff notify email value, Resend sending-domain verification (needs registered domain), domain registration, Razorpay live keys (post-KYC).
- ⚠️ DEFAULTABLE for staging: seed admin/staff creds (generate strong defaults, document rotation), STAFF_NOTIFY_EMAIL (use seed admin email for staging).

## Key finding — most infra is NOT client-gated
Supabase project creation + migration apply + seed + Cloudflare KV + staging deploy + E2E run can ALL be done by a worker with shell access using the provided tokens. Only the production/custom-domain/Razorpay-live/Resend-verified mile is client-gated. This is far more optimistic than "everything blocked."

## Decisions ledger (adopted defaults — announced in brief)
- commit-strategy = wave-level logical commits (5 commits for Waves 2–6 baseline, then 1 lint-cleanup commit). NOT 33 per-todo commits (code already written together; per-todo atomic is busywork now) and NOT 1 giant squash (unreviewable). Reuses the exact commit messages already specified in .omo/plans/savor-bakery.md per todo. Reversible, internal → defaulted.
- lint-approach = fix all 44 lint ERRORS properly (root-cause fixes, not eslint-disable), fix trivial warnings (unused imports, unescaped entities), justify/suppress only non-trivial warnings. F2 gate requires 0 errors. Reversible → defaulted.
- provision-live-infra = YES, worker provisions live Supabase project + applies migrations + seeds + creates CF KV + deploys to Cloudflare staging using the provided tokens. Client handed these tokens over explicitly for this purpose (credentials-setup.md: "Once the build agent has shell access, run these commands"). Staging is reversible (tear-down). Not an owner-decision that must be asked → defaulted + announced.
- staging-seed-creds = generate strong defaults (e.g. admin@savorbakery.in + random 16-char pw), set in .dev.vars + CF staging secret, document in handoff for client to rotate. Safety-critical-ish but staging-only + rotate-able → defaulted.
- baseline-before-lint = commit the as-built Waves 2–6 FIRST (preserve current state), THEN lint-cleanup as a separate commit on top so the cleanup is a reviewable diff. Reversible → defaulted.
- domain = owner-decision (irreversible purchase, permanent public identity) BUT client-gated + documented, not a fork I can resolve → goes in handoff checklist, not asked.

## Approval gate
status: approved (user: "approve" — plan locked, ready for worker execution)
pending action: NONE for planner. Execution belongs to a worker session the user starts (e.g. `/start-work` / `savor-completion` plan). Planner does NOT implement — not directly, not via subagent.
approach: 5-phase completion — (0) baseline commits, (1) lint cleanup, (2) provision live Supabase + migrate + seed, (3) Cloudflare staging deploy, (4) E2E + F1–F4 verification, (5) client-gated handoff checklist for the production mile. Phases 0–4 are worker-executable with shell; Phase 5 is a handoff.
review_required: false
