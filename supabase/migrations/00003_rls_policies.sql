-- ============================================================
-- SAVOR Bakery — 00003_rls_policies.sql
-- Row Level Security: enable on all tables + granular policies
-- ============================================================

-- ---------- ENABLE RLS ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.promo_banners enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.custom_cake_inquiries enable row level security;

-- ---------- HELPER: is_staff() ----------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('staff', 'admin')
  );
$$;

-- ---------- HELPER: is_admin() ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================
-- Users can read their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Staff can read all profiles (needed for order assignment, account mgmt)
create policy "profiles_select_staff" on public.profiles
  for select using (public.is_staff());

-- Users can update their own profile (but NOT their role)
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (role = (select role from public.profiles where id = auth.uid()))
  );

-- Admins can update any profile (role changes, staff management)
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ============================================================
-- CATEGORIES / MENU ITEMS / GALLERY / BANNERS / SETTINGS
-- ============================================================
-- Public read for active content
create policy "categories_select_public" on public.categories
  for select using (is_active = true);

create policy "menu_items_select_public" on public.menu_items
  for select using (is_active = true);

create policy "gallery_select_public" on public.gallery_photos
  for select using (is_active = true);

create policy "banners_select_public" on public.promo_banners
  for select using (is_active = true);

create policy "settings_select_public" on public.site_settings
  for select using (true);

-- Staff write access
create policy "categories_write_staff" on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

create policy "menu_items_write_staff" on public.menu_items
  for all using (public.is_staff()) with check (public.is_staff());

create policy "gallery_write_staff" on public.gallery_photos
  for all using (public.is_staff()) with check (public.is_staff());

create policy "banners_write_staff" on public.promo_banners
  for all using (public.is_staff()) with check (public.is_staff());

create policy "settings_write_staff" on public.site_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- ORDERS
-- ============================================================
-- Customers can read their own orders
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = customer_id);

-- Staff can read all orders
create policy "orders_select_staff" on public.orders
  for select using (public.is_staff());

-- Customers can create orders (guest orders are created via service role)
create policy "orders_insert_own" on public.orders
  for insert with check (
    auth.uid() = customer_id
    or customer_id is null
  );

-- Customers can update their own orders (cancel before confirmation)
create policy "orders_update_own" on public.orders
  for update using (auth.uid() = customer_id)
  with check (
    auth.uid() = customer_id
    and status in ('pending', 'cancelled')
  );

-- Staff can update all orders
create policy "orders_update_staff" on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- ORDER ITEMS
-- ============================================================
-- Customers can read items of their own orders
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

-- Staff can read all order items
create policy "order_items_select_staff" on public.order_items
  for select using (public.is_staff());

-- Insert allowed for own orders or guest (service role)
create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or o.customer_id is null)
    )
  );

-- ============================================================
-- CUSTOM CAKE INQUIRIES
-- ============================================================
-- Anyone can submit an inquiry
create policy "inquiries_insert_public" on public.custom_cake_inquiries
  for insert with check (true);

-- Staff can read/update all inquiries
create policy "inquiries_select_staff" on public.custom_cake_inquiries
  for select using (public.is_staff());

create policy "inquiries_update_staff" on public.custom_cake_inquiries
  for update using (public.is_staff()) with check (public.is_staff());