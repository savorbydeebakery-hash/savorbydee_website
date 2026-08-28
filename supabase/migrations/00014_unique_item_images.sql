
-- 00014_unique_item_images.sql — one unique image per curated homepage item.
begin;

-- Clear the shared placeholder photos assigned earlier (they were reused).
update public.menu_items set image_url = null
  where image_url is not null
    and (daily_menu or is_chefs_choice or is_bestseller or is_special);

-- Assign a distinct photo to every curated item (disambiguated by category).
update public.menu_items m
set image_url = v.url
from (values
('Banana Honey & Oatmeal', (select id from public.categories where name = 'Tea Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/banana-bread.jpg'),
('Blueberry Cupcake', (select id from public.categories where name = 'Cupcakes, Muffins & Brownies'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/cupcake2.jpg'),
('Carrot', (select id from public.categories where name = 'Tea Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/carrot-cake.jpg'),
('Choc Truffle', (select id from public.categories where name = 'Frosted Sponge Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/choc-cake.jpg'),
('Chocolate', (select id from public.categories where name = 'Tea Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/choc-cake2.jpg'),
('Chocolate', (select id from public.categories where name = 'Frosted Sponge Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/choc-cake3.jpg'),
('Chocolate Cupcake', (select id from public.categories where name = 'Cupcakes, Muffins & Brownies'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/cupcake.jpg'),
('Classic NY Baked', (select id from public.categories where name = 'Cheesecakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/cheesecake.jpg'),
('Cold Cheesecake Cup', (select id from public.categories where name = 'Desserts'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/dessert-cup.jpg'),
('Gooey Brownies', (select id from public.categories where name = 'Cupcakes, Muffins & Brownies'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/brownie.jpg'),
('Plain Vanilla', (select id from public.categories where name = 'Tea Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/vanilla-cake.jpg'),
('Rich Fruit Cake (rum)', (select id from public.categories where name = 'Tea Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/fruit-cake.jpg'),
('Thai Mango Pudding', (select id from public.categories where name = 'Desserts'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/pudding.jpg'),
('Tiramisu Tub', (select id from public.categories where name = 'Desserts'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/tiramisu.jpg'),
('Triple Layer Chocolate', (select id from public.categories where name = 'Cheesecakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/layer-cake.jpg'),
('Vanilla Cupcake', (select id from public.categories where name = 'Cupcakes, Muffins & Brownies'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/vanilla-cup.jpg'),
('Very Berry', (select id from public.categories where name = 'Tea Cakes'), 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/berry-cake.jpg')
) as v(name, category_id, url)
where m.name = v.name and m.category_id = v.category_id;

commit;
