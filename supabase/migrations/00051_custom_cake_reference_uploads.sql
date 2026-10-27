-- Customers can attach a reference photo to a custom cake request (2026-10-27).
--
-- The custom-cake-refs bucket only let staff upload, so the photo box on the
-- public Custom Cake form failed for every customer with a row-level security
-- error, and no request ever arrived with a photo. Uploading is now open to
-- anyone; reading stays admin-only (00048), and the bucket stays private.
--
-- Limited to images of 5 MB, so the open upload can't be used to store
-- anything else or fill the project's storage.

drop policy if exists "staff_write_custom_cake_refs" on storage.objects;
create policy "anyone_upload_custom_cake_refs" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'custom-cake-refs');

update storage.buckets
  set file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  where id = 'custom-cake-refs';
