-- ============================================================
-- SAVOR Bakery — 00006_processed_webhooks.sql
-- Dedup table for Resend + Razorpay webhook idempotency
-- ============================================================

create table public.processed_webhooks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('resend', 'razorpay')),
  event_id text not null,
  event_type text not null,
  payload jsonb,
  processed_at timestamptz not null default now(),
  unique (source, event_id)
);

create index idx_processed_webhooks_lookup on public.processed_webhooks (source, event_id);
create index idx_processed_webhooks_age on public.processed_webhooks (processed_at);

-- Ack-watchdog cron cleans up entries older than 30 days
-- (handled in the cron route, not a DB job)