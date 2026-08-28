-- 00011_seed_images.sql
-- Add curated bakery images to menu items + populate gallery for the
-- scattered-image "professional feel". Uses Unsplash source URLs.
-- ALL hotlinked (no binary upload). Revertable: set image_url = null.

begin;

-- ---------- GALLERY (8 photos for the homepage marquee + scattered strip) ----------
insert into public.gallery_photos (image_url, caption, sort_order, is_active)
select * from (values
  ('https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop', 'Chocolate celebration cake', 1, true),
  ('https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80&auto=format&fit=crop', 'Freshly baked chocolate cake', 2, true),
  ('https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80&auto=format&fit=crop', 'Assorted cupcakes', 3, true),
  ('https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=800&q=80&auto=format&fit=crop', 'Cupcake with frosting', 4, true),
  ('https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80&auto=format&fit=crop', 'Brownies', 5, true),
  ('https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&q=80&auto=format&fit=crop', 'Layered cake slice', 6, true),
  ('https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80&auto=format&fit=crop', 'Artisan pastries', 7, true),
  ('https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80&auto=format&fit=crop', 'Dessert cups', 8, true)
) as v(image_url, caption, sort_order, is_active)
where not exists (select 1 from public.gallery_photos where image_url = v.image_url);

-- ---------- MENU ITEM IMAGES ----------
-- Tea Cakes (loaf/cake slices)
update public.menu_items set image_url = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80&auto=format&fit=crop'
  where category_id = (select id from public.categories where name = 'Tea Cakes') and image_url is null;

-- Cheesecakes
update public.menu_items set image_url = 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80&auto=format&fit=crop'
  where category_id = (select id from public.categories where name = 'Cheesecakes') and image_url is null;

-- Cupcakes, Muffins & Brownies
update public.menu_items set image_url = 'https://images.unsplash.com/photo-1587248720327-8eb72564be1e?w=800&q=80&auto=format&fit=crop'
  where category_id = (select id from public.categories where name = 'Cupcakes, Muffins & Brownies') and image_url is null;

-- High Tea Nibbles (savoury sandwiches/buns)
update public.menu_items set image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80&auto=format&fit=crop'
  where category_id = (select id from public.categories where name = 'High Tea Nibbles') and image_url is null;

-- Desserts (cups/puddings)
update public.menu_items set image_url = 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80&auto=format&fit=crop'
  where category_id = (select id from public.categories where name = 'Desserts') and image_url is null;

-- Frosted Sponge Cakes (whole layer cakes)
update public.menu_items set image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&auto=format&fit=crop'
  where category_id = (select id from public.categories where name = 'Frosted Sponge Cakes') and image_url is null;

commit;