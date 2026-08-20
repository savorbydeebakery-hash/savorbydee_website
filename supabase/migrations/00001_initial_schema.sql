-- ============================================================
-- SAVOR Bakery — 00001_initial_schema.sql
-- Full database schema: enums, tables, indexes, constraints
-- ============================================================

-- ---------- ENUMS ----------
create type public.user_role as enum ('customer', 'staff', 'admin');
create type public.price_model as enum ('flat', 'weight_tiers', 'base_half_kg');
create type public.order_kind as enum ('standard', 'custom_inquiry', 'custom_full');
create type public.order_status as enum ('pending', 'confirmed', 'paid', 'in_progress', 'ready', 'fulfilled', 'cancelled');
create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.payment_method as enum ('razorpay', 'upi_manual', 'cash_on_pickup');
create type public.banner_position as enum ('homepage_hero', 'menu_top', 'site_wide_strip');
create type public.inquiry_status as enum ('submitted', 'reviewed', 'quoted', 'confirmed', 'declined');

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CATEGORIES ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MENU ITEMS ----------
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text,
  base_price_cents int not null default 0 check (base_price_cents >= 0),
  price_model public.price_model not null default 'flat',
  -- weight_tiers: [{label: '½kg', price: 100000}, {label: '1kg', price: 200000}]
  price_options jsonb not null default '[]'::jsonb,
  -- addons: [{name: 'Lotus Biscoff', price: 5000, is_active: true}]
  addons jsonb not null default '[]'::jsonb,
  -- variants: [{name: 'Lemon Curd & Blueberry', price_delta: 0}]
  variants jsonb not null default '[]'::jsonb,
  -- decoration_tiers: [{label: 'Basic', price_delta: 0}, {label: 'Premium', price_delta: 5000}]
  decoration_tiers jsonb not null default '[]'::jsonb,
  -- size_options: [{label: '½kg', price_delta: 0}, {label: '1kg', price_delta: 10000}]
  size_options jsonb not null default '[]'::jsonb,
  min_order_qty int not null default 1 check (min_order_qty >= 1),
  dietary_tags text[] not null default '{}'::text[],
  image_url text,
  is_sold_out boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  requires_custom_notice boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SITE SETTINGS (singleton id=1) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  bakery_name text not null default 'SAVOR',
  about_narrative text not null default '',
  contact_email text,
  contact_phone text,
  whatsapp_number text not null default '919836537447',
  address_line1 text,
  address_line2 text,
  address_city text,
  address_state text,
  google_maps_embed_url text,
  google_maps_directions_url text,
  footer_text text,
  terms_url text,
  refund_policy_url text,
  privacy_policy_url text,
  -- notice rules
  global_notice_hours int not null default 12,
  bulk_threshold int not null default 10,
  bulk_notice_hours int not null default 24,
  custom_cake_notice_days int not null default 5,
  -- operating hours: {monday: {open: true, from: '09:00', to: '18:00'}, ...}
  weekly_hours jsonb not null default '{}'::jsonb,
  holidays date[] not null default '{}'::date[],
  -- delivery config
  delivery_enabled boolean not null default true,
  delivery_instructions text,
  -- payment config
  razorpay_active boolean not null default false,
  kyc_pending_mode boolean not null default true,
  upi_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed the singleton row with defaults
insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

-- ---------- PROMO BANNERS ----------
create table public.promo_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_text text,
  cta_text text,
  cta_link text,
  poster_image_url text,
  position public.banner_position not null default 'homepage_hero',
  start_date timestamptz not null default now(),
  end_date timestamptz,
  is_dismissible boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- GALLERY PHOTOS ----------
create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  human_id text unique not null,
  customer_id uuid references public.profiles (id) on delete set null,
  kind public.order_kind not null default 'standard',
  status public.order_status not null default 'pending',
  fulfillment public.fulfillment_type not null default 'pickup',
  -- guest fields
  guest_name text,
  guest_email text,
  guest_phone text,
  -- delivery fields
  delivery_address text,
  delivery_landmark text,
  -- slot
  requested_slot timestamptz not null,
  -- payment fields
  payment_status public.payment_status not null default 'unpaid',
  payment_method public.payment_method,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  -- totals
  total_cents int not null check (total_cents >= 0),
  -- custom cake fields
  custom_cake_quote_cents int,
  custom_cake_details jsonb,
  -- ack / email tracking
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles (id) on delete set null,
  staff_email_sent_at timestamptz,
  email_status text,
  -- notes
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ORDER ITEMS ----------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity >= 1),
  -- selections: {size: '1kg', variant: '...', addons: [...], decoration: 'Premium'}
  selections jsonb not null default '{}'::jsonb,
  line_total_cents int not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

-- ---------- CUSTOM CAKE INQUIRIES ----------
create table public.custom_cake_inquiries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  cake_type text not null, -- 'configured' | 'fully_custom'
  flavor text,
  weight text,
  decoration text,
  message_on_cake text,
  reference_image_url text,
  description text,
  requested_date date,
  status public.inquiry_status not null default 'submitted',
  quote_cents int,
  staff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index idx_profiles_role on public.profiles (role);
create index idx_menu_items_category on public.menu_items (category_id);
create index idx_menu_items_active on public.menu_items (is_active) where is_active = true;
create index idx_menu_items_sold_out on public.menu_items (is_sold_out);
create index idx_menu_items_sort on public.menu_items (sort_order);
create index idx_categories_active on public.categories (is_active) where is_active = true;
create index idx_categories_sort on public.categories (sort_order);
create index idx_banners_position on public.promo_banners (position);
create index idx_banners_active_dates on public.promo_banners (is_active, start_date, end_date);
create index idx_gallery_active on public.gallery_photos (is_active) where is_active = true;
create index idx_orders_customer on public.orders (customer_id);
create index idx_orders_status on public.orders (status);
create index idx_orders_created on public.orders (created_at desc);
create index idx_orders_slot on public.orders (requested_slot);
create index idx_orders_ack on public.orders (acknowledged_at) where acknowledged_at is null;
create index idx_order_items_order on public.order_items (order_id);
create index idx_inquiries_status on public.custom_cake_inquiries (status);
create index idx_inquiries_created on public.custom_cake_inquiries (created_at desc);
create index idx_inquiries_order on public.custom_cake_inquiries (order_id);

-- ---------- ORDER DAILY SEQUENCE (for human_id SAV-YYMMDD-NNNN) ----------
create sequence public.order_daily_seq
  start with 1
  increment by 1
  maxvalue 9999
  cycle;