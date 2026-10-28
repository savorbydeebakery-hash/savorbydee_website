-- Cash at pickup, and quicker Today's Menu pickups (client request, 2026-10-28).
--
-- cash_at_pickup: who may choose "pay cash when you collect" instead of UPI.
--   'off'    UPI only, for everyone.
--   'daily'  pickups of Today's Menu only (default): those bakes are already
--            made, so a customer who doesn't turn up costs little. Preorder
--            cakes are made specially and stay pay-first.
--   'all'    any pickup.
-- Deliveries are always UPI first: a delivery can be refused at the door.
--
-- daily_pickup_notice_minutes: how soon a Today's Menu PICKUP can be, after
-- ordering (default 10). Today's Menu DELIVERIES keep global_notice_hours
-- (2 hours) for traffic and the unexpected.

alter table public.site_settings
  add column if not exists cash_at_pickup text not null default 'daily'
    check (cash_at_pickup in ('off', 'daily', 'all')),
  add column if not exists daily_pickup_notice_minutes int not null default 10
    check (daily_pickup_notice_minutes between 0 and 240);

comment on column public.site_settings.cash_at_pickup is
  'Who may pay cash at pickup instead of UPI: off | daily (Today''s Menu pickups only) | all (any pickup). Deliveries are always UPI first.';
comment on column public.site_settings.daily_pickup_notice_minutes is
  'Minutes after ordering that a Today''s Menu pickup can be. Deliveries use global_notice_hours.';
