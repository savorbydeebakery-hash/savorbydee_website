-- Two delivery rules the client stated on 2026-09-02.
--
-- 1. "Orders above 10000/- delivery free". Stored in paise to match every
--    other money column in this schema, so 1000000 = ₹10,000.
--
-- 2. "Delivery timing from 10am to 8pm" — narrower than the shop's own
--    09:00-21:00. A collection slot at 09:30 is fine; a delivery slot at 09:30
--    is not, so this is a second window applied only to delivery orders rather
--    than a change to weekly_hours.
--
-- Clock strings match the shape weekly_hours and daily_menu_cutoff already use.

alter table public.site_settings
  add column if not exists free_delivery_threshold_cents integer not null default 1000000,
  add column if not exists delivery_from text not null default '10:00',
  add column if not exists delivery_to   text not null default '20:00';

comment on column public.site_settings.free_delivery_threshold_cents is
  'Order total at or above which delivery is free, in paise. 1000000 = ₹10,000.';
comment on column public.site_settings.delivery_from is
  'Earliest IST clock time a delivery slot may be booked for.';
comment on column public.site_settings.delivery_to is
  'Latest IST clock time a delivery slot may be booked for.';
