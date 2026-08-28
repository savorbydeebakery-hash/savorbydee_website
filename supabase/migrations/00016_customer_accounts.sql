-- ============================================================
-- SAVOR Bakery — 00016_customer_accounts.sql
-- Customer accounts: saved delivery address on profiles.
-- (profiles auto-create trigger, orders.customer_id, and the
--  select/update RLS policies already exist from earlier migrations.)
-- ============================================================

alter table public.profiles
  add column if not exists default_address text;

alter table public.profiles
  add column if not exists default_landmark text;
