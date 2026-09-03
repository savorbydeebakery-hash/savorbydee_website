-- Gaps found by diffing the client's official preorder menu cards against the
-- catalogue. Only the unambiguous half is here; the Frosted Sponge Cakes
-- conflict and the Chicken Quiche price are open questions, deliberately
-- untouched.
--
-- Sizes use the weight_tiers model, the same mechanism Classic NY Baked
-- already uses: base_price_cents carries the smaller size (what the storefront
-- shows as "from") and price_options carries both absolute prices.
--
-- min_order_qty 4 comes straight off the cards: "The minimum order quantity
-- for the dessert cups and tarts are 4 pieces" and the same for each mini
-- high-tea item.

-- NOTE: the ½ characters in the price_options below did not survive being
-- sent through the management API and landed as replacement characters. They
-- were re-applied over the REST API afterwards, which handles the encoding
-- correctly. If this file is ever replayed against a fresh database, check the
-- cheesecake labels before trusting them.

begin;

-- 1. Two pannacotta flavours the site never had.
insert into public.menu_items (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', v.name, v.price, 'flat', 4, true, false, v.sort
from (values ('Coffee Pannacotta', 6000, 40), ('Coconut Pannacotta', 6000, 41)) as v(name, price, sort)
where not exists (select 1 from public.menu_items m where m.name = v.name);

-- 2. Tartlettes are four separate flavours on the card, not two pairs.
--    The two existing rows are renamed rather than replaced so their ids, and
--    any order history against them, survive.
update public.menu_items
set name = 'Tartlettes - Fresh Fruits', base_price_cents = 6000, min_order_qty = 4
where name = 'Tartlettes (Fresh Fruits / Lemon Curd)';

update public.menu_items
set name = 'Tartlettes - Chocolate with Sea Salt', base_price_cents = 7000, min_order_qty = 4
where name = 'Tartlettes (Choc Sea Salt / Choc Strawberry)';

insert into public.menu_items (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', v.name, v.price, 'flat', 4, true, false, v.sort
from (values
  ('Tartlettes - Lemon Curd', 6000, 43),
  ('Tartlettes - Chocolate with Strawberry Coulis', 7000, 45)
) as v(name, price, sort)
where not exists (select 1 from public.menu_items m where m.name = v.name);

update public.menu_items set min_order_qty = 4
where name in ('Cold Cheesecake Cup', 'Pannacotta Cup', 'Thai Mango Pudding');

-- 3. Pies and quiches: on the card, absent from the site entirely.
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, price_options, min_order_qty, is_active, daily_menu, sort_order)
select 'e6e866db-2b95-4b7f-9fb8-451b1ff526be', v.name, v.price, 'weight_tiers', v.opts::jsonb, 4, true, false, v.sort
from (values
  ('Chicken and Mushroom Pies', 6000,
   '[{"label": "Mini (per pc)", "price": 6000}, {"label": "9\" Round", "price": 75000}]', 50),
  ('Vegetable Pot Pie', 4000,
   '[{"label": "Mini (per pc)", "price": 4000}, {"label": "9\" Round", "price": 70000}]', 51),
  ('Chicken and Mushroom Quiches', 6000,
   '[{"label": "Mini (per pc)", "price": 6000}, {"label": "9\" Round", "price": 78000}]', 52),
  ('Mixed Vegetable Quiche', 4000,
   '[{"label": "Mini (per pc)", "price": 4000}, {"label": "9\" Round", "price": 70000}]', 53)
) as v(name, price, opts, sort)
where not exists (select 1 from public.menu_items m where m.name = v.name);

-- 4. Cheesecakes are sold at two weights on the card. Only Classic NY Baked
--    carried both; the other five showed the ½ kg price with no way to order
--    a 1 kg.
update public.menu_items set price_model = 'weight_tiers',
  price_options = '[{"label": "½ kg", "price": 90000}, {"label": "1 kg", "price": 180000}]'::jsonb
where name = 'Classic Vanilla No-Bake';

update public.menu_items set price_model = 'weight_tiers',
  price_options = '[{"label": "½ kg", "price": 95000}, {"label": "1 kg", "price": 190000}]'::jsonb
where name = 'Thai Mango Coconut';

update public.menu_items set price_model = 'weight_tiers',
  price_options = '[{"label": "½ kg", "price": 95000}, {"label": "1 kg", "price": 190000}]'::jsonb
where name = 'Triple Layer Chocolate';

update public.menu_items set price_model = 'weight_tiers',
  price_options = '[{"label": "½ kg", "price": 90000}, {"label": "1 kg", "price": 180000}]'::jsonb
where name = 'Strawberry';

update public.menu_items set price_model = 'weight_tiers',
  price_options = '[{"label": "½ kg", "price": 100000}, {"label": "1 kg", "price": 190000}]'::jsonb
where name = 'Chocolate & Raspberry';

commit;
