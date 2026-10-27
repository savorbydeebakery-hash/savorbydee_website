-- Promo Banners, Gallery, Behind the Scenes, Reviews and Settings become
-- admin-only (client's decision, 2026-10-27), like Custom Cakes in 00047.
--
-- Staff keep what the shop runs on day to day: Orders, Today's Stock, Menu
-- Items, Categories, Customers and their own account. The website still reads
-- all of this content publicly; only changing it is restricted.

-- ---------- tables: writes become admin-only ----------
drop policy if exists "banners_write_staff" on public.promo_banners;
create policy "banners_write_admin" on public.promo_banners
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gallery_write_staff" on public.gallery_photos;
create policy "gallery_write_admin" on public.gallery_photos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bts_write_staff" on public.behind_the_scenes;
create policy "bts_write_admin" on public.behind_the_scenes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reviews_write_staff" on public.reviews;
create policy "reviews_write_admin" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_write_staff" on public.site_settings;
create policy "settings_write_admin" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- photo storage ----------
-- Uploading to the gallery, banner and site-asset buckets becomes admin-only.
-- Menu-item photos stay with staff, who still edit Menu Items.
drop policy if exists "staff_write_gallery" on storage.objects;
create policy "admin_write_gallery" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "staff_write_promo_banners" on storage.objects;
create policy "admin_write_promo_banners" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'promo-banners' and public.is_admin());

drop policy if exists "staff_write_site_assets" on storage.objects;
create policy "admin_write_site_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets' and public.is_admin());

-- Replacing and deleting used one rule for every bucket. Split it so staff
-- keep menu-item photos and everything else needs an admin.
drop policy if exists "staff_update_objects" on storage.objects;
drop policy if exists "staff_delete_objects" on storage.objects;

create policy "staff_update_menu_item_photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-items' and public.is_staff())
  with check (bucket_id = 'menu-items' and public.is_staff());

create policy "staff_delete_menu_item_photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-items' and public.is_staff());

create policy "admin_update_objects" on storage.objects
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admin_delete_objects" on storage.objects
  for delete to authenticated
  using (public.is_admin());

-- Custom cake reference photos follow the custom cakes themselves (00047).
drop policy if exists "custom_cake_refs_staff_read" on storage.objects;
create policy "custom_cake_refs_admin_read" on storage.objects
  for select using (bucket_id = 'custom-cake-refs' and public.is_admin());
