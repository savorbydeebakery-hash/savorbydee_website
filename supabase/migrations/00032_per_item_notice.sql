-- Notice and bulk rules that can be set per item and per category, and a
-- separate default for the preorder menu.
--
-- Resolution is item -> category -> site default, and the effective notice for
-- a cart is the LARGEST that applies to anything in it. All four new columns
-- are nullable on purpose: null means "inherit", which is different from 0
-- ("no notice needed"). A default of 0 would have silently removed the notice
-- window from all 124 items the moment this applied.
--
-- global_notice_hours keeps its meaning and becomes the DAILY default;
-- preorder_notice_hours is the new one for made-to-order items. The client's
-- rule: 2 hours for today's bakes, 24 for preorder, up to 5 days for custom
-- cakes, largest wins.

alter table public.site_settings
  add column if not exists preorder_notice_hours integer not null default 24;

comment on column public.site_settings.preorder_notice_hours is
  'Default notice for preorder items, in hours. global_notice_hours is the daily-menu default.';
comment on column public.site_settings.global_notice_hours is
  'Default notice for DAILY MENU items, in hours. See preorder_notice_hours for the other menu.';

alter table public.menu_items
  add column if not exists notice_hours integer,
  add column if not exists bulk_threshold integer;

comment on column public.menu_items.notice_hours is
  'Overrides the menu default for this item. NULL = inherit from category, then site.';
comment on column public.menu_items.bulk_threshold is
  'Per-item quantity above which this item counts as bulk. NULL = inherit.';

alter table public.categories
  add column if not exists notice_hours integer,
  add column if not exists bulk_threshold integer;

comment on column public.categories.notice_hours is
  'Overrides the menu default for every item in this category. NULL = inherit from site.';
comment on column public.categories.bulk_threshold is
  'Bulk quantity for every item in this category. NULL = inherit from site.';

-- Negative notice or a zero bulk threshold would both be nonsense, and a zero
-- threshold would make every single item a bulk order.
alter table public.menu_items drop constraint if exists menu_items_notice_hours_sane;
alter table public.menu_items add constraint menu_items_notice_hours_sane
  check (notice_hours is null or notice_hours >= 0);
alter table public.menu_items drop constraint if exists menu_items_bulk_threshold_sane;
alter table public.menu_items add constraint menu_items_bulk_threshold_sane
  check (bulk_threshold is null or bulk_threshold >= 1);

alter table public.categories drop constraint if exists categories_notice_hours_sane;
alter table public.categories add constraint categories_notice_hours_sane
  check (notice_hours is null or notice_hours >= 0);
alter table public.categories drop constraint if exists categories_bulk_threshold_sane;
alter table public.categories add constraint categories_bulk_threshold_sane
  check (bulk_threshold is null or bulk_threshold >= 1);
