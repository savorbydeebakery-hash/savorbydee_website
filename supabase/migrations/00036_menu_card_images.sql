-- Photographs for the two menu cards on the homepage.
--
-- The homepage now leads with two large tappable cards, one per menu, instead
-- of a tab strip over a grid of item tiles. Each card is a gallery photograph.
--
-- These are settings rather than a hardcoded choice because every gallery
-- image is a photograph of one particular bake, so whichever one stands for a
-- whole menu is making a claim about that menu. A tier cake fronting the
-- preorder menu suggests the preorder menu is tier cakes, when it is mostly
-- tea cakes and cheesecakes. The client is the one who knows which photograph
-- is fair.
--
-- Both are nullable. Null means "pick a sensible gallery photo", which
-- lib/menu/menu-photo.ts does, so the page is never blank and the client is
-- never forced to set them before launch.

alter table public.site_settings
  add column if not exists daily_menu_image_url text,
  add column if not exists preorder_menu_image_url text;

comment on column public.site_settings.daily_menu_image_url is
  'Photo on the homepage card for today''s menu. NULL falls back to a gallery photo.';
comment on column public.site_settings.preorder_menu_image_url is
  'Photo on the homepage card for the preorder menu. NULL falls back to a gallery photo.';
