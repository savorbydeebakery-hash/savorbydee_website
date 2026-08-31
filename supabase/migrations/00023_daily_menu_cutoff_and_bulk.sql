-- Two rules the client stated after the panel was built.
--
-- 1. "Daily menu closes at 8.30pm" — the shop trades until 21:00 but stops
--    taking daily-menu orders half an hour earlier, so the last bakes can be
--    handed over. Stored as a clock string to match weekly_hours' "09:00"
--    shape, and editable in admin like everything else.
--
-- 2. "More than 12 of each item is a bulk order." bulk_threshold used to be
--    read as a total across the whole cart (set to 10). It is now read
--    per line item, so the value has to move to 12 or a 10-item cart of mixed
--    goods would be treated as bulk.

alter table public.site_settings
  add column if not exists daily_menu_cutoff text not null default '20:30';

comment on column public.site_settings.daily_menu_cutoff is
  'IST clock time after which daily-menu ordering stops, e.g. 20:30. Never later than the day''s closing time.';

comment on column public.site_settings.bulk_threshold is
  'Per-item quantity above which an order counts as bulk. 12 means 13+ of any one item triggers bulk_notice_hours.';

update public.site_settings set bulk_threshold = 12 where id = 1;
