-- ---------- CUSTOMER REVIEWS ----------
-- Backs the homepage review carousel and /admin/reviews.
--
-- Deliberately seeded with NOTHING. An earlier pass on this site removed
-- invented figures ("500+ Happy Customers", a 4.9 rating that contradicted the
-- 4.7 shown elsewhere on the same page) because fabricated numbers on a real
-- business's site are a liability rather than a design flourish. Fabricated
-- testimonials are the same problem with a customer's name attached to it, so
-- the table ships empty and the homepage section hides itself until Dee enters
-- real ones in the admin panel.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  body text not null,
  -- The item they ordered, shown as a quiet line under the name. Optional:
  -- plenty of reviews are about the service rather than one bake.
  item_name text,
  rating int not null default 5 check (rating between 1 and 5),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Matches idx_gallery_active: the homepage only ever reads active rows.
create index if not exists idx_reviews_active
  on public.reviews (is_active, sort_order)
  where is_active = true;

alter table public.reviews enable row level security;

-- Same shape as gallery_photos: world-readable when active, staff-writable.
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews
  for select using (is_active = true);

drop policy if exists "reviews_write_staff" on public.reviews;
create policy "reviews_write_staff" on public.reviews
  for all using (public.is_staff()) with check (public.is_staff());

-- Mirrors 00002_updated_at_triggers.sql for the other content tables.
drop trigger if exists set_updated_at_reviews on public.reviews;
create trigger set_updated_at_reviews
  before update on public.reviews
  for each row execute function public.set_updated_at();
