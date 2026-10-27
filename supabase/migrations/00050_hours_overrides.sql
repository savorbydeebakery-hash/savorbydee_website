-- One-day changes to the opening hours (2026-10-27): close early, open late,
-- close for the day, or open specially — for emergencies.
--
-- Keyed by IST date, e.g.
--   {"2026-10-28": {"to": "15:00", "note": "Closing early today, sorry!",
--                   "set_by": "savorbydeebakery@gmail.com", "set_at": "…"}}
-- Each entry only affects its own date, so it lapses by itself. Read by the
-- banner, checkout and the order API through lib/shop/hours-override.ts.
-- Writes are admin-only through the existing site_settings rule (00048).

alter table public.site_settings
  add column if not exists hours_overrides jsonb not null default '{}'::jsonb;

comment on column public.site_settings.hours_overrides is
  'One-day opening-hours changes keyed by IST date (YYYY-MM-DD): {closed?, from?, to?, note?, set_by?, set_at?}. See lib/shop/hours-override.ts.';
