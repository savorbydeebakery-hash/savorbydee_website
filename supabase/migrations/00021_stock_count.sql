-- Live stock counter per menu item.
--
-- NULL means "not tracked" — the item has no counter and behaves exactly as it
-- did before this column existed. That is the default deliberately: 76 rows
-- already exist and defaulting them to 0 would have marked the entire
-- catalogue out of stock the moment this was applied.
--
-- 0 means out of stock. A positive value is what the storefront shows as
-- "In stock: N available".
--
-- is_sold_out is kept as a separate manual override. A baker who wants to pull
-- an item for the day without touching its count needs that, and conflating
-- the two would make "sold out" un-undoable without re-entering a number.

alter table public.menu_items
  add column if not exists stock_count integer;

alter table public.menu_items
  drop constraint if exists menu_items_stock_count_non_negative;

alter table public.menu_items
  add constraint menu_items_stock_count_non_negative
  check (stock_count is null or stock_count >= 0);

comment on column public.menu_items.stock_count is
  'Units available. NULL = not tracked (no counter shown), 0 = out of stock.';
