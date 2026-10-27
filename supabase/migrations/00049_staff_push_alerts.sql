-- Push notifications for staff phones (2026-10-27).
--
-- The Orders page alarm only rings while the page is open and awake. Phones
-- pause a page as soon as the screen locks, so staff on phones heard nothing
-- (found in the client demo). Web Push reaches a locked phone: each device
-- that turns alerts on stores a subscription here, and the server pings them
-- all when an order or custom cake request arrives.
--
-- The push itself carries no data. The phone's service worker asks
-- /api/push/latest what happened, signed in as the staff member, and shows
-- that — so no order details ever pass through a push service.

-- ---------- one row per device with alerts turned on ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  failures int not null default 0
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A staff member manages their own devices; the server (service role) reads
-- them all to send.
drop policy if exists "push_subs_own" on public.push_subscriptions;
create policy "push_subs_own" on public.push_subscriptions
  for all using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());

-- ---------- what the last push was about ----------
create table if not exists public.staff_alerts (
  id bigint generated always as identity primary key,
  kind text not null,          -- 'order' | 'custom_cake' | 'reminder' | 'test'
  title text not null,
  body text not null,
  url text not null default '/admin/orders',
  for_user uuid references auth.users (id) on delete cascade, -- set for a test alert
  created_at timestamptz not null default now()
);
create index if not exists idx_staff_alerts_created on public.staff_alerts (created_at desc);
alter table public.staff_alerts enable row level security;
-- No policies: only the server reads and writes this table.

-- ---------- the server's signing keys (VAPID) ----------
-- Service role only. Generated once and stored here so the setup needs no
-- Cloudflare dashboard step; the public half is served by /api/push/key.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  vapid_public_key text not null,
  vapid_private_jwk jsonb not null,
  contact text not null default 'mailto:savorbydeebakery@gmail.com',
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
-- No policies: only the server can read it.
