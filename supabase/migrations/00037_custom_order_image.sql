-- Photograph for the homepage custom-order card.
--
-- The custom-order block is now the same photo card as the two menu cards, so
-- it needs the same thing they have: a picture the client chooses, rather than
-- one picked in the code. Same reasoning as 00036 — a gallery image is a
-- photograph of one particular bake, and using it to stand for "custom order"
-- makes a claim about what a custom order looks like.
--
-- Nullable. NULL falls back to a gallery photo via lib/menu/menu-photo.ts, so
-- the card is never blank and the client is never forced to set it.

alter table public.site_settings
  add column if not exists custom_order_image_url text;

comment on column public.site_settings.custom_order_image_url is
  'Photo on the homepage custom-order card. NULL falls back to a gallery photo.';
