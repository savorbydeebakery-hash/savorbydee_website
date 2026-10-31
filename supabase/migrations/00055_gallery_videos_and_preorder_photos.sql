-- Two Settings/Admin additions from the client's list (2026-10-31).

-- 1. Show photos on Preorder Menu items? Off for now: only 22 of 79 have a
--    photo. Today's Menu always shows its photos. lib/menu/photos.ts; the code
--    treats a missing column as off.
alter table public.site_settings
  add column if not exists show_preorder_photos boolean not null default false;

comment on column public.site_settings.show_preorder_photos is
  'Show item photos on the Preorder Menu. Off until there is a photo for every preorder item.';

-- 2. Gallery videos as YouTube links (usually unlisted). The video lives on
--    YouTube, so it costs no storage and streams at whatever quality the
--    viewer's connection can take. A row is either a photo or a video.
alter table public.gallery_photos
  add column if not exists youtube_id text;

alter table public.gallery_photos
  alter column image_url drop not null;

alter table public.gallery_photos
  drop constraint if exists gallery_photos_photo_or_video;
alter table public.gallery_photos
  add constraint gallery_photos_photo_or_video
  check (image_url is not null or youtube_id ~ '^[A-Za-z0-9_-]{11}$');

comment on column public.gallery_photos.youtube_id is
  'YouTube video id (11 characters) for a gallery video; image_url is null for these.';
