-- Manual UPI payments replace Razorpay.
--
-- Customers pay the bakery's own UPI ID from a QR on their order page, send
-- the screenshot on WhatsApp, and staff mark the order paid once the money is
-- in the account. See docs/manual-payments.md for the whole flow and the list
-- of failure cases this is built against.
--
-- Additive except for the three dropped policies in section 3, which were
-- holes: verified before this was written, an insert into orders with the
-- public anon key got past row-level security and failed only on a NOT NULL
-- column. Nothing in the app relies on them — the order API writes with the
-- service role, and no customer-side code updates an order.
--
-- Apply this BEFORE deploying the code that reads these columns.

-- ---------------------------------------------------------------------------
-- 1. Settings
-- ---------------------------------------------------------------------------
alter table public.site_settings
  -- The name a UPI app shows as the payee ("pn"). Blank falls back to the
  -- bakery name.
  add column if not exists upi_payee_name text,
  -- Where payment screenshots go. Blank falls back to whatsapp_number.
  add column if not exists payment_whatsapp_number text,
  -- How long an unpaid order holds its slot before it is flagged overdue.
  add column if not exists payment_window_minutes integer not null default 60,
  -- FSSAI requires food businesses selling online to display this.
  add column if not exists fssai_license_number text,
  -- Consumer Protection (E-Commerce) Rules 2020, rule 4(4): a named grievance
  -- officer. Left null on purpose; the policy pages show a visible gap until
  -- the client supplies a name.
  add column if not exists grievance_officer_name text;

alter table public.site_settings
  drop constraint if exists site_settings_payment_window_range;
alter table public.site_settings
  add constraint site_settings_payment_window_range
  check (payment_window_minutes between 15 and 1440);

update public.site_settings
set razorpay_active = false,
    fssai_license_number = coalesce(nullif(trim(fssai_license_number), ''), '21722002000154')
where id = 1;

-- ---------------------------------------------------------------------------
-- 2. Orders
-- ---------------------------------------------------------------------------
alter table public.orders
  -- Set by the order API at creation: created_at + payment_window_minutes.
  add column if not exists payment_due_at timestamptz,
  -- When the customer said they had paid (tapped "Send screenshot").
  add column if not exists payment_claimed_at timestamptz,
  -- The UPI transaction ID (UTR). Given by the customer, confirmed by staff.
  add column if not exists payment_reference text,
  -- What actually arrived, which is not always total_cents.
  add column if not exists payment_received_cents integer,
  -- Stamped by the trigger below, never by the client.
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verified_by uuid references public.profiles (id) on delete set null,
  -- Internal staff note. Never returned to the customer.
  add column if not exists payment_note text,
  -- Set when cancelling put the order's stock back, so it is done once.
  add column if not exists stock_restored_at timestamptz;

alter table public.orders
  drop constraint if exists orders_payment_received_nonnegative;
alter table public.orders
  add constraint orders_payment_received_nonnegative
  check (payment_received_cents is null or payment_received_cents >= 0);

-- One bank transaction pays for one order. Without this the same screenshot
-- could be sent for two orders and both marked paid.
create unique index if not exists orders_verified_payment_reference_unique
  on public.orders (upper(payment_reference))
  where payment_verified_at is not null and payment_reference is not null;

-- ---------------------------------------------------------------------------
-- 3. Close the direct-write holes
-- ---------------------------------------------------------------------------
-- "customer_id is null" was meant for guest orders created by the service
-- role, but the service role bypasses RLS and never needed it. What it
-- actually allowed was anyone, signed in or not, inserting an order with any
-- total and payment_status = 'paid'.
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "order_items_insert" on public.order_items;

-- Let a signed-in customer update ANY column of their own pending order,
-- including payment_status and total_cents. Unused by the app.
drop policy if exists "orders_update_own" on public.orders;

-- ---------------------------------------------------------------------------
-- 4. Payment integrity for signed-in users (staff and admins)
-- ---------------------------------------------------------------------------
create or replace function public.guard_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The order API and scripts run as the service role, with no signed-in
  -- user. They are trusted here the same way migration 00040 trusts them.
  if auth.uid() is null then
    return new;
  end if;

  -- The QR asks for total_cents, and staff verify against it. If it could be
  -- edited after the fact, the two would stop agreeing.
  if new.total_cents is distinct from old.total_cents then
    raise exception 'The order total cannot be changed after the order is placed.'
      using errcode = '42501';
  end if;

  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    if new.payment_received_cents is null then
      raise exception 'Enter the amount received before marking this order paid.'
        using errcode = '23514';
    end if;
    if new.payment_method = 'upi_manual'
       and nullif(trim(coalesce(new.payment_reference, '')), '') is null then
      raise exception 'Enter the UPI transaction ID (UTR) from your bank or UPI app before marking this order paid.'
        using errcode = '23514';
    end if;
    new.payment_verified_at := now();
    new.payment_verified_by := auth.uid();
  elsif old.payment_status in ('paid', 'refunded')
        and new.payment_status not in ('paid', 'refunded') then
    -- Undoing a verification made by mistake.
    new.payment_verified_at := null;
    new.payment_verified_by := null;
    new.payment_received_cents := null;
  else
    -- The stamps are the database's to write, not the browser's.
    new.payment_verified_at := old.payment_verified_at;
    new.payment_verified_by := old.payment_verified_by;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_order_payment on public.orders;
create trigger guard_order_payment
  before update on public.orders
  for each row execute function public.guard_order_payment();

-- ---------------------------------------------------------------------------
-- 5. Cancelling gives today's stock back
-- ---------------------------------------------------------------------------
-- The order API takes stock when an order is placed, before it is paid. An
-- order that is never paid and gets cancelled would otherwise keep those
-- bakes off the menu for the rest of the day.
--
-- Same IST day only: stock counts are today's counts, set each morning in
-- Admin -> Today's Stock. Cancelling yesterday's order must not add to today.
create or replace function public.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  same_day boolean :=
    (new.created_at at time zone 'Asia/Kolkata')::date
      = (now() at time zone 'Asia/Kolkata')::date;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if same_day and old.stock_restored_at is null then
      update public.menu_items m
      set stock_count = m.stock_count + q.qty
      from (
        select menu_item_id, sum(quantity)::int as qty
        from public.order_items
        where order_id = new.id and menu_item_id is not null
        group by menu_item_id
      ) q
      where m.id = q.menu_item_id and m.stock_count is not null;
      new.stock_restored_at := now();
    end if;
  elsif old.status = 'cancelled' and new.status is distinct from 'cancelled'
        and old.stock_restored_at is not null then
    -- Un-cancelled: take the stock again, if it is still the same day.
    if same_day then
      update public.menu_items m
      set stock_count = greatest(0, m.stock_count - q.qty)
      from (
        select menu_item_id, sum(quantity)::int as qty
        from public.order_items
        where order_id = new.id and menu_item_id is not null
        group by menu_item_id
      ) q
      where m.id = q.menu_item_id and m.stock_count is not null;
    end if;
    new.stock_restored_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists restore_stock_on_cancel on public.orders;
create trigger restore_stock_on_cancel
  before update of status on public.orders
  for each row execute function public.restore_stock_on_cancel();

-- ---------------------------------------------------------------------------
-- 6. The new payment settings are admin-only, like the UPI ID
-- ---------------------------------------------------------------------------
create or replace function public.guard_payment_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.upi_id is distinct from old.upi_id
     or new.upi_payee_name is distinct from old.upi_payee_name
     or new.payment_whatsapp_number is distinct from old.payment_whatsapp_number
     or new.payment_window_minutes is distinct from old.payment_window_minutes
     or new.razorpay_active is distinct from old.razorpay_active
     or new.kyc_pending_mode is distinct from old.kyc_pending_mode then
    raise exception 'Only an admin can change payment settings (UPI ID, payee name, payment WhatsApp number, payment window).'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.guard_payment_settings is
  'Refuses changes to where and how customers pay by any signed-in user who is not an admin.';

-- ---------------------------------------------------------------------------
-- 7. The client's payment details
-- ---------------------------------------------------------------------------
-- Decoded from the Google Pay QR the client sent on 2026-09-29 (pa= and pn=),
-- not retyped from the printed caption, so this is exactly the account her QR
-- pays. Editable afterwards in Admin -> Settings -> Payment (admins only).
-- The payee name is her bank-registered name: UPI apps show that name to the
-- customer whatever "pn" says, so the order page names the same person.
update public.site_settings
set upi_id = 'doretta.blah-googlemail.com@oksbi',
    upi_payee_name = 'Doretta Blah',
    payment_whatsapp_number = '918974077447'
where id = 1;
