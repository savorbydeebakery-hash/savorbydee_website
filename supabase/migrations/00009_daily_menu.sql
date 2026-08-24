-- 00009_daily_menu.sql
-- Add admin-curated "daily menu" flag to menu_items + seed defaults.
-- Homepage "Today's Menu" shows items where daily_menu = true.

begin;

-- ---------- COLUMN ----------
alter table public.menu_items
  add column if not exists daily_menu boolean not null default false;

-- ---------- INDEX ----------
create index if not exists idx_menu_items_daily_menu
  on public.menu_items (daily_menu)
  where daily_menu = true;

-- ---------- SEED DEFAULTS ----------
-- Flag a curated handful so the homepage isn't empty on first deploy.
-- Admin can toggle any item via the admin panel.
update public.menu_items set daily_menu = true where name in (
  -- Tea cakes
  'Plain Vanilla',
  'Chocolate',
  'Carrot',
  'Very Berry',
  'Banana Honey & Oatmeal',
  -- Cupcakes / brownies
  'Vanilla Cupcake',
  'Chocolate Cupcake',
  'Gooey Brownies',
  -- Desserts
  'Tiramisu Tub',
  'Cold Cheesecake Cup',
  -- Frosted sponge cakes
  'Chocolate',
  'Choc Truffle'
);

commit;