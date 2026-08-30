-- ---------- PREORDER MENU ----------
-- A third curated menu type alongside Daily (daily_menu) and Specials
-- (is_special), toggled per item in Admin -> Menu Items.
--
-- Deliberately its own column rather than reusing requires_custom_notice.
-- That flag answers "does this need lead time", which is a pricing/checkout
-- rule; this one answers "should Dee show this on the preorder menu", which is
-- an editorial choice. Conflating them would mean every notice-bound item
-- silently appeared on a customer-facing menu the moment its notice was set.

alter table public.menu_items
  add column if not exists is_preorder boolean not null default false;

-- Matches the partial indexes already used for the other curated menus: the
-- storefront only ever reads active + flagged rows.
create index if not exists idx_menu_items_preorder
  on public.menu_items (is_preorder, sort_order)
  where is_preorder = true;

comment on column public.menu_items.is_preorder is
  'Shows the item on the Preorder Menu (/menu/preorder). Editorial flag, set in the admin panel; unrelated to requires_custom_notice, which drives lead-time rules at checkout.';
