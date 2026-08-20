-- ============================================================
-- SAVOR Bakery — 00005_auth_triggers.sql
-- Auto-create profile on signup + realtime publication
-- ============================================================

-- ---------- AUTO-CREATE PROFILE ON SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- REALTIME: publish orders + inquiries ----------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.custom_cake_inquiries;