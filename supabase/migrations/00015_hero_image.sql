-- Migration 00015: Add hero_image_url to site_settings
-- Admin panel will store the hero section background image URL here.
-- Falls back to the default Korean cafe-exterior shot when NULL.

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS hero_image_url text;

COMMENT ON COLUMN public.site_settings.hero_image_url
IS 'URL of the hero section background image. NULL = use default bakery photo.';

-- Set to NULL (use default) for the existing row
UPDATE public.site_settings SET hero_image_url = NULL WHERE id = 1;