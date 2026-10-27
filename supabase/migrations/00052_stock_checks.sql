-- Records each time Today's Stock is saved, so the admin can remind staff
-- when it hasn't been set yet today (2026-10-28).
--
-- An item with no count can be ordered without limit, so a morning where
-- nobody sets the stock is a morning the website can oversell. The Dashboard
-- and Orders pages show a reminder until a save is recorded today, and staff
-- phones get one push 30 minutes after opening (app/api/cron/ack-watchdog).
--
-- The record is written inside set_stock_counts, in the same transaction as
-- the counts themselves, so a save can't succeed without being recorded.

create table if not exists public.stock_checks (
  id bigint generated always as identity primary key,
  saved_at timestamptz not null default now(),
  saved_by uuid default auth.uid() references auth.users (id) on delete set null,
  items_changed int not null default 0
);
create index if not exists idx_stock_checks_saved_at on public.stock_checks (saved_at desc);

alter table public.stock_checks enable row level security;

drop policy if exists "stock_checks_staff_read" on public.stock_checks;
create policy "stock_checks_staff_read" on public.stock_checks
  for select using (public.is_staff());

drop policy if exists "stock_checks_staff_insert" on public.stock_checks;
create policy "stock_checks_staff_insert" on public.stock_checks
  for insert with check (public.is_staff());

-- Same function as 00041, now also recording the save. An empty list is
-- allowed: it confirms that today's counts are right as they stand.
create or replace function public.set_stock_counts(lines jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed integer;
begin
  update public.menu_items m
  set stock_count = case
      when jsonb_typeof(l -> 'stock') = 'null' then null
      else (l ->> 'stock')::integer
    end
  from jsonb_array_elements(lines) as l
  where m.id = (l ->> 'id')::uuid;

  get diagnostics changed = row_count;

  insert into public.stock_checks (items_changed) values (changed);

  return changed;
end;
$$;

comment on function public.set_stock_counts is
  'Sets stock_count on many menu items in one transaction and records the save in stock_checks. Runs as the caller, so RLS applies.';

revoke all on function public.set_stock_counts(jsonb) from public, anon;
grant execute on function public.set_stock_counts(jsonb) to authenticated;
