-- 00012_homepage_curation.sql
-- Add homepage curation flags to menu_items + populate Shillong site settings.

begin;

-- ---------- MENU ITEM CURATION FLAGS ----------
alter table public.menu_items
  add column if not exists is_special boolean not null default false,
  add column if not exists is_chefs_choice boolean not null default false,
  add column if not exists is_bestseller boolean not null default false;

create index if not exists idx_menu_items_special on public.menu_items (is_special) where is_special = true;
create index if not exists idx_menu_items_chefs_choice on public.menu_items (is_chefs_choice) where is_chefs_choice = true;
create index if not exists idx_menu_items_bestseller on public.menu_items (is_bestseller) where is_bestseller = true;

-- ---------- SEED CURATION DEFAULTS ----------
-- Flag a few items so the homepage sections aren't empty on first deploy.
-- Admin can toggle any item via the admin panel.
update public.menu_items set is_chefs_choice = true where name in (
  'Choc Truffle',
  'Classic NY Baked',
  'Tiramisu Tub',
  'Blueberry Cupcake'
);
update public.menu_items set is_bestseller = true where name in (
  'Chocolate Cupcake',
  'Gooey Brownies',
  'Plain Vanilla',
  'Very Berry'
);
update public.menu_items set is_special = true where name in (
  'Rich Fruit Cake (rum)',
  'Triple Layer Chocolate',
  'Thai Mango Pudding'
);

-- ---------- SHILLONG SITE SETTINGS ----------
update public.site_settings
set
  bakery_name = 'Savor by Dee',
  contact_phone = '+91 98365 37447',
  whatsapp_number = '919836537447',
  address_line1 = 'Near Laban Police Station, Myliem',
  address_line2 = 'Police Bazaar',
  address_city = 'Shillong',
  address_state = 'Meghalaya',
  google_maps_directions_url = 'https://maps.app.goo.gl/UTshwMiCXrRDXPW67',
  weekly_hours = jsonb_build_object(
    'monday',    jsonb_build_object('open', true,  'from', '09:00', 'to', '21:00'),
    'tuesday',   jsonb_build_object('open', true,  'from', '09:00', 'to', '21:00'),
    'wednesday', jsonb_build_object('open', true,  'from', '09:00', 'to', '21:00'),
    'thursday',  jsonb_build_object('open', true,  'from', '09:00', 'to', '21:00'),
    'friday',    jsonb_build_object('open', true,  'from', '09:00', 'to', '21:00'),
    'saturday',  jsonb_build_object('open', true,  'from', '09:00', 'to', '21:00'),
    'sunday',    jsonb_build_object('open', false, 'from', '09:00', 'to', '21:00')
  )
where id = 1;

commit;