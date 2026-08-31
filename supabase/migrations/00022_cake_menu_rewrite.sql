-- The client's cake menu, verbatim: 16 flavours with their own descriptions
-- and prices, replacing what was in "Frosted Sponge Cakes".
--
-- Existing rows are UPDATEd by name rather than deleted and re-inserted, so
-- their ids survive. That matters: order_items references menu_item_id, and
-- recreating the rows would orphan the history of every cake ever ordered.
-- It also preserves the daily_menu / is_bestseller flags already set in admin.
--
-- Four rows are not on the client's new list — Funfetti, Choconilla,
-- Spiced Carrot CC, Sinful Choc Indulgence. They are deactivated, NOT deleted,
-- so they can be brought back from the admin panel with one checkbox.

begin;

-- 1. Rename, reprice and describe the fourteen that carry over.
update public.menu_items set
  name = 'Vanilla Mascarpone', base_price_cents = 90000,
  description = 'A light vanilla sponge layered with smooth vanilla mascarpone cream, offering a delicate balance of sweetness and creaminess that melts on the tongue.'
where name = 'Vanilla' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Chocolate Mousse', base_price_cents = 90000,
  description = 'Moist chocolate cake wrapped around airy mousse, creating a rich yet feather-light indulgence that satisfies every cocoa craving.'
where name = 'Chocolate' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Red Velvet', base_price_cents = 90000,
  description = 'Deep crimson sponge with a hint of cocoa, paired with whipped cream cheese filling — tangy, velvety, and irresistibly smooth.'
where name = 'Red Velvet CC' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Black Forest', base_price_cents = 90000,
  description = 'Layers of chocolate sponge soaked lightly in syrup, filled with tart cherry compote and crowned with whipped cream — a timeless German classic.'
where name = 'Black/White Forest' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Berries & Cream', base_price_cents = 90000,
  description = 'Soft sponge filled with your choice of strawberry, blueberry, raspberry, or blackberry compote, balanced with a vanilla cream for a berry delight.'
where name = 'Berries & Cream' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Refreshing Fruit Cake', base_price_cents = 90000,
  description = 'Refreshing sponge layered with vibrant seasonal fruits — juicy, colorful, and bursting with natural sweetness in every slice.'
where name = 'Refreshing Fruit' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Butterscotch with Praline', base_price_cents = 90000,
  description = 'Golden sponge layered with silky butterscotch cream and nut-free praline, delivering a smooth caramel sweetness with a delightful crunch.'
where name = 'Butterscotch Praline' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Coffee Cream', base_price_cents = 90000,
  description = 'Vanilla sponge soaked in coffee liqueur, layered with aromatic coffee cream — bold, refined, and perfect for lovers of a rich brew.'
where name = 'Coffee' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Chocolate Oreo Cake', base_price_cents = 90000,
  description = 'Soft chocolate sponge layered with a creamy frosting and crunchy Oreo pieces — a fun, chocolatey bite every time.'
where name = 'Choc & Oreo' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Chocolate Truffle Cake', base_price_cents = 96000,
  description = 'Rich, smooth chocolate cake filled with silky truffle — pure melt-in-your-mouth indulgence.'
where name = 'Choc Truffle' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Chocolate Raspberry Truffle', base_price_cents = 100000,
  description = 'Decadent chocolate truffle cake with a burst of raspberry — sweet meets tart in the most delicious way.'
where name = 'Choc Truffle Raspberry' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Nutty Chocolate Truffle', base_price_cents = 100000,
  description = 'Moist chocolate cake layered with rich ganache and roasted walnuts — nutty, fudgy perfection.'
where name = 'Nutty Truffle' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Tiramisu with Liqueur', base_price_cents = 106000,
  description = 'Coffee-soaked sponge with creamy mascarpone and a splash of liqueur — the classic Italian treat with a bold twist.'
where name = 'Tiramisu Alcohol' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

update public.menu_items set
  name = 'Chocolate Hazelnut Crunch', base_price_cents = 106000,
  description = 'Chocolate cake packed with roasted hazelnuts and Ferrero Rocher crunch — nutty, crispy, and irresistibly smooth.'
where name = 'Choc Hazelnut' and category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f';

-- 2. The two on the list with no existing row. Black Forest and White Forest
--    used to share one "Black/White Forest" row; the client now sells them as
--    separate cakes with separate descriptions.
insert into public.menu_items
  (category_id, name, description, base_price_cents, price_model, min_order_qty, is_active, sort_order)
select
  '8d72be46-ae84-41a2-917b-8e2dca4bfb8f',
  v.name, v.description, v.price, 'flat', 1, true, v.sort
from (values
  ('White Forest',
   'Fluffy vanilla sponge layered with cherry compote, finished with whipped cream and white chocolate shavings for a snowy, elegant twist.',
   90000, 5),
  ('White Chocolate Raspberry Mousse',
   'Light, fluffy white chocolate mousse topped with a raspberry compote — creamy, fruity, and oh-so refreshing.',
   100000, 13)
) as v(name, description, price, sort)
where not exists (
  select 1 from public.menu_items m
  where m.name = v.name and m.category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f'
);

-- 3. Hide what the client did not carry over. Reversible from admin.
update public.menu_items set is_active = false
where category_id = '8d72be46-ae84-41a2-917b-8e2dca4bfb8f'
  and name in ('Funfetti', 'Choconilla', 'Spiced Carrot CC', 'Sinful Choc Indulgence');

commit;
