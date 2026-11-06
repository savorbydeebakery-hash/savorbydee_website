-- Gallery folders Dee can add, rename, reorder and delete herself (client, 2026-11-06).
--
-- They were a fixed list in lib/gallery/folders.ts. That list is the starting set here,
-- in the same order, so nothing changes on the site until she edits them.
--
-- gallery_photos.folder now points at this table. Deleting a folder sets its photos
-- back to "not in a folder" in the database itself, so a photo can't be lost or left
-- pointing at a folder that no longer exists.

create table if not exists public.gallery_folders (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists gallery_folders_label_unique on public.gallery_folders (lower(btrim(label)));

alter table public.gallery_folders enable row level security;

drop policy if exists "gallery_folders_read" on public.gallery_folders;
create policy "gallery_folders_read" on public.gallery_folders
  for select using (true);

-- The same as gallery_photos: admins only (migration 00048).
drop policy if exists "gallery_folders_write_admin" on public.gallery_folders;
create policy "gallery_folders_write_admin" on public.gallery_folders
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.gallery_folders (slug, label, sort_order) values
  ('wedding', 'Wedding Cakes', 1),
  ('kids', 'Kids Cakes', 2),
  ('pg18', 'PG18 Cakes', 3),
  ('floral', 'Floral Cakes', 4),
  ('3d', '3D Cakes', 5),
  ('custom-donuts', 'Custom Donuts', 6),
  ('custom-cookies', 'Custom Cookies', 7),
  ('adult', 'Adult Cakes', 8)
on conflict (slug) do nothing;

-- Anything filed under a folder that isn't in the table goes back to not filed, so the
-- link below can be added.
update public.gallery_photos
set folder = null
where folder is not null and folder not in (select slug from public.gallery_folders);

alter table public.gallery_photos drop constraint if exists gallery_photos_folder_fkey;
alter table public.gallery_photos
  add constraint gallery_photos_folder_fkey
  foreign key (folder) references public.gallery_folders (slug)
  on update cascade on delete set null;
