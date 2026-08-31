-- The client's Swiggy / daily menu, from savor_by_dee_swiggy_menu.xlsx.
--
-- Four categories on that sheet did not exist yet. The other four map onto
-- categories already here (Dessert -> Desserts, Cupcakes -> Cupcakes, Muffins
-- & Brownies, Tea Cakes, Frosted sponge cakes and pastries).
--
-- Seven products appear on both the sheet and in the existing catalogue under
-- different wording. Per the client: keep the LOWER price and the LONGER name.
-- Those rows are updated in place rather than duplicated, so order history and
-- any admin flags survive.
--
-- Every item on the sheet is flagged daily_menu; everything else is cleared,
-- because this sheet IS the daily menu.

begin;

-- 1. Categories the sheet needs that did not exist.
insert into public.categories (name, sort_order, is_active)
select 'All Day Breakfast Bakes', 7, true
where not exists (select 1 from public.categories where name = 'All Day Breakfast Bakes');
insert into public.categories (name, sort_order, is_active)
select 'Shortbread Cookies', 8, true
where not exists (select 1 from public.categories where name = 'Shortbread Cookies');
insert into public.categories (name, sort_order, is_active)
select 'Snacks', 9, true
where not exists (select 1 from public.categories where name = 'Snacks');
insert into public.categories (name, sort_order, is_active)
select 'Mini pizzas', 10, true
where not exists (select 1 from public.categories where name = 'Mini pizzas');

-- 2. The seven collisions: lower price, longer name, correct category.
update public.menu_items set
  name = 'Mini Marbled Swiss Rolls', base_price_cents = 4000,
  category_id = (select id from public.categories where name = 'All Day Breakfast Bakes'), daily_menu = true, is_active = true
where id = 'd1409995-fb8b-4457-87d2-30e3fba2808b';
update public.menu_items set
  name = 'Cinnamon Roll', base_price_cents = 5000,
  category_id = (select id from public.categories where name = 'All Day Breakfast Bakes'), daily_menu = true, is_active = true
where id = '4918d5ef-a981-4dea-97bb-2008ffc62496';
update public.menu_items set
  name = 'Berry Cream Cheese Buns', base_price_cents = 5000,
  category_id = (select id from public.categories where name = 'All Day Breakfast Bakes'), daily_menu = true, is_active = true
where id = '83cfb795-332e-4df5-9562-25105f10e518';
update public.menu_items set
  name = 'Lamingtons', base_price_cents = 4000,
  category_id = (select id from public.categories where name = 'All Day Breakfast Bakes'), daily_menu = true, is_active = true
where id = '0b7744c2-c847-4c05-a214-16455b2c7e28';
update public.menu_items set
  name = 'Chicken Kheema Buns', base_price_cents = 4000,
  category_id = (select id from public.categories where name = 'Snacks'), daily_menu = true, is_active = true
where id = '4cc007a4-621a-418f-ba01-05fdd0aa472a';
update public.menu_items set
  name = 'Korean Buns', base_price_cents = 9000,
  category_id = (select id from public.categories where name = 'Snacks'), daily_menu = true, is_active = true
where id = '76d1dafe-a896-44e1-b718-9c02c7aaee9f';
update public.menu_items set
  name = 'Gooey Brownies With A Rocky Ganache Top', base_price_cents = 6000,
  category_id = 'd6a54393-3975-4614-bb3b-059529de9d03', daily_menu = true, is_active = true
where id = '39792f26-c955-418a-a724-023ef67bcec2';

-- 3. The 38 items on the sheet with no existing row.
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Chocochunks 100gms', 11000, 'flat', 1, true, true, 0
where not exists (select 1 from public.menu_items where name = 'Chocochunks 100gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Cashew Cookies 100gms', 13000, 'flat', 1, true, true, 1
where not exists (select 1 from public.menu_items where name = 'Cashew Cookies 100gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Coconut Cookies 100gms', 11000, 'flat', 1, true, true, 2
where not exists (select 1 from public.menu_items where name = 'Coconut Cookies 100gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Linzer Cookies 100 Gms', 13000, 'flat', 1, true, true, 3
where not exists (select 1 from public.menu_items where name = 'Linzer Cookies 100 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Chocodip Cookies 100gms', 11000, 'flat', 1, true, true, 4
where not exists (select 1 from public.menu_items where name = 'Chocodip Cookies 100gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Jam Drop Cookies 100 Gms', 11000, 'flat', 1, true, true, 5
where not exists (select 1 from public.menu_items where name = 'Jam Drop Cookies 100 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Unicorn Shortbread Cookies : 100gms', 13000, 'flat', 1, true, true, 6
where not exists (select 1 from public.menu_items where name = 'Unicorn Shortbread Cookies : 100gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Plain Shortbread Cookies 100gms', 9000, 'flat', 1, true, true, 7
where not exists (select 1 from public.menu_items where name = 'Plain Shortbread Cookies 100gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Transport Shortbread Cookies', 11000, 'flat', 1, true, true, 8
where not exists (select 1 from public.menu_items where name = 'Transport Shortbread Cookies');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Paw Patrol Plain Shortbread', 11000, 'flat', 1, true, true, 9
where not exists (select 1 from public.menu_items where name = 'Paw Patrol Plain Shortbread');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Peppa Pig Plain Shortbread Cookies', 11000, 'flat', 1, true, true, 10
where not exists (select 1 from public.menu_items where name = 'Peppa Pig Plain Shortbread Cookies');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Shortbread Cookies'), 'Super Hero Plain Shortbread Cookies', 11000, 'flat', 1, true, true, 11
where not exists (select 1 from public.menu_items where name = 'Super Hero Plain Shortbread Cookies');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8d72be46-ae84-41a2-917b-8e2dca4bfb8f', 'Blueberry Cake 500 Gms', 88000, 'flat', 1, true, true, 12
where not exists (select 1 from public.menu_items where name = 'Blueberry Cake 500 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8d72be46-ae84-41a2-917b-8e2dca4bfb8f', 'Chocolate Mousse Cake 500 Gms', 88000, 'flat', 1, true, true, 13
where not exists (select 1 from public.menu_items where name = 'Chocolate Mousse Cake 500 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8d72be46-ae84-41a2-917b-8e2dca4bfb8f', 'Chocolate Bento Cake 250 Gms', 46000, 'flat', 1, true, true, 14
where not exists (select 1 from public.menu_items where name = 'Chocolate Bento Cake 250 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8d72be46-ae84-41a2-917b-8e2dca4bfb8f', 'Blueberry Bento Cake 250gms', 46000, 'flat', 1, true, true, 15
where not exists (select 1 from public.menu_items where name = 'Blueberry Bento Cake 250gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8d72be46-ae84-41a2-917b-8e2dca4bfb8f', 'Coffee Cake 500Gms', 88000, 'flat', 1, true, true, 16
where not exists (select 1 from public.menu_items where name = 'Coffee Cake 500Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8d72be46-ae84-41a2-917b-8e2dca4bfb8f', 'Coffee Bento 250Gms', 46000, 'flat', 1, true, true, 17
where not exists (select 1 from public.menu_items where name = 'Coffee Bento 250Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8e7612e3-2cc7-4a47-8354-f3d9d679ee73', 'Banana And Walnut Mini Tea Loaf 250 Gms', 22000, 'flat', 1, true, true, 18
where not exists (select 1 from public.menu_items where name = 'Banana And Walnut Mini Tea Loaf 250 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '8e7612e3-2cc7-4a47-8354-f3d9d679ee73', 'Chocolate Mini Tea Loaf 250 Gms', 22000, 'flat', 1, true, true, 19
where not exists (select 1 from public.menu_items where name = 'Chocolate Mini Tea Loaf 250 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Snacks'), 'Chicken Quiche', 6000, 'flat', 1, true, true, 20
where not exists (select 1 from public.menu_items where name = 'Chicken Quiche');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Snacks'), 'Chicken Puff Pastry', 5000, 'flat', 1, true, true, 21
where not exists (select 1 from public.menu_items where name = 'Chicken Puff Pastry');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'Tiramisu Cake Jar', 15000, 'flat', 1, true, true, 22
where not exists (select 1 from public.menu_items where name = 'Tiramisu Cake Jar');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'Death By Chocolate Cake Jar', 15000, 'flat', 1, true, true, 23
where not exists (select 1 from public.menu_items where name = 'Death By Chocolate Cake Jar');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'Fudge Walnut Brownie', 8000, 'flat', 1, true, true, 24
where not exists (select 1 from public.menu_items where name = 'Fudge Walnut Brownie');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'New York Baked Cheesecake: Raspberry', 17500, 'flat', 1, true, true, 25
where not exists (select 1 from public.menu_items where name = 'New York Baked Cheesecake: Raspberry');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'New York Baked Cheesecake: Blueberry', 17500, 'flat', 1, true, true, 26
where not exists (select 1 from public.menu_items where name = 'New York Baked Cheesecake: Blueberry');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'Cloud Cake 100 Gms', 16000, 'flat', 1, true, true, 27
where not exists (select 1 from public.menu_items where name = 'Cloud Cake 100 Gms');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select 'd6a54393-3975-4614-bb3b-059529de9d03', 'New York Baked Cheesecake Plain :1 Slice', 16000, 'flat', 1, true, true, 28
where not exists (select 1 from public.menu_items where name = 'New York Baked Cheesecake Plain :1 Slice');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '91d1a0b4-30a5-48e3-b4e7-76f118c0db28', 'Red Velvet Cupcake Box Of 4', 25000, 'flat', 1, true, true, 29
where not exists (select 1 from public.menu_items where name = 'Red Velvet Cupcake Box Of 4');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '91d1a0b4-30a5-48e3-b4e7-76f118c0db28', 'Assorted Cupcake Box Of 6', 35500, 'flat', 1, true, true, 30
where not exists (select 1 from public.menu_items where name = 'Assorted Cupcake Box Of 6');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '91d1a0b4-30a5-48e3-b4e7-76f118c0db28', 'Vanilla Blueberry Cupcakes Box Of 4', 25000, 'flat', 1, true, true, 31
where not exists (select 1 from public.menu_items where name = 'Vanilla Blueberry Cupcakes Box Of 4');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '91d1a0b4-30a5-48e3-b4e7-76f118c0db28', 'Assorted Cupcakes Box Of 4', 25000, 'flat', 1, true, true, 32
where not exists (select 1 from public.menu_items where name = 'Assorted Cupcakes Box Of 4');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select '91d1a0b4-30a5-48e3-b4e7-76f118c0db28', 'Chocolate Cupcake Box Of 4', 25000, 'flat', 1, true, true, 33
where not exists (select 1 from public.menu_items where name = 'Chocolate Cupcake Box Of 4');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Mini pizzas'), 'Chicken Tikka Pizza', 7000, 'flat', 1, true, true, 34
where not exists (select 1 from public.menu_items where name = 'Chicken Tikka Pizza');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Mini pizzas'), 'Veg Mini Pizza', 6000, 'flat', 1, true, true, 35
where not exists (select 1 from public.menu_items where name = 'Veg Mini Pizza');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Mini pizzas'), 'Chicken Pizza', 7000, 'flat', 1, true, true, 36
where not exists (select 1 from public.menu_items where name = 'Chicken Pizza');
insert into public.menu_items
  (category_id, name, base_price_cents, price_model, min_order_qty, is_active, daily_menu, sort_order)
select (select id from public.categories where name = 'Mini pizzas'), 'Pork Sausage Mini Pizza', 7000, 'flat', 1, true, true, 37
where not exists (select 1 from public.menu_items where name = 'Pork Sausage Mini Pizza');

-- 4. Nothing outside the sheet is on the daily menu.
update public.menu_items set daily_menu = false
where name not in (
  'Assorted Cupcake Box Of 6',
  'Assorted Cupcakes Box Of 4',
  'Banana And Walnut Mini Tea Loaf 250 Gms',
  'Berry Cheesecake Buns',
  'Berry Cream Cheese Buns',
  'Blueberry Bento Cake 250gms',
  'Blueberry Cake 500 Gms',
  'Cashew Cookies 100gms',
  'Chicken Kheema Buns',
  'Chicken Pizza',
  'Chicken Puff Pastry',
  'Chicken Quiche',
  'Chicken Tikka Pizza',
  'Chocochunks 100gms',
  'Chocodip Cookies 100gms',
  'Chocolate Bento Cake 250 Gms',
  'Chocolate Cupcake Box Of 4',
  'Chocolate Mini Tea Loaf 250 Gms',
  'Chocolate Mousse Cake 500 Gms',
  'Cinnamon Roll',
  'Cloud Cake 100 Gms',
  'Coconut Cookies 100gms',
  'Coffee Bento 250Gms',
  'Coffee Cake 500Gms',
  'Death By Chocolate Cake Jar',
  'Fudge Walnut Brownie',
  'Gooey Brownies With A Rocky Ganache Top',
  'Jam Drop Cookies 100 Gms',
  'Korean Buns',
  'Lamington',
  'Lamingtons',
  'Linzer Cookies 100 Gms',
  'Mini Marble Swiss Rolls',
  'Mini Marbled Swiss Rolls',
  'New York Baked Cheesecake Plain :1 Slice',
  'New York Baked Cheesecake: Blueberry',
  'New York Baked Cheesecake: Raspberry',
  'Paw Patrol Plain Shortbread',
  'Peppa Pig Plain Shortbread Cookies',
  'Plain Shortbread Cookies 100gms',
  'Pork Sausage Mini Pizza',
  'Red Velvet Cupcake Box Of 4',
  'Super Hero Plain Shortbread Cookies',
  'Tiramisu Cake Jar',
  'Transport Shortbread Cookies',
  'Unicorn Shortbread Cookies : 100gms',
  'Vanilla Blueberry Cupcakes Box Of 4',
  'Veg Mini Pizza'
);

commit;