-- From the client (2026-11-01).

-- 1. An item can be on both menus. Until now daily_menu chose ONE menu: on
--    Today's Menu, or else on the Preorder Menu. Cookies are baked for the
--    day AND preordered in boxes, so each menu now has its own switch.
--    Today's Stock and "sold out" are about today's bakes, so they apply only
--    to Today's Menu orders (app/api/orders/route.ts).
alter table public.menu_items
  add column if not exists preorder_menu boolean not null default false;

-- Everything stays where it is: what wasn't on Today's Menu was on the
-- Preorder Menu. An item needing 5 days' notice is always a preorder, so one
-- with Today's Menu ticked as well goes on both (the client's rule).
update public.menu_items set preorder_menu = (not daily_menu) or requires_custom_notice;

comment on column public.menu_items.preorder_menu is
  'Shown on the Preorder Menu. Independent of daily_menu (Today''s Menu): an item can be on both.';

-- 2. A "Cookies" section on the Preorder Menu: the cookie category is renamed
--    (it holds cashew, linzer and jam drop cookies, not only shortbread) and
--    its active items go on the Preorder Menu as well.
update public.categories set name = 'Cookies' where name = 'Shortbread Cookies';
update public.menu_items set preorder_menu = true
where is_active
  and category_id in (select id from public.categories where name = 'Cookies');

-- 3. Only Today's Menu orders take stock, so only they give it back when
--    cancelled. Without this, cancelling a cookie preorder on the day it was
--    placed would add to today's cookie count.
alter table public.orders
  add column if not exists takes_stock boolean not null default true;

comment on column public.orders.takes_stock is
  'Whether placing this order took Today''s Stock (Today''s Menu orders only). Cancelling gives it back only when true.';

create or replace function public.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  same_day boolean :=
    (new.created_at at time zone 'Asia/Kolkata')::date
      = (now() at time zone 'Asia/Kolkata')::date;
begin
  if not new.takes_stock then
    return new;
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if same_day and old.stock_restored_at is null then
      update public.menu_items m
      set stock_count = m.stock_count + q.qty
      from (
        select menu_item_id, sum(quantity)::int as qty
        from public.order_items
        where order_id = new.id and menu_item_id is not null
        group by menu_item_id
      ) q
      where m.id = q.menu_item_id and m.stock_count is not null;
      new.stock_restored_at := now();
    end if;
  elsif old.status = 'cancelled' and new.status is distinct from 'cancelled'
        and old.stock_restored_at is not null then
    -- Un-cancelled: take the stock again, if it is still the same day.
    if same_day then
      update public.menu_items m
      set stock_count = greatest(0, m.stock_count - q.qty)
      from (
        select menu_item_id, sum(quantity)::int as qty
        from public.order_items
        where order_id = new.id and menu_item_id is not null
        group by menu_item_id
      ) q
      where m.id = q.menu_item_id and m.stock_count is not null;
    end if;
    new.stock_restored_at := null;
  end if;

  return new;
end;
$$;

-- 4. Custom cake requests are sent on WhatsApp by the customer, like an
--    order's payment message. Their own number, so they can go to Dee rather
--    than the shop; empty means the shop's WhatsApp number.
alter table public.site_settings
  add column if not exists cake_whatsapp_number text;

comment on column public.site_settings.cake_whatsapp_number is
  'WhatsApp number custom cake requests are sent to (country code, digits). Empty: whatsapp_number.';
