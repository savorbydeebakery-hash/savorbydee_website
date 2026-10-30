-- Preorders can be placed at any hour (client request, 2026-10-30).
--
-- A preorder needs at least 24 hours' notice, so one placed at 2 am still
-- leaves the whole working day to confirm it. Today's Menu keeps to opening
-- hours. Staff phones stay quiet while the shop is closed; one alert goes out
-- when it opens (app/api/cron/ack-watchdog).
--
-- The code treats a missing column as "on", so the site behaves the same
-- before and after this runs; it only adds the switch in Settings.

alter table public.site_settings
  add column if not exists preorders_when_closed boolean not null default true;

comment on column public.site_settings.preorders_when_closed is
  'Take Preorder Menu orders while the shop is closed. Today''s Menu always follows opening hours.';
