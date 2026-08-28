
-- 00013_seed_item_images.sql — assign real bakery photos to curated homepage items.
update public.menu_items m
set image_url = v.url
from (values
('Banana Honey & Oatmeal', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake3.jpg'),
('Blueberry Cupcake', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-food.jpg'),
('Carrot', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake3.jpg'),
('Choc Truffle', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake.jpg'),
('Chocolate', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake2.jpg'),
('Chocolate Cupcake', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-food.jpg'),
('Classic NY Baked', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/menu-items/savor-zomato-cover.jpg'),
('Cold Cheesecake Cup', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-dessert.jpg'),
('Gooey Brownies', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-food.jpg'),
('Plain Vanilla', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake3.jpg'),
('Rich Fruit Cake (rum)', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake.jpg'),
('Thai Mango Pudding', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-dessert.jpg'),
('Tiramisu Tub', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-dessert.jpg'),
('Triple Layer Chocolate', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake2.jpg'),
('Vanilla Cupcake', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-food.jpg'),
('Very Berry', 'https://tkzbroymiyvnigqxcpze.supabase.co/storage/v1/object/public/gallery/savor-cake2.jpg')
) as v(name, url)
where m.name = v.name and m.image_url is null;
