-- Instagram and Facebook URLs as settings.
--
-- The footer hardcoded all three social links. WhatsApp did not need a
-- migration — whatsapp_number was already a setting that /about and
-- /policies/contact read, while the footer carried a second frozen copy of
-- the number, so changing it in admin updated two places out of three. That
-- half is fixed already.
--
-- These two have no column anywhere, so they need this before the admin
-- fields can exist. NOT applied yet: the admin settings page saves with a
-- single update() over every column it selected, so adding these fields to
-- that form before the columns exist would break saving settings entirely.
-- Apply this first, then wire the form.

alter table public.site_settings
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;

comment on column public.site_settings.instagram_url is
  'Full profile URL. Empty hides the icon from the footer.';
comment on column public.site_settings.facebook_url is
  'Full profile URL. Empty hides the icon from the footer.';

update public.site_settings
set instagram_url = coalesce(instagram_url, 'https://www.instagram.com/savorbydee'),
    facebook_url  = coalesce(facebook_url,  'https://www.facebook.com/savorbydee')
where id = 1;
