-- ============================================================
-- SAVOR Bakery — 00002_updated_at_triggers.sql
-- Generic updated_at trigger for all tables with updated_at column
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_categories
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger set_updated_at_menu_items
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create trigger set_updated_at_site_settings
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger set_updated_at_promo_banners
  before update on public.promo_banners
  for each row execute function public.set_updated_at();

create trigger set_updated_at_gallery_photos
  before update on public.gallery_photos
  for each row execute function public.set_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger set_updated_at_custom_cake_inquiries
  before update on public.custom_cake_inquiries
  for each row execute function public.set_updated_at();