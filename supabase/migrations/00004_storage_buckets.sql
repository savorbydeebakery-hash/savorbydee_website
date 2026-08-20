-- ============================================================
-- SAVOR Bakery — 00004_storage_buckets.sql
-- Storage buckets + policies
-- ============================================================

-- ---------- BUCKETS ----------
insert into storage.buckets (id, name, public)
values
  ('menu-items', 'menu-items', true),
  ('gallery', 'gallery', true),
  ('promo-banners', 'promo-banners', true),
  ('site-assets', 'site-assets', true),
  ('custom-cake-refs', 'custom-cake-refs', false)
on conflict (id) do nothing;

-- ---------- PUBLIC BUCKETS: public read ----------
create policy "menu_items_public_read" on storage.objects
  for select using (bucket_id = 'menu-items');

create policy "gallery_public_read" on storage.objects
  for select using (bucket_id = 'gallery');

create policy "promo_banners_public_read" on storage.objects
  for select using (bucket_id = 'promo-banners');

create policy "site_assets_public_read" on storage.objects
  for select using (bucket_id = 'site-assets');

-- ---------- PRIVATE BUCKET: staff-only read ----------
create policy "custom_cake_refs_staff_read" on storage.objects
  for select using (
    bucket_id = 'custom-cake-refs' and public.is_staff()
  );

-- ---------- WRITE: staff only (all buckets) ----------
create policy "staff_write_menu_items" on storage.objects
  for insert to authenticated
  using (bucket_id = 'menu-items' and public.is_staff())
  with check (bucket_id = 'menu-items' and public.is_staff());

create policy "staff_write_gallery" on storage.objects
  for insert to authenticated
  using (bucket_id = 'gallery' and public.is_staff())
  with check (bucket_id = 'gallery' and public.is_staff());

create policy "staff_write_promo_banners" on storage.objects
  for insert to authenticated
  using (bucket_id = 'promo-banners' and public.is_staff())
  with check (bucket_id = 'promo-banners' and public.is_staff());

create policy "staff_write_site_assets" on storage.objects
  for insert to authenticated
  using (bucket_id = 'site-assets' and public.is_staff())
  with check (bucket_id = 'site-assets' and public.is_staff());

create policy "staff_write_custom_cake_refs" on storage.objects
  for insert to authenticated
  using (bucket_id = 'custom-cake-refs' and public.is_staff())
  with check (bucket_id = 'custom-cake-refs' and public.is_staff());

-- ---------- UPDATE / DELETE: staff only ----------
create policy "staff_update_objects" on storage.objects
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "staff_delete_objects" on storage.objects
  for delete to authenticated
  using (public.is_staff());