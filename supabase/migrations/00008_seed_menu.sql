-- 00008_seed_menu.sql
-- Seed all categories + menu items from client's real menu.
-- 6 categories, ~78 items, all pricing models (flat, weight_tiers, base_half_kg).
-- ALL PRICES IN PAISE (rupees x 100).

begin;

-- ---------- CATEGORIES ----------
insert into public.categories (name, sort_order, is_active) values
  ('Tea Cakes', 1, true),
  ('Cheesecakes', 2, true),
  ('Cupcakes, Muffins & Brownies', 3, true),
  ('High Tea Nibbles', 4, true),
  ('Desserts', 5, true),
  ('Frosted Sponge Cakes', 6, true);

-- ---------- 1. TEA CAKES (14 items, flat) ----------
with cat as (select id from public.categories where name = 'Tea Cakes')
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, min_order_qty, dietary_tags, sort_order, is_active, is_sold_out, requires_custom_notice)
select cat.id, v.name, null, v.price, 'flat', 1, '{}'::text[], v.sort, true, false, false
from cat cross join (values
  ('Plain Vanilla', 34000, 1),
  ('Chocolate', 38500, 2),
  ('Carrot', 36000, 3),
  ('Marble', 38500, 4),
  ('Banana', 36000, 5),
  ('Choco-chip', 39500, 6),
  ('Lemon & Poppy Seed', 40000, 7),
  ('Banana & Walnut', 39000, 8),
  ('Dates & Walnut', 39000, 9),
  ('Chocolate & Walnut', 46500, 10),
  ('Walnut', 44000, 11),
  ('Very Berry', 46000, 12),
  ('Banana Honey & Oatmeal', 54000, 13),
  ('Rich Fruit Cake', 54000, 14),
  ('Rich Fruit Cake (rum)', 56000, 15)
) as v(name, price, sort);

-- ---------- 2. CHEESECAKES (6 items, weight_tiers + addons) ----------
with cat as (select id from public.categories where name = 'Cheesecakes')
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, price_options, addons, min_order_qty, dietary_tags, sort_order, is_active, is_sold_out, requires_custom_notice)
select cat.id, v.name, null, v.half_price, 'weight_tiers',
  jsonb_build_array(
    jsonb_build_object('label', '½kg', 'price', v.half_price),
    jsonb_build_object('label', '1kg', 'price', v.one_price)
  ),
  jsonb_build_array(
    jsonb_build_object('name', 'Compote Berries', 'price', 10000, 'is_active', true),
    jsonb_build_object('name', 'Fresh Fruits', 'price', 15000, 'is_active', true),
    jsonb_build_object('name', 'Chocolate Ganache', 'price', 10000, 'is_active', true),
    jsonb_build_object('name', 'Lotus Biscoff', 'price', 15000, 'is_active', true),
    jsonb_build_object('name', 'Salted Caramel', 'price', 10000, 'is_active', true)
  ),
  1, '{}'::text[], v.sort, true, false, false
from cat cross join (values
  ('Classic NY Baked', 100000, 200000, 1),
  ('Classic Vanilla No-Bake', 90000, 180000, 2),
  ('Thai Mango Coconut', 95000, 190000, 3),
  ('Triple Layer Chocolate', 95000, 190000, 4),
  ('Strawberry', 90000, 180000, 5),
  ('Chocolate & Raspberry', 100000, 190000, 6)
) as v(name, half_price, one_price, sort);

-- ---------- 3. CUPCAKES / MUFFINS / BROWNIES (flat) ----------
with cat as (select id from public.categories where name = 'Cupcakes, Muffins & Brownies')
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, variants, min_order_qty, dietary_tags, sort_order, is_active, is_sold_out, requires_custom_notice)
select cat.id, v.name, null, v.price, 'flat',
  case when v.variants is null then '[]'::jsonb else v.variants end,
  4, '{}'::text[], v.sort, true, false, false
from cat cross join (values
  ('Vanilla Cupcake', 4500, null, 1),
  ('Chocolate Cupcake', 5000, null, 2),
  ('Coffee Cupcake', 5000, null, 3),
  ('Marble Cupcake', 5000, null, 4),
  ('Blueberry Cupcake', 5000, null, 5),
  ('Funfetti Cupcake', 5000, null, 6),
  ('Red Velvet Cupcake', 5000, null, 7),
  ('Fresh Fruit Cupcake', 5000, null, 8),
  ('Gourmet Cupcake', 7000,
    jsonb_build_array(
      jsonb_build_object('name', 'Lemon Curd & Blueberry', 'price_delta', 0),
      jsonb_build_object('name', 'Hazelnut + Choc Mousse', 'price_delta', 0),
      jsonb_build_object('name', 'Cream Cheese + Choc Ganache', 'price_delta', 0),
      jsonb_build_object('name', 'Raspberry + Choc Ganache', 'price_delta', 0)
    ), 9),
  ('Cloud Cakes', 15000, null, 10),
  ('Gooey Brownies', 6000, null, 11),
  ('Layered Brownies', 10000, null, 12)
) as v(name, price, variants, sort);

-- ---------- 4. HIGH TEA NIBBLES (flat, veg/non-veg tags) ----------
with cat as (select id from public.categories where name = 'High Tea Nibbles')
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, min_order_qty, dietary_tags, sort_order, is_active, is_sold_out, requires_custom_notice)
select cat.id, v.name, null, v.price, 'flat', 4, v.tags, v.sort, true, false, false
from cat cross join (values
  ('Cucumber & Mint Sandwich', 5000, '{veg}'::text[], 1),
  ('Tomato Cucumber & Cheese Sandwich', 5000, '{veg}'::text[], 2),
  ('Chicken Honey Mustard Sandwich', 6000, '{non-veg}'::text[], 3),
  ('Chicken Tikka Sandwich', 6000, '{non-veg}'::text[], 4),
  ('Chicken Coleslaw Sandwich', 6000, '{non-veg}'::text[], 5),
  ('Chicken Kheema Buns', 4000, '{non-veg}'::text[], 6),
  ('Chicken Tikka Buns', 4000, '{non-veg}'::text[], 7),
  ('Chicken Patties', 4000, '{non-veg}'::text[], 8),
  ('Mixed Veg Patties', 3500, '{veg}'::text[], 9),
  ('Mini Pizza Veg', 5000, '{veg}'::text[], 10),
  ('Mini Pizza Non-Veg', 6000, '{non-veg}'::text[], 11),
  ('Mini Choc Doughnuts', 3500, '{veg}'::text[], 12),
  ('Choc Doughnut', 5000, '{veg}'::text[], 13),
  ('Cinnamon Roll', 5000, '{veg}'::text[], 14),
  ('Berry Cream Cheese Buns', 5000, '{veg}'::text[], 15),
  ('Mini Marbled Swiss Rolls', 4000, '{veg}'::text[], 16),
  ('Lamingtons', 4000, '{veg}'::text[], 17),
  ('Korean Buns', 9000, '{veg}'::text[], 18),
  ('Mini Korean Buns', 4500, '{veg}'::text[], 19)
) as v(name, price, tags, sort);

-- ---------- 5. DESSERTS (flat) ----------
with cat as (select id from public.categories where name = 'Desserts')
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, variants, min_order_qty, dietary_tags, sort_order, is_active, is_sold_out, requires_custom_notice)
select cat.id, v.name, null, v.price, 'flat',
  case when v.variants is null then '[]'::jsonb else v.variants end,
  4, '{}'::text[], v.sort, true, false, false
from cat cross join (values
  ('Tiramisu Tub', 30000, null, 1),
  ('Cold Cheesecake Cup', 6000, null, 2),
  ('Pannacotta Cup', 6000,
    jsonb_build_array(
      jsonb_build_object('name', 'Vanilla', 'price_delta', 0),
      jsonb_build_object('name', 'Blueberry', 'price_delta', 0),
      jsonb_build_object('name', 'Strawberry', 'price_delta', 0),
      jsonb_build_object('name', 'Coffee', 'price_delta', 0),
      jsonb_build_object('name', 'Coconut', 'price_delta', 0),
      jsonb_build_object('name', 'Thai Mango', 'price_delta', 0)
    ), 3),
  ('Thai Mango Pudding', 6000, null, 4),
  ('Tartlettes (Fresh Fruits / Lemon Curd)', 6000,
    jsonb_build_array(
      jsonb_build_object('name', 'Fresh Fruits', 'price_delta', 0),
      jsonb_build_object('name', 'Lemon Curd', 'price_delta', 0)
    ), 5),
  ('Tartlettes (Choc Sea Salt / Choc Strawberry)', 7000,
    jsonb_build_array(
      jsonb_build_object('name', 'Choc Sea Salt', 'price_delta', 0),
      jsonb_build_object('name', 'Choc Strawberry', 'price_delta', 0)
    ), 6)
) as v(name, price, variants, sort);

-- ---------- 6. FROSTED SPONGE CAKES (base_half_kg + size_options + decoration_tiers, custom notice) ----------
with cat as (select id from public.categories where name = 'Frosted Sponge Cakes')
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, size_options, decoration_tiers, min_order_qty, dietary_tags, sort_order, is_active, is_sold_out, requires_custom_notice)
select cat.id, v.name,
  'Our cakes are eggless. Keto and Gluten-free available on request.',
  v.half_price, 'base_half_kg',
  jsonb_build_array(
    jsonb_build_object('label', '½kg', 'price_delta', 0),
    jsonb_build_object('label', '1kg', 'price_delta', 10000),
    jsonb_build_object('label', '2kg', 'price_delta', 30000)
  ),
  jsonb_build_array(
    jsonb_build_object('label', 'Basic', 'price_delta', 0),
    jsonb_build_object('label', 'Premium', 'price_delta', 5000),
    jsonb_build_object('label', 'Luxury', 'price_delta', 10000)
  ),
  1, '{eggless}'::text[], v.sort, true, false, true
from cat cross join (values
  ('Vanilla', 76000, 1),
  ('Funfetti', 81000, 2),
  ('Chocolate', 86000, 3),
  ('Choconilla', 86000, 4),
  ('Black/White Forest', 86000, 5),
  ('Red Velvet CC', 86000, 6),
  ('Butterscotch Praline', 86000, 7),
  ('Berries & Cream', 86000, 8),
  ('Refreshing Fruit', 86000, 9),
  ('Coffee', 86000, 10),
  ('Choc & Oreo', 86000, 11),
  ('Choc Truffle', 91000, 12),
  ('Choc Truffle Raspberry', 96000, 13),
  ('Nutty Truffle', 96000, 14),
  ('Tiramisu Alcohol', 96000, 15),
  ('Spiced Carrot CC', 96000, 16),
  ('Choc Hazelnut', 101000, 17),
  ('Sinful Choc Indulgence', 101000, 18)
) as v(name, half_price, sort);

commit;